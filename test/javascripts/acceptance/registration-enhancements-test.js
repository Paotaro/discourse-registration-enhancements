import { click, fillIn, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";

const token = "fixture-invite";
const fields = [
  {
    id: 701,
    name: "Fixture Question",
    description: "Question description",
    field_type: "textarea",
    required: true,
  },
  {
    id: 702,
    name: "Fixture Rules",
    description: "Read [guidelines](https://example.test/rules)\n---\nI agree",
    field_type: "confirm",
    required: true,
  },
  {
    id: 703,
    name: "Fixture Consent",
    description: "Optional consent",
    field_type: "confirm",
    required: false,
  },
].map((field, position) => ({ ...field, position, show_on_signup: true }));

for (const plugin of [false, true]) {
  acceptance(
    `Registration enhancements (${plugin ? "compatibility metadata" : "standalone"})`,
    function (needs) {
      needs.settings({
        enable_local_logins: true,
        enable_local_logins_via_code: false,
      });
      needs.site({
        user_fields: fields,
        ...(plugin ? { shevka_conditional_signup_fields: [] } : {}),
      });
      needs.pretender((server, helper) => {
        server.get(`/invites/${token}`, () =>
          helper.response({
            is_invite_link: true,
            username: "fixture_visitor",
          }),
        );
      });
      for (const invite of [false, true]) {
        test(`renders fields and rule links during ${invite ? "invite" : "signup"}`, async function (assert) {
          await visit(invite ? `/invites/${token}` : "/signup");
          const link = ".dre-registration-description a";
          assert.dom(link).hasAttribute("href", "https://example.test/rules");
          assert.dom(link).hasAttribute("target", "_blank");
          assert.dom(link).hasAttribute("rel", "noopener noreferrer");
          assert.dom(".checkbox-label a").doesNotExist();
          assert.dom(".dre-registration-error span").doesNotExist();
          const textarea = ".dre-registration-field textarea";
          await fillIn(textarea, "中😀");
          assert.dom(".dre-registration-counter").hasTextContaining("3");
          await click(".user-field-fixture-rules .checkbox-label");
          assert.dom(".user-field-fixture-rules input").isChecked();
          assert.dom(".user-field-fixture-consent input").isNotChecked();
          assert.dom(textarea).hasValue("中😀");
        });
      }
    },
  );
}
