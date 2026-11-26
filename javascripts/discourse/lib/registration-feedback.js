export function isMissing(value) {
  return (
    value == null ||
    value === false ||
    value === "false" ||
    (typeof value === "string" && /^\p{White_Space}*$/u.test(value)) ||
    (Array.isArray(value) && !value.length)
  );
}

export function feedback(field, value, conditional, bounds, translate) {
  if (conditional) {
    return;
  }
  if (isMissing(value)) {
    if (!field.required) {
      return;
    }
    if (field.field_type === "confirm") {
      return translate("required_confirmation");
    }
    if (["dropdown", "multiselect"].includes(field.field_type)) {
      return translate("required_choice");
    }
    return translate("required_field");
  }
  if (bounds && typeof value === "string") {
    if (bounds.single_line && /[\r\n\u2028\u2029]/.test(value)) {
      return translate("single_line");
    }
    if (
      value.length < bounds.min ||
      (bounds.max != null && value.length > bounds.max)
    ) {
      const key =
        bounds.min === bounds.max
          ? "length_exact"
          : bounds.max == null
            ? "length_min"
            : "length_range";
      return translate(key, bounds);
    }
  }
}

export function counter(value, bounds, translate) {
  const length = typeof value === "string" ? value.length : 0;
  if (bounds?.min > 0 && bounds.max == null) {
    return translate("minimum_counter", { length, min: bounds.min });
  }
  if (bounds?.max != null) {
    const key = bounds.min === bounds.max ? "exact_counter" : "range_counter";
    return translate(key, { length, min: bounds.min, max: bounds.max });
  }
  return translate("counter", { length });
}

export function serverFeedback(field, code, translate) {
  switch (code) {
    case "required":
      return feedback(
        { field_type: field.field_type, required: true },
        null,
        false,
        null,
        translate,
      );
    case "too_long":
    case "invalid":
    case "configuration":
    case "incorrect":
      return translate(code);
  }
}
