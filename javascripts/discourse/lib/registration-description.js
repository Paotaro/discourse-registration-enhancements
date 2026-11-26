// Keep all description segments as text. Only validated URLs become attributes.
export function httpsUrl(candidate) {
  if (
    typeof candidate !== "string" ||
    !/^https:\/\/[^/?#]/i.test(candidate) ||
    /[\s\p{Cc}\p{Cf}\\]/u.test(candidate)
  ) {
    return;
  }
  try {
    const url = new URL(candidate);
    if (
      url.protocol === "https:" &&
      url.hostname &&
      !url.username &&
      !url.password
    ) {
      return url.href;
    }
  } catch {
    // Invalid URLs remain plain text in descriptions.
  }
}

export function descriptionParts(description = "") {
  const parts = [];
  const links = /(!?)\[([^\[\]\r\n]+)\]\(([^()\r\n]+)\)/g;
  let cursor = 0;

  for (const match of description.matchAll(links)) {
    const [, image, label, candidate] = match;
    const href = image ? undefined : httpsUrl(candidate);
    if (!href) {
      continue;
    }
    parts.push({ text: description.slice(cursor, match.index) });
    parts.push({ text: label, href });
    cursor = match.index + match[0].length;
  }

  parts.push({ text: description.slice(cursor) });
  return parts;
}

export function confirmationDescription(description = "") {
  const separator = /^---[ \t]*\r?$/m.exec(description);
  if (separator) {
    return {
      introduction: description.slice(0, separator.index).trim(),
      label: description.slice(separator.index + separator[0].length).trim(),
    };
  }

  const parts = descriptionParts(description);
  return {
    introduction: parts
      .filter((part) => part.href)
      .map((part) => `[${part.text}](${part.href})`)
      .join("\n"),
    label: parts.map((part) => part.text).join(""),
  };
}

export function escapeDescription(text) {
  // The pinned native components render this property as HTML.
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
