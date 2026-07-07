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

## 项目结构
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
