# Macca SimHub Dash

将 RSS GT-M Macca 72 EVO V8 的仪表与转速灯转换为 SimHub 配置，适配 SIMAGIC Zeus 配套的 MagicDash 4（800×480，共 21 灯：侧边 3＋顶部 15＋侧边 3）。

当前仪表版本：**v0.3.1**（轮胎颜色绑定修正）；实体灯版本：**21 LEDs v1.0**。建议使用 **SimHub 9.13.5 或更新版本**。

旧版 SimHub 下曾出现卡顿，并使 MagicDash 返回 SIMAGIC 待机界面；保持 v0.3 原车布局和同一份实体灯配置不变，更新至 **9.13.5** 后，用户反馈恢复正常。本次 v0.3.1 另行修正“胎温数字正常变化，但轮胎仍为灰色”的颜色绑定。

![仪表示例](docs/preview.png)

*示例数据的静态预览，不是实机截图。*

## 下载与安装

1. 先安装 [SimHub 9.13.5 或更新版本](https://github.com/SHWotever/SimHub/releases/tag/9.13.5)，再下载本仓库（Code → Download ZIP）并解压。
2. 安装 [MaccaRSSDisplay-Regular.ttf](fonts/MaccaRSSDisplay-Regular.ttf)，完全退出并重启 SimHub。字体名称应为 **Macca RSS Display**。
3. 双击下方仪表包导入，在 SimHub → Devices → MagicDash 4 → Main dashboard 中选择对应的 **v0.3.1** 仪表。

| 仪表包 | 用途 |
|---|---|
| [原车布局版](dashboards/Macca%2072%20EVO%20-%20MagicDash%204%20v0.3.1.simhubdash) | 保留原车仪表布局，配合实体转速灯 |
| [屏幕转速灯版](dashboards/Macca%2072%20EVO%20-%20Screen%20LEDs%20v0.3.1.simhubdash) | 顶部增加一排屏幕转速灯 |

实体灯：在 **MagicDash 4** 的 LED 配置中导入并加载 [21 灯配置](leds/Macca%2072%20EVO%20-%2021%20LEDs.ledsprofile)。编号为侧灯 **1–3**、顶部转速灯 **4–18**、侧灯 **19–21**；整个效果起始位置为 1。首次可用 [21 灯顺序测试](leds/MagicDash%204%20-%2021%20LED%20order%20test.ledsprofile) 确认。默认亮度 30%，使用新配置替换原 15 灯配置，仪表无需重装。详见 [灯效与安装说明](docs/led-21.md)。

## 主要功能

- 正常行驶、进站和等待三个页面。
- 挡位、RPM、速度、圈速、Delta、四轮胎温与胎压、油量及每圈油耗。
- 原车 10 段转速灯规则对称映射到顶部 4–18 号的 15 颗灯，包含按挡位阈值和进站速度提示。
- 两侧 6 灯提供旗语、进站浅蓝闪烁、绿旗 5 秒提示、可用的 ABS/TC 介入和低油量提示，并按优先级处理。
- 按原车曲线着色：冷胎蓝、适温绿、过热橙红；干胎目标 **90°C**，雨胎 **45°C**，理想胎压 **27 psi**。
- 胎温偏离目标超过 ±15°C、胎压超过 ±1.5 psi 时，数字显示蓝色或红色。
- 轮胎颜色每 250 ms 直接读取对应轮胎数据，使用完整遥测路径并兼容短属性名，不依赖共享颜色字符串；实时挡位、RPM、速度保持快速刷新。

实现参考了 [Lovely Dashboard](https://github.com/Lovely-Sim-Racing/lovely-dashboard) 正式包中的缓存与刷新配置，保留 RSS 原车布局、字形和颜色规则。

## 当前限制

- 已通过离线逻辑、阈值、缺失数据、缓存、字体字形与资源完整性检查。MagicDash 4 USB 下，v0.3 原车布局版＋实体灯配置已获用户反馈：更新至 SimHub 9.13.5 后恢复正常。屏幕转速灯版及其他设备未获实机验证，具体灯珠顺序仍需按设备确认。v0.3.1 颜色修正已通过 616 个离线绑定用例，仍待 Windows 实机颜色确认。
- 使用 **°C / psi** 遥测单位。无法识别轮胎配方时，采用车辆默认干胎目标。
- TC2、PED、电池电压等 CSP 私有字段尚未接入，显示 `--`；其他不可用数据也可能显示 `--`。
- 进站限速无法读取时默认 **80 km/h**。其他限速需同步调整仪表与 LED 公式中的 fallback。
- 原车普通转速灯逻辑在 6 挡或 RPM ≥7850 时关闭；本配置保留该行为。

[轮胎颜色修正说明](docs/tyre-color-fix.md)。

仓库仅保留当前可导入文件、必要资源和绑定修正工具，不包含完整车辆包、旧版本或研究资料。素材与字体归属见 [NOTICE](NOTICE.md)。

## 更多说明

- [21 灯配置与灯效](docs/led-21.md)
- [原车辅助屏预览](docs/auxiliary-displays.md)
- [SimHub UDPConnector 安装步骤](docs/udpconnector-install.md)
