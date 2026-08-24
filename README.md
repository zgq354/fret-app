# 弦音地图 · Fret & Key

[立即体验](https://fret-app.zgq.me/) · [源码](https://github.com/zgq354/fret-app) · [English](README.en.md)

弦音地图是一款在浏览器中使用的吉他与钢琴音符地图。通过麦克风、触控或 MIDI 输入，演奏中的音高会同步显示在吉他指板、钢琴键盘和五线谱上，便于把听到、弹到和看到的音高对应起来。

它适合刚开始熟悉吉他指板的音乐初学者，用声音和触控建立音名、琴弦与品位之间的对应。

无需注册。桌面浏览器可以直接使用，也可与 Android 一样安装为 PWA；iOS 与 iPadOS 可以通过 Safari 的“添加到主屏幕”作为 WebClip 使用。用支持麦克风的浏览器打开 [线上版本](https://fret-app.zgq.me/) 即可开始。

## 可以怎样使用

- **听音与找位**：弹奏吉他或其他单音乐器，查看音名及其在标准调弦吉他指板上的全部位置。
- **对照多种视图**：同一个音高同时映射到指板、钢琴键盘和五线谱。
- **直接弹奏**：点击或触摸指板、钢琴键盘，听取本地合成音色并观察对应关系。
- **连接 MIDI**：桌面 Chrome 可以连接 MIDI 键盘或其他输入设备。
- **实验性多音识别**：对单件乐器、钢琴或人声和声的短窗口分析会显示音符集合与候选和弦。

## 开始体验

1. 在桌面浏览器或移动设备的 HTTPS 页面打开应用；浏览器只有在 HTTPS 或 localhost 场景下才会开放麦克风。
2. 允许麦克风后，先尝试清晰的单音演奏；多音模式属于实验功能。
3. 桌面浏览器与 Android 可从浏览器菜单安装 PWA；iPhone 或 iPad 可在 Safari 中选择“添加到主屏幕”，以 WebClip 方式使用。

首次在线打开后，应用会在后台准备完整的离线版本；之后即使暂时断网，仍可以启动界面并使用单音与多音检测。麦克风授权仍由浏览器和系统按站点管理。

## 当前边界

- 标准调弦、默认 20 品的吉他指板；不处理特殊调弦。
- 单声道麦克风无法判断同一音高实际来自哪一根弦，因此会显示所有可能位置。
- 多音模式不是多乐器混音分离，也不用于连续歌曲转录。
- 弹奏与麦克风监听不能同时进行；当前没有账号、云端保存或后端服务。
- 中央 C 的编号可按科学音高、Yamaha / Logic 或 FL Studio 切换；切换只影响显示，不改变实际音高。

## 技术与验证

弦音地图是纯静态 Web 应用，使用 React、TypeScript、Web Audio API 和数据驱动 SVG。多音转录使用 Spotify 的 [Basic Pitch](https://github.com/spotify/basic-pitch-ts) 浏览器实现，和弦候选使用 [Tonal](https://github.com/tonaljs/tonal)。离线 release 由 [`@fullstack-webapp/local-edge`](https://www.npmjs.com/package/@fullstack-webapp/local-edge) 提供浏览器侧的原子更新与恢复边界。模块分工、输入到显示的路径与生产发布边界见[技术架构](docs/architecture.md)。

公开 CI 会运行 lint、类型检查、单元测试、Local Edge 浏览器测试和生产构建：

```sh
pnpm run ci
```

默认分支的生产发布由 GitHub Actions 执行。公开 CI 不读取构建配置或 Cloudflare 凭据；只有受保护的 `pages-production` environment 才能注入生产构建与 Cloudflare Pages 所需配置，并在发布后检查 [线上版本](https://fret-app.zgq.me/)。

## 本地运行

需要 Node.js 24 和 pnpm 11。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

常用检查：

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm build` 会生成 PWA 图标、iPhone / iPad 启动图、Local Edge loader、Service Worker 与 release descriptor，并校验生成资产、manifest、iOS metadata 和离线 release。生成目录 `public/icons/`、`public/splash/` 不进入 Git。

## 反馈与问题

暂不开放外部贡献。欢迎通过 [GitHub Issues](https://github.com/zgq354/fret-app/issues) 提出问题、bug 或使用反馈；如计划投入 Pull Request，请先开 Issue 沟通。外部 PR 目前不在维护范围内，不承诺审核或合入。

## License

本仓自有代码以 [MIT](LICENSE) 发布。第三方依赖及构建时复制的 Basic Pitch 模型分别遵循其自身许可证；`@spotify/basic-pitch` 与 `@tensorflow/tfjs` 为 Apache-2.0，Tonal、React 与 React DOM 为 MIT。
