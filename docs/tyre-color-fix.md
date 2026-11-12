# v0.3.1 轮胎颜色修正

反馈：在 v0.3 中，胎温、胎压数字正常变化，但四个轮胎块仍是灰色。

v0.3 的所有轮胎颜色都依赖 `variable.MaccaTyreState` 这段共享字符串；该值缺失或不能按预期读取时，组件统一回退到灰色。当前缺少 Windows 运行日志，不能确认它究竟在哪一步失败。

v0.3.1 移除了这条中间链路：

- 每个轮胎块直接读取本轮胎温度并应用原车五段 RGB 曲线。
- 温度和胎压数字也直接按本轮胎数值变色。
- 优先使用 `DataCorePlugin.GameData.NewData.TyreTemperatureFrontLeft` 等完整路径；读取不到有效数字时尝试 `TyreTemperatureFrontLeft` 等短属性名。
- 不再读取 `MaccaTyreState`，不依赖颜色缓存、字符串长度判断或独立的 GameRunning 判断。
- 保留原车干胎 90°C / 雨胎 45°C、理想胎压 27 psi 和原有刷新间隔。字体、页面、LED 配置不变。

安装：导入带 **v0.3.1** 的仪表包，在设备 Main dashboard 中选择完整的新名称。仓库仅保留原车布局仪表，不需要重装字体或 LED 配置。

离线检查覆盖四个轮胎、干湿胎切换、颜色曲线端点、温度/胎压告警阈值、完整属性与短属性、无效值回退、未知属性异常和缺失数据，共 308 个用例；这不等同于在 Windows/Jint 或实际设备上测试。

没有有效胎温时仍会显示灰色，以免把缺失数据误报成正常温度。

## 维护

`tools/fix_tyre_bindings.py INPUT.simhubdash OUTPUT.simhubdash` 可以对已有 Macca 包应用修正；输入的 v0.3 包可从 Git 历史取得。脚本同时检查其他组件、字体和资源没有被改动。

运行 `python3 tools/test_tyre_bindings.py` 可检查仓库中的 v0.3.1 包；需要 Python 3 和 Node.js。
