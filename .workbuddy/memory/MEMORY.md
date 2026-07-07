# Project Memory - toolbox-v2

## 项目概述
- **名称**: toolbox-v2 (v2.0.0)
- **技术栈**: React 19 + Vite 7 + TypeScript + Tailwind CSS 3 + Radix UI (shadcn/ui)
- **用途**: 数据工具箱，含 KPI工具、服务质量工具、TOP工具、数据导入/对比、人员管理、指标配置

## 迁移记录
- 2026-06-23: 从另一台设备迁移 (toolbox-v2.zip)，解压至当前工作区

## 配置约定
- `package.json` 设为 `"type": "module"` (ESM)
- Vite 配置: `vite.config.ts` (用 `import.meta.dirname`，非 `__dirname`)
- Tailwind 配置: `tailwind.config.cjs` (ESM项目中CJS配置必须用.cjs后缀)
- 不要同时保留 `.js` 和 `.cjs`/`.ts` 的重复配置文件

## ⚠️ 已知问题：tsc 类型检查失效（已修复 2026-07-03）
- ~~根 `tsconfig.json` 配置了 `"files": []` + project references~~
- ~~`package.json` build 脚本 `tsc --noEmit` 用根 tsconfig，实际不检查任何文件~~
- **已修复**：build 脚本改为 `tsc --noEmit -p tsconfig.app.json && vite build`
- 现在 tsc 会真正检查 src 下所有文件，漏 import / 未使用变量 / 类型错误都会在 build 阶段拦住
- 教训：改完代码不能盲信"tsc 通过"，要确认 tsc 实际在检查文件

## ErrorBoundary
- `src/components/ErrorBoundary.tsx` 全局错误边界
- 在 `App.tsx` 中包裹 `activeTool.component`
- 单个工具组件渲染崩溃时显示降级 UI，不再白屏整页

## 部署配置
- **GitHub 仓库**: https://github.com/123qinyi/toolbox-v2.git (public)
- **线上地址**: https://123qinyi.github.io/toolbox-v2/
- **部署方式**: GitHub Actions（`.github/workflows/deploy.yml`）
- **流程**: push main → 自动 build + deploy，1-2 分钟生效
- **备用**: CodeBuddy sandbox https://1b0f5a5bac3f49e6a03f93abdf188997.app.codebuddy.work
- **注意**: `package-lock.json` 必须提交（CI 用 `npm ci`），已在 `.gitignore` 中移除排除

## 工具迭代流程（标准 SOP）
1. **用户提需求** — 说人话描述要改什么，不用管技术细节
2. **本地改代码** — 改完本地 build 验证没问题
3. **push 到 GitHub** — `git push origin main`
4. **GitHub Actions 自动部署** — 自动 npm ci → build → 部署到 Pages，1-2 分钟生效
5. 用户无需任何手动操作，刷新页面即可看到更新

## 版本管理规范
- **GitHub 仓库是权威备份**，不是改代码的起点；改代码起点永远是本地
- **每次动手改代码前必须先 `git pull`**，保证本地跟 GitHub 对齐，避免在老版本上改出冲突
- **换电脑恢复流程**: 新电脑装 WorkBuddy → `git clone` 拉下仓库 → 重新配 git credential（GitHub token）→ 继续干活
- **多电脑切换场景**: 电脑 A 改了没 push，又去电脑 B 改 → 回到电脑 A 时先 `git pull` 拉最新再动手
- 本地代码和 GitHub 仓库应始终保持一致，每次改完必须 push

## 记忆文件管理规范（跨机器同步）
- **记忆文件已纳入 git 跟踪**，存放在 `.workbuddy/memory/` 下，随代码一起 push 到 GitHub
- 用户级记忆 `~/.workbuddy/MEMORY.md` 不在项目目录，已在仓库中放一份副本 `.workbuddy/memory/USER_MEMORY_BACKUP.md`
- **改记忆文件流程**:
  1. 编辑本地记忆文件（MEMORY.md / USER_MEMORY_BACKUP.md / 日志）
  2. 如果改了 `~/.workbuddy/MEMORY.md`（用户级），同步更新仓库里的 `USER_MEMORY_BACKUP.md`
  3. `git add .workbuddy/memory/` → `git commit` → `git push origin main`
- **换电脑恢复记忆流程**:
  1. `git clone` 拉下仓库
  2. 项目记忆（`.workbuddy/memory/MEMORY.md`）直接在仓库里，不用额外操作
  3. 用户级记忆：把 `USER_MEMORY_BACKUP.md` 内容复制到新电脑的 `~/.workbuddy/MEMORY.md`
- 仓库是 public，记忆文件内容用户已确认可公开
```
src/
├── App.tsx              # 主入口
├── components/
│   ├── tools/           # 核心工具 (KpiTool, ServiceQualityTool, TopTool)
│   ├── ui/              # shadcn/ui 组件库
│   ├── DataImport.tsx   # 数据导入
│   ├── DataCompare.tsx  # 数据对比
│   ├── StaffManager.tsx # 人员管理
│   ├── IndicatorConfig.tsx # 指标配置
│   └── ...
├── contexts/            # React Context (StaffContext)
├── hooks/               # 自定义 hooks
├── lib/                 # 工具函数 (kpi-utils, top-utils)
└── types/               # TypeScript 类型定义
```
