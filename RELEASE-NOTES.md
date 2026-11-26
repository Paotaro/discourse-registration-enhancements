# Discourse Registration Enhancements v2.0.0

First stable release. Customize the registration layout, organize native fields, and show ordered HTTPS rules with an independent reading prompt and confirmation label. English and Simplified Chinese UI strings are included. The component works on standard Discourse and can optionally surface feedback from a compatible validation plugin.

Tested with the equivalent rc.4 runtime on Discourse 2026.12.0-latest at commit `379e802dae213f2d6b293f4b74bbb6612528cbb0`. See the linked verification scope for exclusions.

Install from the repository or upload the attached `Discourse-Registration-Enhancements-v2.0.0.zip` in Discourse Admin. Use the real confirmation field ID from your site's user-field records. Existing installations should back up component settings and enable only one version per visitor theme.

首个稳定版提供注册表单布局、规则链接、独立确认文案和双语界面。通过后台安装后挂载到访客主题。升级请先备份组件设置，使用本论坛的真实确认字段 ID。

[Installation](docs/INSTALL.md) · [Upgrade and rollback](docs/MIGRATION.md) · [Verification scope](TEST-REPORT.md) · [MIT License](LICENSE)
