import {
  confirmationDescription,
  descriptionParts,
  httpsUrl,
} from "./registration-description.js";

export function confirmationPresentation(field, config) {
  const description = field.description ?? "";
  const id = Number(config.rules_confirmation_field_id);
  if (!config.enable_rules || field.field_type !== "confirm") {
    return { label: description, parts: [], links: [] };
  }
  if (Number.isSafeInteger(id) && id > 0) {
    if (id !== Number(field.id)) {
      return { label: description, parts: [], links: [] };
    }
    const links = [];
    for (const row of config.rules_links ?? []) {
      const label = row?.label?.trim();
      const href = httpsUrl(row?.url);
      if (label && href) {
        links.push({ text: label, href });
      }
    }
    const parts = config.rules_intro ? [{ text: config.rules_intro }] : [];
    return {
      label: config.rules_confirmation_text || description,
      parts,
      links,
      rules: true,
    };
  }
  if (config.enable_legacy_rule_descriptions) {
    const legacy = confirmationDescription(description);
    if (legacy.introduction) {
      return {
        label: legacy.label,
        parts: descriptionParts(legacy.introduction),
        links: [],
        rules: true,
      };
    }
  }
  return { label: description, parts: [], links: [] };
}

export function supportsValidationPlugin(site, enabled) {
  return enabled && Array.isArray(site.shevka_conditional_signup_fields);
}
