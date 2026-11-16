# Miko 贴纸实时预览

公开的镭射材质预览网页。无需 GPT 账号。

1. 在电脑打开首页，对比四款材质后点击“手机联调”。配色、强度与纹理密度会带入联调页，二维码自动展开。
2. 用手机相机扫描二维码，在 Safari / Chrome 中打开。
3. 点击“开启手机体感”并允许访问；电脑调节参数，手机同步材质效果。

## 发布

新建独立 GitHub 仓库，上传本目录文件。在 Settings → Pages 选择 Deploy from a branch，选择 main / root 后保存，等待构建完成。使用 GitHub 给出的 HTTPS 网址。

## 同步方式及限制

PeerJS 1.5.5（MIT）经 jsDelivr 加载，PeerJS Cloud 负责连接协商，参数通过 WebRTC 数据通道传输；不上传手机角度，不需要摄像头或麦克风权限。二维码在本地生成。

电脑页面需要持续打开，扫码链接持有者可读取当前参数，但无法修改电脑参数。重新生成链接会断开旧连接。配置保存在各设备的 localStorage，配对会话保存在电脑 sessionStorage；不提供云端永久存储。

此试用版没有自建 TURN 中继，部分公司网络、移动网络或对称 NAT 下可能无法直连，可先在同一 Wi-Fi 测试。同步失败不影响独立预览。不能据此保证任意网络实时同步；若需要稳定跨网络运行，可增加带短时凭证的 TURN 或改用托管 WebSocket 服务。

## 文件与测试

- index.html：四款材质首页；materials.html 保留为同一首页的兼容入口。
- preview.html：选中材质的手机联调页，仅显示当前材质的有效参数，含二维码、参数同步和手机体感。
- material-renderer.js：联调页的四款材质渲染器，已内嵌在 preview.html。
- sync-core.js、sync-ui.js：同步源码，已内嵌在 preview.html。
- qrcode.js：Kazuhiko Arase 的二维码库（MIT，原版权声明保留）。
- build.py：将同步源码重新内嵌至 preview.html；运行 python3 build.py。
- test-sync.cjs：Node 测试，使用内存传输验证配对、单向写入、最新参数、断线恢复与独立调节，不替代真机网络验证。

运行 `node test-sync.cjs`。
