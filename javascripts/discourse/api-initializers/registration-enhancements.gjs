import { tracked } from "@glimmer/tracking";
import { run } from "@ember/runloop";
import Component from "@glimmer/component";
import { on } from "@ember/modifier";
import { modifier } from "ember-modifier";
import $ from "jquery";
import { apiInitializer } from "discourse/lib/api";
import getURL from "discourse/lib/get-url";
import { i18n } from "discourse-i18n";
import { counter, feedback, isMissing, serverFeedback } from "../lib/registration-feedback";
import { normalizeUncheckedConfirmations, registrationKind, registrationRoute, submittedFields, unchanged } from "../lib/registration-response";

import { descriptionParts, escapeDescription } from "../lib/registration-description";

import { confirmationPresentation, supportsValidationPlugin } from "../lib/registration-config";

const translate = (key, data) => i18n(themePrefix(key), data);
const brandEnabled = () => settings.enable_branding &&
  Boolean(settings.brand_name || settings.welcome_message || settings.brand_subtitle);

let submitEvents;
let nextFieldId = 0;

const registrationScope = ".signup-fullpage, .invites-show";
const submitButtons = ".signup-page-cta__signup, .invitation-cta__accept, .code-login-form__verify, .code-login-form__submit-approval";
const fieldControls = ".user-field input:not([type=hidden]), .user-field textarea, .user-field select, .user-field .select-kit-header";

const describeControl = modifier((element, [descriptionId, errorId, invalid]) => {
  const control = element.querySelector(fieldControls);
  if (!control) {
    return;
  }
  const previous = control.getAttribute("aria-describedby");
  const previousInvalid = control.getAttribute("aria-invalid");
  control.setAttribute("aria-describedby", [previous, descriptionId, errorId].filter(Boolean).join(" "));
  if (invalid) {
    control.setAttribute("aria-invalid", "true");
  }
  return () => {
    for (const [attribute, value] of [["aria-describedby", previous], ["aria-invalid", previousInvalid]]) {
      if (value === null) {
        control.removeAttribute(attribute);
      } else {
        control.setAttribute(attribute, value);
      }
    }
  };
});

const accountHeadings = new WeakMap();
const accountHeading = modifier((element) => {
  const scope = element.closest(registrationScope);
  if (!scope) {
    return;
  }
  const inviteBrand = brandEnabled() && scope.matches(".invites-show") &&
    !element.closest(".code-login-form");
  if (!settings.enable_sections && !inviteBrand) {
    return;
  }
  const form = element.closest(
    "form, .code-login-form__account-details-step, .code-login-form__user-fields-step"
  );
  const first = form?.querySelector(
    ".code-login-form__account-fields, .input-group:not(.user-fields .input-group)"
  );
  if (!first) {
    return;
  }
  let entry = accountHeadings.get(form);
  if (!entry) {
    const doc = element.ownerDocument;
    const nodes = [];
    if (inviteBrand) {
      const brand = doc.createElement("div");
      brand.className = "dre-brand";
      for (const [key, className] of [
        ["brand_name", "dre-brand-name"],
        ["welcome_message", "dre-brand-welcome"],
        ["brand_subtitle", "dre-brand-subtitle"],
      ]) {
        if (settings[key]) {
          const text = doc.createElement("p");
          text.className = className;
          text.textContent = settings[key];
          brand.append(text);
        }
      }
      nodes.push(brand);
    }
    if (settings.enable_sections) {
      const heading = doc.createElement("h2");
      heading.className = "dre-account-heading";
      heading.textContent = settings.account_section_title || translate("account_section");
      nodes.push(heading);
    }
    first.before(...nodes);
    entry = { nodes, fields: 0 };
    accountHeadings.set(form, entry);
  }
  entry.fields += 1;
  return () => {
    entry.fields -= 1;
    if (entry.fields === 0) {
      entry.nodes.forEach((node) => node.remove());
      accountHeadings.delete(form);
    }
  };
});

function withRegistrationFeedback(NativeField, state) {
  const checked = () => state.checked;

  return class RegistrationField extends Component {
    @tracked touched = false;
    fieldId = `dre-registration-field-${++nextFieldId}`;

    get active() {
      return ["signup", "invites.show"].includes(state.router.currentRouteName);
    }

    get confirmation() {
      return this.args.field.field_type === "confirm";
    }

    get presentation() {
      return confirmationPresentation(this.args.field, settings);
    }

    get nativeField() {
      const original = this.args.field;
      const label = this.confirmation ? this.presentation.label || original.name || "" : "";
      return {
        ...original,
        description: escapeDescription(label),
        get element() { return original.element; },
        set element(value) { original.element = value; },
      };
    }

    get duplicateTitle() {
      const name = this.args.field.name?.trim();
      const label = (this.presentation.label || name || "").trim();
      return this.confirmation && this.args.field.required && name &&
        (name === label || name === this.sectionTitle?.trim());
    }

    get parts() {
      if (this.confirmation) {
        return this.presentation.parts;
      }
      return settings.show_field_descriptions
        ? descriptionParts(this.args.field.description ?? "")
        : [];
    }

    get textEntry() {
      return settings.fixed_field_titles && ["text", "textarea"].includes(this.args.field.field_type);
    }

    get characterCount() {
      return settings.enable_character_count && this.args.field.field_type === "textarea"
        ? counter(this.args.value, state.bounds(this.args.field), translate)
        : null;
    }

    get sectionTitle() {
      if (settings.enable_sections) {
        return this.confirmation
          ? settings.rules_section_title || translate("rules_section")
          : settings.questions_section_title || translate("questions_section");
      }
    }

    get progressive() {
      return settings.enable_progressive_errors;
    }

    get conditionalText() {
      return translate("conditional");
    }

    get checkText() {
      return translate("check");
    }

    get reviewText() {
      return translate("review");
    }

    get conditional() {
      return state.conditional(this.args.field);
    }

    get descriptionId() {
      return `${this.fieldId}-description`;
    }

    get errorId() {
      return `${this.fieldId}-error`;
    }

    get showErrors() {
      return !this.progressive || this.touched || state.checked;
    }

    get message() {
      return state.errorFor(this.args.field, this.args.value, this.progressive && this.showErrors);
    }

    get retryMessage() {
      return state.retryMessage;
    }

    leaveField = (event) => {
      if (event.target.closest(fieldControls) && !event.currentTarget.contains(event.relatedTarget)) {
        this.touched = true;
      }
    };

    check = () => {
      state.checked = true;
    };

    <template>
      {{#if this.active}}
        <div
          class="dre-registration-field {{if this.confirmation 'dre-confirm' 'dre-question'}} {{if this.textEntry 'dre-text-entry'}} {{if this.showErrors 'dre-show-errors'}} {{if this.message 'dre-has-error'}} {{if this.duplicateTitle 'dre-duplicate-title'}}"
          {{on "focusout" this.leaveField}}
          {{describeControl this.descriptionId this.errorId this.message}}
          {{accountHeading}}
        >
          {{#if this.sectionTitle}}
            <h2 class="dre-section-heading">{{this.sectionTitle}}</h2>
          {{/if}}
          <div class="dre-registration-description" id={{this.descriptionId}}>
            {{~#if this.parts.length~}}
              <div class="dre-description-text">
                {{~#each this.parts as |part|~}}
                  {{~#if part.href~}}
                    <a href={{part.href}} target="_blank" rel="noopener noreferrer">{{part.text}}</a>
                  {{~else~}}
                    {{~part.text~}}
                  {{~/if~}}
                {{~/each~}}
              </div>
            {{~/if~}}
            {{#if this.presentation.links.length}}
              <ul class="dre-rule-links">
                {{#each this.presentation.links as |link|}}
                  <li><a href={{link.href}} target="_blank" rel="noopener noreferrer">{{link.text}}</a></li>
                {{/each}}
              </ul>
            {{/if}}
          </div>
          <NativeField ...attributes @field={{this.nativeField}} @value={{@value}} @validation={{@validation}} />
          {{#if this.conditional}}
            <div class="dre-registration-counter">{{this.conditionalText}}</div>
          {{/if}}
          {{#if this.characterCount}}
            <div class="dre-registration-counter">{{this.characterCount}}</div>
          {{/if}}
          <div class="dre-registration-error" id={{this.errorId}} aria-live="polite">
            {{#if this.message}}<span>{{this.message}}</span>{{/if}}
          </div>
          {{#if this.retryMessage}}
            <div class="dre-registration-retry" role="status">{{this.retryMessage}}</div>
          {{/if}}
          {{#if this.progressive}}
            <div class="dre-check">
              <button class="btn btn-flat" type="button" {{on "click" this.check}}>{{this.checkText}}</button>
              {{#if (checked)}}
                <p role="status">{{this.reviewText}}</p>
              {{/if}}
            </div>
          {{/if}}
        </div>
      {{else}}
        <NativeField ...attributes @field={{@field}} @value={{@value}} @validation={{@validation}} />
      {{/if}}
    </template>
  };
}

class RegistrationState {
  @tracked attempt = null;
  @tracked checked = false;

  constructor(router, site) {
    this.router = router;
    this.site = site;
    this.plugin = supportsValidationPlugin(site, settings.enable_validation_plugin_integration);
  }

  conditional(field) {
    return this.plugin && this.site.shevka_conditional_signup_fields.includes(field.id);
  }

  bounds(field) {
    return this.plugin ? field.shevka_registration_length : undefined;
  }

  errorFor(field, value, showErrors) {
    const attempt = this.attempt;
    if (attempt?.route === this.router.currentRouteName && unchanged(attempt.fields, field.id, value)) {
      const message = serverFeedback(field, attempt.errors?.[field.id], translate);
      if (message) {
        return message;
      }
    }
    return showErrors ? feedback(field, value, this.conditional(field), this.bounds(field), translate) : undefined;
  }

  get retryMessage() {
    const attempt = this.attempt;
    if (attempt?.route === this.router.currentRouteName && attempt.rateLimited) {
      return attempt.seconds > 0
        ? translate("retry_seconds", { seconds: attempt.seconds })
        : translate("retry");
    }
  }
}

export default apiInitializer((api) => {
  const router = api.container.lookup("service:router");
  const site = api.container.lookup("service:site");
  const state = new RegistrationState(router, site);
  const accountMarker = <template><span hidden {{accountHeading}}></span></template>;
  if (settings.enable_sections) {
    api.renderInOutlet("create-account-after-email", accountMarker);
  }
  if (settings.enable_sections || brandEnabled()) {
    api.renderAfterWrapperOutlet("invite-username-input", accountMarker);
  }
  if (brandEnabled()) {
    const brandName = () => settings.brand_name;
    const welcome = () => settings.welcome_message;
    const subtitle = () => settings.brand_subtitle;
    const registrationContext = (context) => ["signup", "invite"].includes(context);
    api.renderBeforeWrapperOutlet("signup-heading", <template>
      {{#if (registrationContext @outletArgs.context)}}
        <div class="dre-brand dre-brand-outlet">
          {{#if (brandName)}}<p class="dre-brand-name">{{brandName}}</p>{{/if}}
          {{#if (welcome)}}<p class="dre-brand-welcome">{{welcome}}</p>{{/if}}
          {{#if (subtitle)}}<p class="dre-brand-subtitle">{{subtitle}}</p>{{/if}}
        </div>
      {{/if}}
    </template>);
  }

  const checkOnSubmit = (event) => {
    const target = event.target;
    if (!target?.closest?.(registrationScope)) {
      return;
    }
    if (event.type === "submit" || (event.type === "click" && target.closest(submitButtons)) ||
        (event.key === "Enter" && !event.isComposing && target.matches("input:not([type=checkbox], [type=radio])") && target.closest("form"))) {
      run(() => (state.checked = true));
    }
  };
  submitEvents?.abort();
  if (settings.enable_progressive_errors) {
    submitEvents = new AbortController();
    for (const event of ["submit", "click", "keydown"]) {
      document.addEventListener(event, checkOnSubmit, {
        capture: true,
        signal: submitEvents.signal,
      });
    }
  }

  const paths = {
    userPath: getURL("/u"),
    invitePath: getURL("/invites/show/"),
    codePath: getURL("/session/login-code/verify"),
  };
  const pending = new WeakMap();
  let latest;

  // These pinned core entry points use the same jQuery transport. Observe only
  // their submit responses, leaving core to handle navigation and form state.
  if (state.plugin) {
    // The compatibility plugin recognizes an explicit false as an unanswered
    // confirmation. jQuery otherwise serializes untouched native values as empty.
    $.ajaxPrefilter((request) => {
      if (!["signup", "invites.show"].includes(router.currentRouteName)) {
        return;
      }
      const kind = registrationKind(request.type, request.url, paths, request.data);
      if (kind && registrationRoute(kind) === router.currentRouteName) {
        request.data = normalizeUncheckedConfirmations(
          request.data,
          kind,
          site.get("user_fields"),
        );
      }
    });

    $(document)
      .off(".registrationEnhancements")
      .on("ajaxSend.registrationEnhancements", (_event, xhr, request) => {
        const kind = registrationKind(request.type, request.url, paths, request.data);
        const route = registrationRoute(kind);
        if (kind && route === router.currentRouteName) {
          latest = xhr;
          pending.set(xhr, { route, fields: submittedFields(request.data, kind) });
          run(() => {
            state.attempt = null;
            state.checked = true;
          });
        }
      })
      .on("ajaxComplete.registrationEnhancements", (_event, xhr) => {
        const attempt = pending.get(xhr);
        if (attempt && latest === xhr && attempt.route === router.currentRouteName) {
          run(() => {
            const errors = xhr.responseJSON?.shevka_field_errors;
            if (errors || xhr.status === 429) {
              state.attempt = {
                ...attempt,
                errors,
                rateLimited: xhr.status === 429,
                seconds: Number(xhr.getResponseHeader("Retry-After")),
              };
            }
            pending.delete(xhr);
            latest = null;
          });
        }
      });
  }

  router.on("routeWillChange", ({ from, to }) => {
    if (from?.name !== to?.name || from?.params?.token !== to?.params?.token) {
      latest = null;
      state.attempt = null;
      state.checked = false;
    }
  });

  if (state.plugin) {
    api.addCustomUserFieldValidationCallback(({ field, value }) => {
      if (state.conditional(field) && isMissing(value)) {
        return { ok: true };
      }
      const reason = feedback(field, value, state.conditional(field), state.bounds(field), translate);
      if (reason) {
        return { failed: true, ok: false, reason, element: field.element };
      }
    });
  }

  if (!(state.plugin || settings.enable_sections || settings.fixed_field_titles ||
    settings.show_field_descriptions || settings.enable_character_count ||
    settings.enable_progressive_errors || settings.enable_rules)) {
    return;
  }

  const wrappers = new WeakMap();
  api.registerValueTransformer("user-field-components", ({ value }) =>
    Object.fromEntries(
      Object.entries(value).map(([type, NativeField]) => {
        if (!wrappers.has(NativeField)) {
          wrappers.set(NativeField, withRegistrationFeedback(NativeField, state));
        }
        return [type, wrappers.get(NativeField)];
      })
    )
  );
});
