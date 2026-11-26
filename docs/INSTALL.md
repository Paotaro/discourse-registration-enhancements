# Install and configure · 安装与配置

1. In Discourse Admin, open **Appearance → Themes & components → Components → Install** and upload the v2.0.0 ZIP. Add it to the theme used by logged-out visitors. Keep only one registration enhancement component attached to that theme.
2. In **Users → User fields**, create or select an existing registration confirmation field. Copy its site-specific numeric ID from its edit URL or the admin user-field record. Use the ID of the confirmation field itself. Never infer it from rendered DOM IDs or ARIA attributes such as `aria-describedby`. Set its registration visibility and required status in Discourse itself.
3. Open the component settings. Enter the ID in `rules_confirmation_field_id`. Add ordered rows under `rules_links` with a label and HTTPS URL. Use `rules_intro` for the reading prompt and `rules_confirmation_text` for the checkbox text. The row order determines display order. Invalid URL rows are omitted.
4. Enter branding strings and section headings as needed. Blank section titles use the active locale's defaults. Each `enable_*` option controls its named module. `fixed_field_titles` returns text controls to native positioning when off. `show_field_descriptions` controls question descriptions. The confirmation label stays present.
5. Open a fresh logged-out session after saving. Verify both ordinary and invitation registration with the theme active. No container rebuild is needed for uploading or switching a theme component.

在后台「外观 → 主题与组件」上传 ZIP，并挂载到未登录访客实际使用的主题。在「用户字段」选择已有的注册确认框，通过该字段的编辑地址或后台字段记录获取真实数字 ID。字段 ID 因站点而异，请勿照抄其他站点的 ID，或从 DOM 元素 ID、`aria-describedby` 等 ARIA 属性推断。字段是否在注册显示、是否必填，均在原生用户字段中管理。

在组件中填写 `rules_confirmation_field_id`，在 `rules_links` 逐条配置链接名称与 HTTPS 地址，按所需顺序排列。使用 `rules_intro` 设置阅读提示，使用 `rules_confirmation_text` 设置确认文字。空白分区标题使用当前语言默认值。各模块可独立关闭。保存后以新的未登录会话验证，上传和切换组件无需重建容器。

## Synthetic example · 合成示例

- Brand name / 品牌名称 — Example Reading Club
- Rules intro / 阅读提示 — Please read the following documents before registering.
- Rules link / 规则链接 — Community guidelines → `https://example.test/community`
- Rules link / 规则链接 — Privacy notice → `https://example.test/privacy`
- Confirmation text / 确认文字 — I have read and agree to the rules above.

Replace example addresses before using the component on a real site. In a local test instance, publish local synthetic pages and use local HTTPS when testing navigation.

## Install from GitHub · 通过 GitHub 安装

After publication, choose the Git repository option and enter the component repository URL. To install from a file, download the attached component ZIP from the release and choose the device upload option. Both methods require adding the component to the visitor theme. 发布后可在安装对话框选择 Git 仓库方式，或下载 Release 附件中的组件 ZIP 后通过本机上传。两种方式均需挂载到访客主题。

[Repository](https://github.com/Paotaro/discourse-registration-enhancements) · [v2.0.0 release](https://github.com/Paotaro/discourse-registration-enhancements/releases/tag/v2.0.0) · [Official installation guide](https://meta.discourse.org/t/63682)
