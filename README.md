# 弦音地图 · Fret & Key

一个纯前端 Guitar Note Map：可以从麦克风检测乐器单音，也可以用实验性的多音模式识别同一件乐器发出的和声；还可以直接弹奏指板和钢琴键，把音符同步投影到吉他指板、钢琴键盘和五线谱。声乐输入仍可使用，但不是产品主叙事。

## 本地运行

    pnpm install
    pnpm dev

麦克风 API 需要 HTTPS 或 localhost。局域网 HTTP 地址可以预览界面，但浏览器不会开放麦克风；Cloudflare Pages 部署环境使用 HTTPS。

## 检查

    pnpm test
    pnpm lint
    pnpm typecheck
    pnpm build

完整的公开 CI 矩阵使用：

    pnpm run ci

`pnpm build` 会从 `public/favicon.svg` 幂等生成 PWA 图标与 iPhone / iPad 启动图，通过 FWA build entry 生成同源 loader、唯一 Service Worker 与原子 release descriptor，并在构建末尾检查 manifest、Local Edge、iOS metadata 和生成资产是否完整。生成目录 `public/icons/`、`public/splash/` 不进入 Git。

## 安装到 iPhone / iPad

1. 使用 Safari 打开 production 地址。
2. 点击“共享”，选择“添加到主屏幕”。
3. 从主屏幕启动“弦音地图”，以 standalone 模式使用。

首次在线打开后，Local Edge 会在后台完整校验并提交 app shell、分析 Worker、Basic Pitch model 与 PCM worklet；此后离线仍可启动界面并使用单音 / 多音检测能力。Startup splash 不参与这份原子 release。麦克风授权仍由 iOS 按站点 / Web App 管理。设置中的“FWA 调试工具”会写入 loader 的 `__fwa_debug` 本地偏好并刷新当前页面，便于 standalone 内开启或关闭 diagnostics；它不改变缓存与离线策略。

现代 iOS 上，弹奏模式通过 Audio Session API 使用 `playback` 类别，使主动点按产生的乐器音频不受系统静音模式影响；麦克风监听期间改用 `play-and-record`，停止后恢复 `auto`。不支持该 API 的浏览器维持原有 Web Audio 行为。

## 部署

Production：https://fret-app.zgq.me/

Cloudflare Pages fallback：https://guitar-theory-visualizer.pages.dev/

默认分支由 GitHub Actions 发布。普通 push / PR 的 `CI` workflow 不读取构建配置或 Cloudflare 凭据；只有 `main` 的 `Deploy Pages` job 进入受保护的 `pages-production` environment 后，才会注入下列 GitHub Environment secrets：

- `CF_WEB_ANALYTICS_TOKEN`：生产构建的 Cloudflare Web Analytics snippet 配置。
- `CLOUDFLARE_ACCOUNT_ID`：目标 Pages account。
- `CLOUDFLARE_API_TOKEN`：仅能部署该 Pages project 的最小权限 token。

部署 job 先重跑完整公开矩阵，再用 `pnpm build:production` 生成带 Analytics beacon 的 release，最后执行 `wrangler pages deploy dist --project-name guitar-theory-visualizer --branch main` 和 production deployment check。源仓不读取 `.env` 文件；本地 `pnpm build` 保持无配置、可复现的公开验证入口。

Cloudflare Web Analytics 使用官方的手动 JS Snippet 安装模式。Pages 项目需在 Web Analytics 的 Manage site 中选择 `Enable with JS Snippet installation`，避免一键自动安装在部署阶段改写 HTML。查看真实公开访问量时，在 Cloudflare Dashboard 的 Web Analytics 页面设置 `Host = fret-app.zgq.me` 并开启 `Exclude Bots = Yes`，排除 preview 与机器人。

SEO 基线由 `index.html`、`public/robots.txt`、`public/sitemap.xml` 和构建生成的 `public/assets/social-preview.png` 组成；`pnpm check:site` 校验 canonical URL、Open Graph、结构化数据和分享图尺寸。发布后运行 `pnpm check:deployment -- <production-url>`，防止缺失图片被 SPA fallback 伪装成 `HTTP 200 + text/html`。旧 `/social-preview.png` 通过 Pages `_redirects` 永久跳转到标准 assets 路径。

实验分支可在不使用 production environment 的前提下进行手动 Pages preview，不更新 production alias：

    wrangler pages deploy dist --project-name guitar-theory-visualizer --branch <git-branch>
    pnpm check:deployment -- --without-analytics <preview-url>

## v0 边界

- 标准调弦、默认 20 品（对应 Yamaha FG830 等常见钢弦木吉他）、单音精调
- 实验性多音模式面向单件吉他、钢琴或人声和声，使用约 2 秒滚动窗口输出音符集合与候选和弦；单音旋律不会被窗口直接合并为和弦
- 弹奏模式可点击 / 触摸任意指板品位或钢琴键，以两种本地生成音色即时发声并同步四个学习视图
- 桌面 Chrome 可通过 Web MIDI 连接输入设备，热插拔、复音 Note On / Note Off、velocity 与 Guitar / Piano 音色切换复用同一弹奏会话
- 弹奏模式与麦克风监听互斥；两套音色由原生 Web Audio 生成，不加载采样包
- 练习弦模式默认关闭；开启后可手动选择练习弦，并区分该弦与其他同音位置
- 中央 C 编号支持科学音高 C4、Yamaha / Logic C3 与 FL Studio C5；切换只改变音名展示，不改变频率、MIDI、发声或乐器位置
- 麦克风灵敏度、单音 / 多音阈值、稳定窗口、采集格式和浏览器音频处理均可调，参数保存在本机且可单项恢复默认
- React + TypeScript + Web Audio API + 数据驱动 SVG
- 纯静态构建，已通过 Direct Upload 部署到 Cloudflare Pages

多音转录复用 Spotify 的 [Basic Pitch](https://github.com/spotify/basic-pitch-ts) 浏览器实现和官方 onset / frame 解码器，和弦候选复用 [Tonal](https://github.com/tonaljs/tonal)。模型原理与评估见 [Basic Pitch 论文](https://arxiv.org/abs/2203.09893)。

## License

本仓自有代码以 [MIT](LICENSE) 发布。第三方依赖及构建时复制的 Basic Pitch 模型分别遵循其自身许可证；`@spotify/basic-pitch` 与 `@tensorflow/tfjs` 为 Apache-2.0，Tonal、React 与 React DOM 为 MIT。

暂不覆盖多乐器混音分离、自动判断实际琴弦、连续歌曲转录、特殊调弦、账号或后端。普通单声道麦克风无法唯一恢复同音高对应的真实琴弦，因此指板继续展示全部候选位置。
