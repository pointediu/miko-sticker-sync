# Miko 贴纸实时预览

公开的静态网页，保留“光泽＋立体”和“镭射贴纸”。无需 GPT 账号。

1. 在电脑打开发布后的网址，展开“手机同步”。
2. 用手机相机扫描二维码，在 Safari / Chrome 中打开。
3. 点击“开启手机体感”并允许访问；电脑调节参数，手机同步材质效果。

## 发布

新建独立 GitHub 仓库，上传本目录文件。在 Settings → Pages 选择 Deploy from a branch，选择 main / root 后保存，等待构建完成。使用 GitHub 给出的 HTTPS 网址。

## 同步方式及限制

PeerJS 1.5.5（MIT）经 jsDelivr 加载，PeerJS Cloud 负责连接协商，参数通过 WebRTC 数据通道传输；不上传手机角度，不需要摄像头或麦克风权限。二维码在本地生成。

电脑页面需要持续打开，扫码链接持有者可读取当前参数，但无法修改电脑参数。重新生成链接会断开旧连接。配置保存在各设备的 localStorage，配对会话保存在电脑 sessionStorage；不提供云端永久存储。

此试用版没有自建 TURN 中继，部分公司网络、移动网络或对称 NAT 下可能无法直连，可先在同一 Wi-Fi 测试。同步失败不影响独立预览。不能据此保证任意网络实时同步；若需要稳定跨网络运行，可增加带短时凭证的 TURN 或改用托管 WebSocket 服务。

## 文件与测试

- index.html：可直接发布的单文件网页，包含原贴纸矢量图、样式、二维码和同步逻辑。
- sync-core.js、sync-ui.js：同步源码，已内嵌在 index.html。
- qrcode.js：Kazuhiko Arase 的二维码库（MIT，原版权声明保留）。
- build.py：将同步源码重新内嵌至 index.html；运行 python3 build.py。
- test-sync.cjs：Node 测试，使用内存传输验证配对、单向写入、最新参数、断线恢复与独立调节，不替代真机网络验证。

运行 `node test-sync.cjs`。
