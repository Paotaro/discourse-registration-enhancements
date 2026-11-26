import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const commit = "379e802dae213f2d6b293f4b74bbb6612528cbb0";
const [checkout, nodeModules, treePath] = process.argv
  .slice(2)
  .map((path) => resolve(path));
assert.ok(
  checkout && nodeModules,
  "Usage: node module-compatibility.mjs <core checkout or snapshot> <build node_modules> [GitHub tree JSON]",
);
let blobs;
if (treePath) {
  const tree = JSON.parse(readFileSync(treePath, "utf8"));
  assert.equal(tree.sha, commit);
  blobs = new Map(tree.tree.map(({ path, sha }) => [path, sha]));
} else {
  assert.equal(
    execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    commit,
  );
}
const workspace = mkdtempSync(join(tmpdir(), "discourse-registration-module-check-"));
const readCore = (path) => {
  const contents = readFileSync(join(checkout, path));
  const hash = createHash("sha1")
    .update(`blob ${contents.length}\0`)
    .update(contents)
    .digest("hex");
  const expected =
    blobs?.get(path) ??
    execFileSync("git", ["-C", checkout, "rev-parse", `${commit}:${path}`], {
      encoding: "utf8",
    }).trim();
  assert.equal(hash, expected, path);
  return contents.toString("utf8");
};
symlinkSync(nodeModules, join(workspace, "node_modules"));

const processor = "frontend/asset-processor";
const files = [processor, processor + "/rollup-plugins"].flatMap((dir) =>
  readdirSync(join(checkout, dir))
    .filter((file) => file.endsWith(".js"))
    .map((file) => join(dir, file)),
);
files.push(
  "frontend/discourse/config/targets.js",
  "frontend/discourse/lib/babel-transform-module-renames.js",
  "frontend/discourse/lib/discourse-source-imports.mjs",
);

for (const file of files) {
  const target = join(workspace, file);
  mkdirSync(dirname(target), { recursive: true });
  let source = readCore(file);
  if (file.endsWith("/content-tag.js")) {
    source = 'export { Preprocessor } from "content-tag";\n';
  }
  if (file.endsWith("/asset-processor-rollup.js")) {
    // Use the browser compilation plugin and explicit Node subpaths in this host.
    source = source
      .replace(
        '"babel-plugin-ember-template-compilation"',
        '"babel-plugin-ember-template-compilation/browser"',
      )
      .replace(
        'ember-cli-htmlbars/lib/colocated-babel-plugin"',
        'ember-cli-htmlbars/lib/colocated-babel-plugin.js"',
      )
      .replace(
        'strip-test-selectors/src/strip-test-selectors"',
        'strip-test-selectors/src/strip-test-selectors.js"',
      );
  }
  writeFileSync(target, source);
}

const wasm = readFileSync(
  join(nodeModules, "@rollup/browser/dist/bindings_wasm_bg.wasm"),
);
const fetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  assert.match(String(url), /bindings_wasm_bg\.wasm$/);
  return new Response(wasm, {
    headers: { "Content-Type": "application/wasm" },
  });
};
await import(
  pathToFileURL(join(workspace, processor, "asset-processor-rollup.js"))
);

const app = "frontend/discourse/app/";
const testRoot = "frontend/discourse/tests/";
const shims = (source) =>
  [...source.matchAll(/loaderShim\(\s*"([^"]+)"/g)].map((match) => match[1]);
const appModules = new Set(shims(readCore(app + "loader-shims.js")));
const testModules = new Set([
  ...appModules,
  ...shims(readCore(testRoot + "loader-shims.js")),
]);
assert.match(
  readCore(app + "app.js"),
  /defineModules\(null, embroiderCompatModules\)/,
);
assert.match(
  readCore(testRoot + "loader-shims.js"),
  /defineModules\("discourse\/tests", compatModules\)/,
);
for (const name of ["api", "get-url", "theme-settings-store"]) {
  const path = ["js", "ts", "gjs"]
    .map((ext) => `${app}lib/${name}.${ext}`)
    .find((candidate) =>
      readdirSync(join(checkout, app, "lib")).includes(
        candidate.split("/").at(-1),
      ),
    );
  assert.ok(path, name);
  const exports = {
    api: /export function apiInitializer/,
    "get-url": /export default/,
    "theme-settings-store": /export function getObjectForTheme/,
  };
  assert.match(readCore(path), exports[name]);
  appModules.add(`discourse/lib/${name}`);
  testModules.add(`discourse/lib/${name}`);
}
readCore(testRoot + "helpers/qunit-helpers.js");
testModules.add("discourse/tests/helpers/qunit-helpers");

const release = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compilerLookups = async (source, test) => {
  const directory = join(source, test ? "test/javascripts" : "javascripts");
  const files = Object.fromEntries(
    readdirSync(directory, { recursive: true })
      .filter((file) => /\.g?js$/.test(file))
      .map((file) => [file, readFileSync(join(directory, file), "utf8")]),
  );
  const bundles = await globalThis.rollup(files, {
    themeId: 2,
    minify: !test,
    entrypoints: { [test ? "test" : "main"]: { modules: Object.keys(files) } },
  });
  const calls = Object.values(bundles).flatMap(({ code }) => {
    const matches = [
      ...code.matchAll(
        /window\.moduleBroker\.lookup\(\s*"([^"]+)",\s*(?:false|!1),\s*(\[[^\]]+\])\)/g,
      ),
    ];
    assert.equal(
      matches.length,
      [...code.matchAll(/window\.moduleBroker\.lookup\(/g)].length,
    );
    return matches.map(([, name, exports]) => [name, JSON.parse(exports)]);
  });
  assert.ok(calls.length, "Expected generated broker lookups");
  return new Map(calls.sort(([a], [b]) => a.localeCompare(b)));
};

try {
  const after = await compilerLookups(release, false);
  const acceptance = await compilerLookups(release, true);
  assert.ok(after.has("discourse-i18n"), "Expected theme translations");
  assert.ok(after.has("discourse/lib/api"), "Expected theme initializer");
  for (const [lookups, available] of [
    [after, appModules],
    [acceptance, testModules],
  ]) {
    assert.deepEqual(
      [...lookups.keys()].filter((name) => !available.has(name)),
      [],
    );
  }
  console.log(
    "Application lookups:",
    JSON.stringify(Object.fromEntries(after), null, 2),
  );
  console.log(
    "Test lookups:",
    JSON.stringify(Object.fromEntries(acceptance), null, 2),
  );
} finally {
  globalThis.fetch = fetch;
}
