import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmationPresentation,
  supportsValidationPlugin,
} from "../javascripts/discourse/lib/registration-config.js";
import {
  descriptionParts,
  escapeDescription,
  httpsUrl,
} from "../javascripts/discourse/lib/registration-description.js";
import {
  counter,
  feedback,
  serverFeedback,
} from "../javascripts/discourse/lib/registration-feedback.js";
import {
  normalizeUncheckedConfirmations,
  registrationKind,
  registrationRoute,
  submittedFields,
  unchanged,
} from "../javascripts/discourse/lib/registration-response.js";

const field = {
  field_type: "confirm",
  id: 23,
  required: true,
  description: "Read [Old](https://example.test/old)\n---\nAgree",
};
const config = {
  enable_rules: true,
  enable_legacy_rule_descriptions: true,
  rules_confirmation_field_id: 0,
};
const t = (key, params) => [key, params];

test("configured links preserve arbitrary row count and order, independent of labels", () => {
  const rules_links = Array.from({ length: 34 }, (_, i) => ({
    label: `Rule ${i}`,
    url: `https://example.test/${i}`,
  }));
  rules_links.splice(3, 0, { label: "Unsafe", url: "javascript:bad" });
  const result = confirmationPresentation(field, {
    ...config,
    rules_confirmation_field_id: "23",
    rules_intro: "Read these files",
    rules_confirmation_text: "I agree",
    rules_links,
  });
  assert.deepEqual(result.parts, [{ text: "Read these files" }]);
  assert.equal(result.label, "I agree");
  assert.deepEqual(
    result.links.map(({ text }) => text),
    Array.from({ length: 34 }, (_, i) => `Rule ${i}`),
  );
  assert.equal(field.required, true);
  assert.equal(
    confirmationPresentation(
      { ...field, id: 24 },
      { ...config, rules_confirmation_field_id: 23 },
    ).links.length,
    0,
  );
});

test("legacy descriptions and independent toggles preserve existing checkbox text", () => {
  const legacy = confirmationPresentation(field, config);
  assert.equal(legacy.label, "Agree");
  assert.equal(
    legacy.parts.find(({ href }) => href).href,
    "https://example.test/old",
  );
  const inline = confirmationPresentation(
    { ...field, description: "Read [Old](https://example.test/old)" },
    config,
  );
  assert.equal(inline.label, "Read Old");
  for (const option of ["enable_rules", "enable_legacy_rule_descriptions"]) {
    assert.deepEqual(
      confirmationPresentation(field, { ...config, [option]: false }),
      { label: field.description, parts: [], links: [] },
    );
  }
});

test("renders only valid HTTPS anchor URLs and escapes native labels", () => {
  for (const url of [
    "javascript:bad",
    "JaVa%73cript:bad",
    "data:text/html,bad",
    "file:///bad",
    "vbscript:bad",
    "//example.test",
    "https:///example.test",
    "https://u@example.test",
    "https://example.test/\u0000",
    "https://example.test/\u202e",
    "https://example.test\\bad",
  ]) {
    assert.equal(httpsUrl(url), undefined, url);
    assert.deepEqual(descriptionParts(`[x](${url})`), [
      { text: `[x](${url})` },
    ]);
  }
  assert.equal(httpsUrl("HTTPS://example.test/a"), "https://example.test/a");
  assert.deepEqual(descriptionParts("![x](https://example.test/x)"), [
    { text: "![x](https://example.test/x)" },
  ]);
  assert.deepEqual(descriptionParts("<script>bad</script>"), [
    { text: "<script>bad</script>" },
  ]);
  assert.equal(
    escapeDescription("<img src=x> &lt;"),
    "&lt;img src=x&gt; &amp;lt;",
  );
});

test("standalone feedback is advisory and counts UTF-16 without plugin metadata", () => {
  assert.equal(supportsValidationPlugin({}, true), false);
  assert.equal(
    supportsValidationPlugin({ shevka_conditional_signup_fields: [] }, true),
    true,
  );
  assert.equal(
    supportsValidationPlugin({ shevka_conditional_signup_fields: [] }, false),
    false,
  );
  assert.deepEqual(counter("中😀", null, t), ["counter", { length: 3 }]);
  assert.deepEqual(feedback(field, false, false, null, t), [
    "required_confirmation",
    undefined,
  ]);
  assert.equal(
    feedback({ ...field, required: false }, false, false, null, t),
    undefined,
  );
});

test("plugin length, conditions and localized errors preserve baseline behavior", () => {
  const bounds = { min: 3, max: null };
  assert.deepEqual(counter("中😀", bounds, t), [
    "minimum_counter",
    { length: 3, min: 3 },
  ]);
  assert.deepEqual(feedback(field, "中", false, bounds, t), [
    "length_min",
    bounds,
  ]);
  assert.equal(feedback(field, "中😀\n", false, bounds, t), undefined);
  assert.equal(feedback(field, false, true, bounds, t), undefined);
  assert.deepEqual(serverFeedback(field, "incorrect", t), [
    "incorrect",
    undefined,
  ]);
});

test("recognizes supported submit routes and suppresses stale field responses", () => {
  const paths = {
    userPath: "/forum/u",
    invitePath: "/forum/invites/show/",
    codePath: "/forum/session/login-code/verify",
  };
  assert.equal(registrationKind("POST", paths.userPath, paths, ""), "signup");
  assert.equal(
    registrationKind("PUT", paths.invitePath + "fixture.json", paths, ""),
    "invites.show",
  );
  assert.equal(
    registrationRoute(
      registrationKind("POST", paths.codePath, paths, "invite_key=fake"),
    ),
    "invites.show",
  );
  assert.equal(registrationKind("POST", paths.codePath, paths, ""), undefined);
  const values = submittedFields(
    "user_custom_fields%5B7%5D=before",
    "invites.show",
  );
  assert.equal(unchanged(values, 7, "before"), true);
  assert.equal(unchanged(values, 7, "after"), false);
});

test("normalizes only unchecked optional registration confirmations for the plugin", () => {
  const fields = [
    { id: 4, field_type: "confirm", required: false, show_on_signup: true },
    { id: 5, field_type: "confirm", required: true, show_on_signup: true },
    { id: 6, field_type: "text", required: false, show_on_signup: true },
    { id: 7, field_type: "confirm", required: false, show_on_signup: false },
  ];
  for (const [kind, root] of [
    ["signup", "user_fields"],
    ["invites.show", "user_custom_fields"],
    ["code-invite", "user_fields"],
  ]) {
    const data = new URLSearchParams();
    for (const field of fields) {
      data.set(`${root}[${field.id}]`, "");
    }
    data.append("extra[]", "one");
    data.append("extra[]", "two");
    const result = new URLSearchParams(
      normalizeUncheckedConfirmations(data.toString(), kind, fields),
    );
    assert.equal(result.get(`${root}[4]`), "false");
    for (const id of [5, 6, 7]) {
      assert.equal(result.get(`${root}[${id}]`), "");
    }
    assert.deepEqual(result.getAll("extra[]"), ["one", "two"]);
    const objectData = {
      [root]: { 4: null, 5: null, 6: "", 7: null, 9: true },
      extra: ["one", "two"],
    };
    assert.deepEqual(
      normalizeUncheckedConfirmations(objectData, kind, fields),
      {
        ...objectData,
        [root]: { ...objectData[root], 4: false },
      },
    );
    assert.equal(objectData[root][4], null);
    data.set(`${root}[4]`, "true");
    assert.equal(
      normalizeUncheckedConfirmations(data.toString(), kind, fields),
      data.toString(),
    );
  }
});

test("a mismatched positive field ID falls back to the native description", () => {
  const configured = {
    ...config,
    enable_legacy_rule_descriptions: false,
    rules_confirmation_field_id: String(field.id + 1),
    rules_intro: "Read this first",
    rules_confirmation_text: "I agree",
    rules_links: [{ label: "Rules", url: "https://example.test/rules" }],
  };
  for (const description of [field.description, "Native plain text"]) {
    assert.deepEqual(confirmationPresentation({ ...field, description }, configured), {
      label: description,
      parts: [],
      links: [],
    });
  }
  assert.deepEqual(
    confirmationPresentation(field, {
      ...configured,
      rules_confirmation_field_id: String(field.id),
    }),
    {
      label: "I agree",
      parts: [{ text: "Read this first" }],
      links: [{ text: "Rules", href: "https://example.test/rules" }],
      rules: true,
    },
  );
});
