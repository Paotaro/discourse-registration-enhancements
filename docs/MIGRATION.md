# Upgrade and rollback · 升级与回滚

## Upgrade from rc.4 · 从 rc.4 升级

Export or record component settings and guest theme assignments before upgrading. If the admin updater replaces the existing component record, verify the saved settings and theme assignments after the update. If the ZIP creates a new component record, copy the settings there, including the ordered rules rows. Detach rc.4 before attaching v2.0.0 to the same guest theme. No settings or user data migration is required.

升级前导出或记录组件设置、规则链接顺序和访客主题挂载关系。原位更新后核对设置是否保留。如果 ZIP 导入创建了新组件记录，请手动复制原设置，核对规则确认字段 ID，再从访客主题移除 rc.4 并挂载 v2.0.0。使用新访客会话检查普通注册和邀请注册，无需迁移用户数据或重建容器。

To roll back, detach v2.0.0 and reattach the saved rc.4 record. If rc.4 was replaced in place, import the archived rc.4 ZIP and restore its recorded settings. 同一访客主题只挂载一个版本。原位替换的 rc.4 可从历史 ZIP 恢复，并按备份还原设置。

## Upgrade from v1.2.1

Save the old component ZIP, theme assignments and original user-field descriptions. Detach the old component and attach the new component to the same guest themes. Preserve the user-field IDs, visibility, required flags and field types.

The initial settings support the legacy description style when the configured field ID is zero. Inline HTTPS Markdown links are moved out of the checkbox label. In a description containing a standalone `---` line, the text above the line is the reading area and the text below is the label.

To migrate, set the existing confirmation field ID, copy the documents into ordered `rules_links` rows, and fill in `rules_intro` and `rules_confirmation_text` independently. With a positive ID, only the matching confirmation field uses the configured rules block. After verifying the result, disable legacy detection. Keep original user-field descriptions until rollback is no longer needed.

## 从 v1.2.1 升级

先保存原安装包、主题挂载关系和用户字段说明。从访客主题移除旧组件，再挂载新版，保留字段 ID、类型和必填设置。规则字段 ID 默认为 0，支持旧版行内 Markdown 链接和独立 `---` 分隔行。

正式迁移时填写现有确认字段的 ID，将链接依次录入 `rules_links`，将提示和确认文字分别录入 `rules_intro` 与 `rules_confirmation_text`。设置正整数 ID 后，规则阅读区域仅应用于相符的确认字段。验证后可关闭旧格式兼容。

## Rollback · 回滚

Detach the new component, then reattach the locally archived v1.2.1 component. Restore old descriptions if they were edited. Check the actual anonymous theme on both registration paths. Switching themes prompts visitors to reload, which can discard a registration draft. Arrange the switch outside active registration sessions. Existing answers and consent records stay in Discourse.

从所有访客主题移除新版，再恢复本地历史 v1.2.1 组件。如曾改动用户字段说明，恢复升级前备份。用新会话验证两个注册入口。页面刷新可能丢弃未提交内容，安排切换时段时应考虑正在填写的访客。更早的 v1.1、v1.2 和 v1.2.1 历史包保留在原本地交付位置，与本工程的公开历史分开。
