# 安装 SimHub UDPConnector（用于补充 CSP 遥测）

这个连接器分成 **Windows 上的 SimHub 插件** 和 **Assetto Corsa 游戏里的 Lua 应用**。两部分都要安装。下面按游戏和 SimHub 在同一台电脑上运行说明。

## 1. 安装 SimHub 插件

1. 到 [作者的 OverTake 下载页](https://www.overtake.gg/downloads/simhub-udpconnector-assetto-app-example-with-additional-datas.74471/) 登录或注册并下载插件包。
2. 完全退出 SimHub。
3. 将包中的 `DaZD.UDPConnector.dll` 复制到 **SimHub 安装目录根目录**，也就是放有 `SimHubWPF.exe` 的文件夹。
4. 重新打开 SimHub，在插件提示或 Settings → Plugins 中启用 UDPConnector。需要的话将其显示在左侧菜单中。

GitHub 仓库主要存放 Lua 脚本与配置；游戏端 ZIP 不包含这个 SimHub DLL。

## 2. 安装游戏里的 Lua 应用

1. 从 [作者 Releases](https://github.com/Dasde/SimHubUDPConnector/releases/tag/v1.0.23) 的 Assets 下载 `SimHubUDPConnector.zip`。
2. 将这个 ZIP 拖进 **Content Manager**，在右上角安装任务中点击 Install。
3. 安装后应存在：

   `assettocorsa/apps/lua/SimHubUDPConnector/SimHubUDPConnector.lua`

4. 启动这辆 RSS Macca，进入赛道，在游戏右侧应用栏打开 **SimHubUDPConnector**。
5. 在应用的 **Extensions** 页确认 `LegacyDataExtension` 已勾选。它提供 TC2、水温等基础补充字段。

已经能运行本车的 CSP 仍需保持启用。这里安装的是 CSP Lua app，不是 Python app。

## 3. 确认两边连通

- 游戏端应用 Settings 中的 host 使用 `127.0.0.1`，port 使用 `20777`。
- SimHub 的 UDPConnector 设置使用相同接收端口 `20777`。同机运行先保留默认本机来源设置。
- 修改游戏端连接参数后，可以点击 **Restart UDP connection**。
- 游戏应保持在赛道内运行；在 SimHub 的 **Available properties / 可用属性** 中搜索 `TC2`、`WaterTemperature`。

这些属性出现且数值变化，才表示数据已传到 SimHub。安装 DLL 或导入仪表本身不能替代这一步。

## 4. 这辆 Macca 的 PED

作者当前源码已经包含：

`cars/rss_gtm_macca_72_evo_v8/connection.lua`

游戏端按车辆 ID 自动加载它，并导出 `GTMSystem_ThrottleMap`。原车仪表的 PED 显示值是这个原始值 **加 1**。可以在 SimHub 可用属性中搜索该字段确认。

之前“PED 必须从零另写适配”的说法不完整：当前作者仓库已有本车适配。完整属性名可能带插件前缀，以你安装后的属性列表为准。

## 5. 当前仪表还差什么

现有 Macca v0.3.1 仪表尚未绑定 UDPConnector 的新增字段；安装成功后，TC2/PED 仍需接到这些属性。不能把“插件已经收到数值”与“仪表已经绑定该数值”当成同一步。

检查的默认 `LegacyDataExtension` 包含 TC2、水温，但没有电池电压字段；电压还需要一个补充导出扩展。这里不承诺安装完四个缺失字段就会自动出现在现有仪表里。

如果 Available properties 里有数值而仪表仍为 `--`，下一步是调整仪表绑定；如果属性都没有出现，则先检查插件是否启用、应用是否运行、LegacyDataExtension 是否勾选，以及端口是否一致。

## 来源

- [作者原仓库与说明](https://github.com/Dasde/SimHubUDPConnector)
- [SimHub 插件下载与作者安装说明](https://www.overtake.gg/downloads/simhub-udpconnector-assetto-app-example-with-additional-datas.74471/)
- [本车专用连接脚本](https://github.com/Dasde/SimHubUDPConnector/blob/main/Assetto%20Corsa/apps/lua/SimHubUDPConnector/cars/rss_gtm_macca_72_evo_v8/connection.lua)

核对日期：2026-11-12。说明依据作者发布内容与源码；本机没有运行 Windows 插件或你的游戏。
