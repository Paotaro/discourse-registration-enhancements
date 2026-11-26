# Verification scope · 验证范围

- The rc.4 equivalent runtime was tested in Chrome on macOS against Discourse `2026.12.0-latest`, commit `379e802dae213f2d6b293f4b74bbb6612528cbb0`. Standard and compatible-plugin installations covered password signup, invitations, local email activation, module toggles and rollback.
- Live configuration was saved through the admin API. The object editor itself was outside that test. Desktop and mobile emulation covered light and dark palettes. Physical phones and email-code-only registration were outside the test.
- The stable v2.0.0 installation payload matches the sealed build except for its updated license and third-party notice. The rebuilt public archive was checked structurally. Installation from the future GitHub URL and a new live import of the public ZIP remain unverified.
- 实机结果来自与稳定版功能相同的 rc.4。后台配置通过管理 API 保存。公开 ZIP 已检查结构与功能文件一致性，尚未重新实机导入，GitHub URL 安装待发布后验证。
