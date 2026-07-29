# Project Memory - toolbox-v2

## 项目概述
- **名称**: toolbox-v2 (v2.0.0)
- **技术栈**: React 19 + Vite 7 + TypeScript + Tailwind CSS 3 + Radix UI (shadcn/ui)
- **用途**: 数据工具箱，含 KPI工具、服务质量工具、TOP工具、数据导入/对比、人员管理、指标配置

## 迁移记录
- 2026-06-23: 从另一台设备迁移 (toolbox-v2.zip)，解压至当前工作区
- 2026-07-29: 新设备迁移，通过 sync.sh 自动恢复身份/记忆/Git配置/依赖

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
- **流程**: push main → 自动 npm ci → build → 部署到 Pages，1-2 分钟生效
- **注意**: `package-lock.json` 必须提交（CI 用 `npm ci`），已在 `.gitignore` 中移除排除
- **Git 认证**: `credential.helper store`（PAT 存在 `~/.git-credentials`，永不过期）
- **fetch/push**: 均走 GitHub 直连，不用镜像代理

## 工具迭代流程（标准 SOP）
1. **用户提需求** — 说人话描述要改什么，不用管技术细节
2. **改代码前先 `git pull`** — 保证本地与 GitHub 对齐
3. **本地改代码** — 改完 `npm run build` 验证没问题
4. **push 到 GitHub** — `git push origin main`
5. **GitHub Actions 自动部署** — 自动 build + deploy，1-2 分钟生效
6. **附线上地址** — 部署完成后必须在回复末尾附 https://123qinyi.github.io/toolbox-v2/
7. push 失败一次就停止，不重试，告知用户

## 多设备同步（sync.sh）

### 日常切换（两台设备都配过）
```
离开设备A：bash .workbuddy/memory/sync.sh
到了设备B：bash .workbuddy/memory/sync.sh
```
同一条命令，脚本自动完成：备份本地 → 提交+拉取远程 → 恢复到本地 → 推送

### 新设备首次配置
```
第1步：装好 WorkBuddy，打开它
第2步：git clone https://github.com/123qinyi/toolbox-v2.git
第3步：cd toolbox-v2 && GITHUB_PAT=你的token bash .workbuddy/memory/sync.sh
第4步：WorkBuddy 连接器页面重新授权飞书等（每台设备一次）
```
sync.sh setup 模式自动完成：恢复身份/日志 → 配 Git（清除GCM+设store）→ 配 remote → npm install + build

### 仍需手动
- 飞书等连接器：每台新设备重新授权一次
- GitHub PAT：新设备首次手动传入（不存进 public repo）

### Git 认证方案
- PortableGit 自带 GCM（Git Credential Manager），凭据存 Windows 凭据管理器，机器绑定，迁移不过来
- sync.sh 用 `credential.helper ""` 清除 GCM 继承，再设 `store` 为唯一 helper
- PAT 写入 `~/.git-credentials`，git 自动读取，push 不需要 URL 内嵌 token

## 记忆体系（三层）
1. **用户级** `~/.workbuddy/`：MEMORY.md（SOP/偏好）、SOUL.md、IDENTITY.md、USER.md — 机器绑定，靠 sync.sh 备份/恢复
2. **项目级** repo `.workbuddy/memory/`：MEMORY.md（项目记忆）、日志、`*_BACKUP.md`（用户级备份）、sync.sh — git 跟踪
3. **工作区级** `Claw/.workbuddy/memory/`：MEMORY.md + 日志 — WorkBuddy 实际读取位置，与 repo 副本通过 sync.sh 双向同步

## 源码结构
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
