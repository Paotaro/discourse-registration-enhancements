export function registrationKind(method, url, paths, data) {
  const { userPath, invitePath, codePath } = paths;
  const path = new URL(url, "https://discourse.invalid").pathname;
  if (method === "POST" && (path === userPath || path === `${userPath}.json`)) {
    return "signup";
  }
  if (
    method === "PUT" &&
    path.startsWith(invitePath) &&
    path.endsWith(".json")
  ) {
    return "invites.show";
  }
  if (
    method === "POST" &&
    (path === codePath || path === `${codePath}.json`) &&
    new URLSearchParams(data).has("invite_key")
  ) {
    return "code-invite";
  }
}

export function registrationRoute(kind) {
  return kind === "code-invite" ? "invites.show" : kind;
}

export function submittedFields(data, kind) {
  const root = kind === "invites.show" ? "user_custom_fields" : "user_fields";
  const fields = new Map();
  for (const [key, value] of new URLSearchParams(data)) {
    const match = /^([^[]+)\[(\d+)\](?:\[\])?$/.exec(key);
    if (match?.[1] === root) {
      const id = match[2];
      const values = fields.get(id) || [];
      values.push(value);
      fields.set(id, values);
    }
  }
  return fields;
}

export function unchanged(fields, id, current) {
  const submitted = fields.get(String(id)) || [];
  const values = (
    Array.isArray(current) ? current : current == null ? [] : [current]
  ).map(String);
  // jQuery sends null scalar entries as empty form values.
  if (!values.length && submitted.length === 1 && submitted[0] === "") {
    return true;
  }
  return (
    values.length === submitted.length &&
    values.every((value, index) => value === submitted[index])
  );
}

export function normalizeUncheckedConfirmations(data, kind, fields) {
  if (!Array.isArray(fields)) {
    return data;
  }
  const root = kind === "invites.show" ? "user_custom_fields" : "user_fields";
  const eligible = fields.filter(
    (field) =>
      field.field_type === "confirm" &&
      field.required === false &&
      field.show_on_signup,
  );
  if (typeof data === "string") {
    const params = new URLSearchParams(data);
    let changed = false;
    for (const { id } of eligible) {
      const key = `${root}[${id}]`;
      const values = params.getAll(key);
      if (values.length === 1 && values[0] === "") {
        params.set(key, "false");
        changed = true;
      }
    }
    return changed ? params.toString() : data;
  }

  const values = data?.[root];
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return data;
  }
  const unchecked = eligible.filter(
    ({ id }) =>
      Object.hasOwn(values, id) && (values[id] == null || values[id] === ""),
  );
  if (unchecked.length === 0) {
    return data;
  }
  const normalized = { ...values };
  for (const { id } of unchecked) {
    normalized[id] = false;
  }
  return { ...data, [root]: normalized };
}
