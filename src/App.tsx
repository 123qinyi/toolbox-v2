/**
 * SOUL.md - 工作SOP（每次修改前必读）
 * 
 * 绝对红线：
 * 1. 所有操作执行前必须先给方案，经用户确认后才能执行
 * 2. 用户没有明确说明执行的，一律不准执行
 * 3. 禁止擅自行动
 * 
 * 性格特质：犀利——直击问题核心；克制——理性冷静；专业——逻辑闭环
 * 核心原则：准确优先于好听，可执行优先于空话，说人话少废话
 * 沟通风格：默认中文，不要像AI，不堆术语，不假大空
 * 禁止：模糊回复、情绪化、越权、冗余、无效建议、编造事实
 * 边界：不知道就说不知道，准确比自信重要
 * 流程：思考 → 分析 → 确认 → 执行 → 验证
 * 排查：外层容器 → 内层元素 → 全局样式 → 浏览器默认 → 逐个验证
 */

import { useState } from 'react';
import { Toaster } from 'sonner';
import { KpiTool } from '@/components/tools/KpiTool';
import { TopTool } from '@/components/tools/TopTool';
import { ServiceQualityTool } from '@/components/tools/ServiceQualityTool';
import { TextTool } from '@/components/tools/TextTool';
import { StaffManager } from '@/components/StaffManager';
import { StaffProvider } from '@/contexts/StaffContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  BarChart3,
  TrendingUp,
  ClipboardCheck,
  Type,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Users,
} from 'lucide-react';

// 工具定义
interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  description: string;
}

// 工具列表（后续添加新工具就在这里扩展）
const tools: Tool[] = [
  {
    id: 'service-quality',
    name: '客服质量分析',
    icon: <ClipboardCheck className="w-5 h-5" />,
    component: <ServiceQualityTool />,
    description: '客服质量数据分析与环比统计',
  },
  {
    id: 'kpi',
    name: 'KPI完成度分析',
    icon: <BarChart3 className="w-5 h-5" />,
    component: <KpiTool />,
    description: '客服KPI考核完成度展示',
  },
  {
    id: 'top',
    name: 'TOP数据分析',
    icon: <TrendingUp className="w-5 h-5" />,
    component: <TopTool />,
    description: 'TOP数据分析与情绪分层统计',
  },
  {
    id: 'text',
    name: '文本处理转化',
    icon: <Type className="w-5 h-5" />,
    component: <TextTool />,
    description: '文本格式处理、重复生成与转换',
  },
];

function App() {
  const [activeToolId, setActiveToolId] = useState('service-quality');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [staffManagerOpen, setStaffManagerOpen] = useState(false);

  const activeTool = tools.find(t => t.id === activeToolId) || tools[0];

  return (
    <StaffProvider>
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster position="top-right" richColors expand={true} gap={8} />

      {/* 左侧工具栏 */}
      <aside
        className={`bg-white border-r flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* 工具栏头部 */}
        <div className="h-14 border-b flex items-center justify-between px-3">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-sm text-gray-900">工具箱</span>
            </div>
          )}
          {sidebarCollapsed && (
            <Wrench className="w-5 h-5 text-blue-600 mx-auto" />
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 工具列表 */}
        <nav className="flex-1 py-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveToolId(tool.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                activeToolId === tool.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={sidebarCollapsed ? tool.name : undefined}
            >
              <span className={activeToolId === tool.id ? 'text-blue-600' : 'text-gray-400'}>
                {tool.icon}
              </span>
              {!sidebarCollapsed && (
                <div className="text-left">
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-xs text-gray-400 truncate max-w-[140px]">{tool.description}</div>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* 工具栏底部 */}
        <div className="border-t py-3 px-3">
          {!sidebarCollapsed ? (
            <div className="text-xs text-gray-400 text-center">
              v2.0.0
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center">
              v2
            </div>
          )}
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-14 bg-white border-b flex items-center px-6">
          <h1 className="text-lg font-bold text-gray-900">{activeTool.name}</h1>
          <span className="ml-3 text-sm text-gray-400">{activeTool.description}</span>
          <div className="ml-auto">
            <button
              onClick={() => setStaffManagerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title="人员管理"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">人员管理</span>
            </button>
          </div>
        </header>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto p-6">
          <ErrorBoundary>
            {activeTool.component}
          </ErrorBoundary>
        </div>
      </main>

      {/* 全局人员管理弹窗 */}
      <StaffManager open={staffManagerOpen} onOpenChange={setStaffManagerOpen} />
    </div>
    </StaffProvider>
  );
}

export default App;
