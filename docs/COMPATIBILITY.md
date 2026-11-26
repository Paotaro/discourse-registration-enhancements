# Compatibility · 兼容性

This component targets Discourse `2026.12.0-latest` at core commit `379e802dae213f2d6b293f4b74bbb6612528cbb0`. Other releases require separate testing because native registration form markup, theme module exposure and plugin outlets can change.

The component is designed for ordinary and invitation registration, including the registration contexts of the native email-code flow. The component leaves authentication and account creation to Discourse. Standalone inline feedback is advisory. Optional integration detects the public metadata of the maintenance variant of Authentication Validations 0.0.2, using only public field lengths, conditional field IDs and response error categories. The integration is independently switchable. Other variants of that plugin have not been assessed.

目标为 Discourse `2026.12.0-latest` 的指定提交。其他版本应重新核对注册模板、主题模块注册表和扩展点。标准安装由 Discourse 原生验证，组件仅提供界面提示。可选集成依赖 Authentication Validations 0.0.2 兼容维护版的公开协议，关闭集成后前端回到原生注册验证。服务端插件、私有答案和规则均不随本组件分发。

[Core source](https://github.com/discourse/discourse/tree/379e802dae213f2d6b293f4b74bbb6612528cbb0) · [Theme object settings](https://github.com/discourse/discourse/blob/379e802dae213f2d6b293f4b74bbb6612528cbb0/docs/developer-guides/docs/05-themes-components/10-objects-for-theme-settings.md)
