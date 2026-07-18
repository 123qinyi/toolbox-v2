import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trash2,
  Users,
  TrendingUp,
  BarChart3,
  Download,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  History,
  Play,
  Copy,
  Upload,
  RefreshCw,
  ArrowUpDown,
  Crown,
  Trophy,
  Medal,
  TrendingDown,
  MessageSquare,
  Smile,
  Frown,
  Timer,
  Bookmark,
  BookmarkCheck,
  GitCompare,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DataBackup } from '@/components/DataBackup';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useStaffContext } from '@/contexts/StaffContext';

// ==================== 类型定义 ====================

// 工作量报表数据
interface WorkloadData {
  name: string;
  group: string;
  type: string;
  validSessions: number;
}

// 质量报表数据
interface QualityData {
  name: string;
  satisfied: number;
  neutral: number;
  dissatisfied: number;
  avgResponseTime: number;
  responseRate60s: number;
}

// 首响60秒应答率数据
interface FirstResponseData {
  name: string;
  firstResponseRate60s: number; // 首响60秒应答率（%）
  totalSessions: number; // 总会话数
  within60s: number; // 60秒内响应数
}

// 合并后的员工质量数据
interface EmployeeQuality {
  id: string;
  name: string;
  group: 'A组' | 'B组';
  type: '基础' | 'VIP' | '组长';
  validSessions: number;
  satisfied: number;
  neutral: number;
  dissatisfied: number;
  satisfactionRate: number;
  neutralRate: number;
  dissatisfiedRate: number;
  avgResponseTime: number; // 平均响应时间（秒）
  responseRate60s: number; // 60秒应答率（%）
  firstResponseRate60s: number; // 首响60秒应答率（%）
  inviteCount: number; // 主动邀评数
  inviteRate: number; // 主动邀评率（%）
  inviteSatisfactionRatio: number; // 邀评满意转化比（满意数/主动邀评数）
  dateRange?: string; // 日期范围
}

// 历史记录
interface QualityHistory {
  id: string;
  dateRange: string;
  timestamp: number;
  note: string;
  data: EmployeeQuality[];
}

// 永久历史记录（带标记类型）
interface PermanentHistory extends QualityHistory {
  markType: '日' | '周' | '双周' | '月' | '季' | '年';
}

// 数据对比类型
interface ComparisonConfig {
  type: 'person' | 'group';
  targetA: {
    name?: string;
    group?: string;
    type?: string;
  };
  targetB: {
    name?: string;
    group?: string;
    type?: string;
  };
}

interface ComparisonResult {
  targetA: {
    name: string;
    data: EmployeeQuality[];
    stats: {
      totalSessions: number;
      satisfactionRate: number;
      dissatisfied: number;
      avgResponseTime: number;
      responseRate60s: number;
      firstResponseRate60s: number;
    };
  };
  targetB: {
    name: string;
    data: EmployeeQuality[];
    stats: {
      totalSessions: number;
      satisfactionRate: number;
      dissatisfied: number;
      avgResponseTime: number;
      responseRate60s: number;
      firstResponseRate60s: number;
    };
  };
  diff: {
    sessionsDiff: number;
    satisfactionDiff: number;
    dissatisfiedDiff: number;
    responseTimeDiff: number;
    responseRateDiff: number;
    firstResponseRateDiff: number;
  };
}

// 环比分析数据
interface ComparisonData {
  lastWeek: EmployeeQuality[];
  thisWeek: EmployeeQuality[];
  lastWeekDateRange: string;
  thisWeekDateRange: string;
}

// 个人环比数据
interface EmployeeComparison {
  name: string;
  group: 'A组' | 'B组';
  type: '基础' | 'VIP' | '组长';
  metrics: {
    validSessions: { last: number; this: number; change: number };
    satisfactionRate: { last: number; this: number; change: number };
    dissatisfied: { last: number; this: number; change: number };
    avgResponseTime: { last: number; this: number; change: number };
    responseRate60s: { last: number; this: number; change: number };
    firstResponseRate60s: { last: number; this: number; change: number };
  };
}

// ==================== localStorage 工具函数 ====================

const STORAGE_KEY_HISTORY = 'service_quality_history';
const STORAGE_KEY_WORKLOAD_INPUT = 'service_quality_workload_input';
const STORAGE_KEY_QUALITY_INPUT = 'service_quality_quality_input';
const STORAGE_KEY_FILTER_GROUP = 'service_quality_filter_group';
const STORAGE_KEY_FILTER_TYPE = 'service_quality_filter_type';
const STORAGE_KEY_SESSION_INPUT = 'service_quality_session_input';
const STORAGE_KEY_FIRST_RESPONSE_INPUT = 'service_quality_first_response_input';
const MAX_HISTORY = 10;
const STORAGE_KEY_PERMANENT_HISTORY = 'service_quality_permanent_history';

// localStorage 版本的 API 替代函数
const storageApi = {
  getPermanentHistoryList: (): PermanentHistory[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PERMANENT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  savePermanentHistoryList: (list: PermanentHistory[]) => {
    localStorage.setItem(STORAGE_KEY_PERMANENT_HISTORY, JSON.stringify(list));
  },
};

// ==================== 组件 ====================

export const ServiceQualityTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState('analysis');

  // ========== 全局人员管理 ==========
  const { staffList, getStaffByName } = useStaffContext();

  // ========== 数据分析状态 ==========
  const [workloadInput, setWorkloadInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_WORKLOAD_INPUT) || '';
    }
    return '';
  });
  const [qualityInput, setQualityInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_QUALITY_INPUT) || '';
    }
    return '';
  });
  const [sessionInput, setSessionInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_SESSION_INPUT) || '';
    }
    return '';
  });
  const [analysisFormat, setAnalysisFormat] = useState<'old' | 'new'>('new');
  const [analysisResult, setAnalysisResult] = useState<EmployeeQuality[]>([]);
  const [filterGroup, setFilterGroup] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_FILTER_GROUP) || 'all';
    }
    return 'all';
  });
  const [filterType, setFilterType] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_FILTER_TYPE) || 'all';
    }
    return 'all';
  });

  const [firstResponseInput, setFirstResponseInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_FIRST_RESPONSE_INPUT) || '';
    }
    return '';
  });
  const [comparisonResult, setComparisonResult] = useState<ComparisonData | null>(null);
  const [comparisonFilterGroup, setComparisonFilterGroup] = useState<string>('all');
  const [comparisonFilterType, setComparisonFilterType] = useState<string>('all');

  // 员工详情弹窗状态
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeComparison | null>(null);
  const [isEmployeeDetailOpen, setIsEmployeeDetailOpen] = useState(false);

  // 排序状态
  const [sortConfig, setSortConfig] = useState<{
    key: keyof EmployeeQuality | null;
    direction: 'asc' | 'desc';
  }>({ key: 'satisfactionRate' as keyof EmployeeQuality, direction: 'desc' });

  // ========== 历史记录状态 ==========
  const [historyList, setHistoryList] = useState<QualityHistory[]>([]);
  const [permanentHistoryList, setPermanentHistoryList] = useState<PermanentHistory[]>([]);

  // ========== 数据对比状态 ==========
  const [comparisonConfig, setComparisonConfig] = useState<ComparisonConfig>({
    type: 'person',
    targetA: {},
    targetB: {},
  });
  const [comparisonResult2, setComparisonResult2] = useState<ComparisonResult | null>(null);

  // 数据对比页 - 数据源追踪
  const [comparisonDataSource, setComparisonDataSource] = useState<{ label: string; count: number; dateRange?: string } | null>(null);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);

  // 环比分析历史选择状态
  const [selectedHistoryForComparison, setSelectedHistoryForComparison] = useState<{
    lastWeek: string | null;
    thisWeek: string | null;
  }>({ lastWeek: null, thisWeek: null });

  // ==================== 加载/保存数据 ====================

  // 从 localStorage 加载人员配置和永久历史记录
  useEffect(() => {
    const loadData = () => {
      try {
        const permanentHistoryData = storageApi.getPermanentHistoryList();
        // 按类型排序：年→季→月→双周→周→日，同类型按时间倒序
        const markTypeOrder: Record<string, number> = {
          '年': 0, '季': 1, '月': 2, '双周': 3, '周': 4, '日': 5
        };
        const sortedPermanentHistory = [...permanentHistoryData].sort((a, b) => {
          const orderDiff = markTypeOrder[a.markType] - markTypeOrder[b.markType];
          if (orderDiff !== 0) return orderDiff;
          return b.timestamp - a.timestamp;
        });
        setPermanentHistoryList(sortedPermanentHistory);
      } catch (error) {
        console.error('加载数据失败', error);
        toast.error('加载数据失败，请刷新页面重试');
      }
    };
    loadData();
  }, []);

  // 从 localStorage 加载临时历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistory) {
      try {
        setHistoryList(JSON.parse(savedHistory));
      } catch {
        // 忽略解析错误
      }
    }
  }, []);

  // 临时历史记录保存在 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyList));
  }, [historyList]);

  // 保存输入状态
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WORKLOAD_INPUT, workloadInput);
  }, [workloadInput]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_QUALITY_INPUT, qualityInput);
  }, [qualityInput]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILTER_GROUP, filterGroup);
  }, [filterGroup]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILTER_TYPE, filterType);
  }, [filterType]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SESSION_INPUT, sessionInput);
  }, [sessionInput]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FIRST_RESPONSE_INPUT, firstResponseInput);
  }, [firstResponseInput]);


  // ==================== 智能列识别工具函数 ====================

  const findColumnIndex = useCallback((headers: string[], keywords: string[]): number => {
    // 第一阶段：精确匹配
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].trim();
      for (const keyword of keywords) {
        if (header === keyword.trim()) {
          return i;
        }
      }
    }
    
    // 第二阶段：模糊匹配，排除特定干扰项
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();
      for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase().trim();
        if (lowerKeyword === '满意' && header.includes('相对满意度')) {
          continue;
        }
        if (header.includes(lowerKeyword)) {
          return i;
        }
      }
    }
    return -1;
  }, []);

  // ==================== 数据分析功能 ====================

  const parseWorkloadData = useCallback((input: string): { data: WorkloadData[]; dateRange: string } => {
    const lines = input.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { data: [], dateRange: '' };

    const headers = lines[0].split('\t').map(h => h.trim());

    const nameIndex = findColumnIndex(headers, ['姓名', '名字']);
    const groupIndex = findColumnIndex(headers, ['组别', '组', '分组']);
    const typeIndex = findColumnIndex(headers, ['客服类型', '类型']);
    const validSessionsIndex = findColumnIndex(headers, ['有效会话量', '有效会话']);

    if (nameIndex === -1 || validSessionsIndex === -1) {
      toast.error('工作量报表格式不正确，未找到"姓名"或"有效会话量"列');
      return { data: [], dateRange: '' };
    }

    let dateRange = '';
    if (lines.length > 1) {
      const firstDataRow = lines[1].split('\t');
      const startTime = firstDataRow[0]?.trim() || '';
      const endTime = firstDataRow[1]?.trim() || '';
      if (startTime && endTime) {
        const startDate = startTime.split(' ')[0];
        const endDate = endTime.split(' ')[0];
        dateRange = `${startDate}-${endDate}`;
      }
    }

    const data: WorkloadData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length <= Math.max(nameIndex, validSessionsIndex)) continue;

      const name = parts[nameIndex]?.trim();
      const validSessions = parseInt(parts[validSessionsIndex]) || 0;

      if (!name || name === '总计' || name === '--' || validSessions === 0) continue;

      const staffConfig = getStaffByName(name);

      let group = staffConfig?.group || (groupIndex !== -1 ? parts[groupIndex]?.trim() : '') || 'A组';
      const groupUpper = group.toUpperCase();
      if (groupUpper === 'A' || groupUpper.includes('A组') || groupUpper.includes('一组') || groupUpper.includes('A ')) {
        group = 'A组';
      } else if (groupUpper === 'B' || groupUpper.includes('B组') || groupUpper.includes('二组') || groupUpper.includes('B ')) {
        group = 'B组';
      } else if (group !== 'A组' && group !== 'B组') {
        group = 'A组';
      }

      data.push({
        name,
        group,
        type: staffConfig?.type || (typeIndex !== -1 ? parts[typeIndex]?.trim() : '') || '基础',
        validSessions,
      });
    }

    return { data, dateRange };
  }, [findColumnIndex, getStaffByName]);

  const parseQualityData = useCallback((input: string): QualityData[] => {
    const lines = input.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split('\t').map(h => h.trim());

    const nameIndex = findColumnIndex(headers, ['姓名', '名字']);
    const satisfiedIndex = findColumnIndex(headers, ['满意(三级)', '满意']);
    const neutralIndex = findColumnIndex(headers, ['一般(三级)', '一般']);
    const dissatisfiedIndex = findColumnIndex(headers, ['不满意(三级)', '不满意']);
    const avgResponseTimeIndex = findColumnIndex(headers, ['平均响应时间', '响应时间']);
    const responseRate60sIndex = findColumnIndex(headers, ['60s应答率', '60秒应答率', '60s']);

    if (nameIndex === -1) {
      toast.error('质量报表格式不正确，未找到"姓名"列');
      return [];
    }

    const data: QualityData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length <= nameIndex) continue;

      const name = parts[nameIndex]?.trim();
      if (!name || name === '总计' || name === '--') continue;

      data.push({
        name,
        satisfied: satisfiedIndex !== -1 ? (parseInt(parts[satisfiedIndex]) || 0) : 0,
        neutral: neutralIndex !== -1 ? (parseInt(parts[neutralIndex]) || 0) : 0,
        dissatisfied: dissatisfiedIndex !== -1 ? (parseInt(parts[dissatisfiedIndex]) || 0) : 0,
        avgResponseTime: avgResponseTimeIndex !== -1 ? (parseFloat(parts[avgResponseTimeIndex]) || 0) : 0,
        responseRate60s: responseRate60sIndex !== -1 ? (parseFloat(parts[responseRate60sIndex]) || 0) : 0,
      });
    }

    return data;
  }, [findColumnIndex]);

  // 解析首响60秒应答率数据
  const parseFirstResponseData = useCallback((input: string): FirstResponseData[] => {
    const lines = input.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split('\t').map(h => h.trim());

    const agentIndex = findColumnIndex(headers, ['接待客服', '客服']);
    const responseTimeIndex = findColumnIndex(headers, ['客服首次响应时长', '首次响应时长', '首响时间', '响应时长']);

    if (agentIndex === -1) {
      toast.error('首响数据格式不正确，未找到"接待客服"列');
      return [];
    }
    if (responseTimeIndex === -1) {
      toast.error('首响数据格式不正确，未找到"客服首次响应时长"列');
      return [];
    }

    // 将 HH:MM:SS 转换为秒数
    const timeToSeconds = (timeStr: string): number => {
      const parts = timeStr.trim().split(':');
      if (parts.length === 3) {
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        const s = parseInt(parts[2]) || 0;
        return h * 3600 + m * 60 + s;
      }
      if (parts.length === 2) {
        const m = parseInt(parts[0]) || 0;
        const s = parseInt(parts[1]) || 0;
        return m * 60 + s;
      }
      // 纯数字，直接作为秒数
      const num = parseFloat(timeStr);
      return isNaN(num) ? 0 : num;
    };

    // 按接待客服分组统计
    const agentMap = new Map<string, { total: number; within60s: number }>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length <= Math.max(agentIndex, responseTimeIndex)) continue;

      const name = parts[agentIndex]?.trim();
      if (!name || name === '总计' || name === '--') continue;

      const responseTimeStr = parts[responseTimeIndex]?.trim() || '00:00:00';
      const seconds = timeToSeconds(responseTimeStr);

      if (!agentMap.has(name)) {
        agentMap.set(name, { total: 0, within60s: 0 });
      }
      const agent = agentMap.get(name)!;
      agent.total++;
      if (seconds <= 60) {
        agent.within60s++;
      }
    }

    const data: FirstResponseData[] = [];
    agentMap.forEach((stats, name) => {
      data.push({
        name,
        firstResponseRate60s: stats.total > 0 ? (stats.within60s / stats.total) * 100 : 0,
        totalSessions: stats.total,
        within60s: stats.within60s,
      });
    });

    return data;
  }, [findColumnIndex]);

  // 解析会话明细报表（新格式，与TOP数据分析同源）
  const parseSessionData = useCallback((input: string): { data: EmployeeQuality[]; dateRange: string } => {
    const lines = input.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { data: [], dateRange: '' };

    const headers = lines[0].split('\t').map(h => h.trim());

    const agentIndex = findColumnIndex(headers, ['接待客服', '客服']);
    const satisfactionIndex = findColumnIndex(headers, ['满意度']);
    const timeIndex = findColumnIndex(headers, ['会话开始时间', '开始时间']);
    const groupIndex = findColumnIndex(headers, ['分流客服组', '客服组']);
    const responseTimeIndex = findColumnIndex(headers, ['客服首次响应时长', '首次响应时长', '首响时间', '响应时长']);
    const inviteIndex = findColumnIndex(headers, ['客服是否邀评', '是否邀评']);

    if (agentIndex === -1) {
      toast.error('会话明细报表格式不正确，未找到"接待客服"列');
      return { data: [], dateRange: '' };
    }
    if (satisfactionIndex === -1) {
      toast.error('会话明细报表格式不正确，未找到"满意度"列');
      return { data: [], dateRange: '' };
    }

    // 将 HH:MM:SS 转换为秒数
    const timeToSeconds = (timeStr: string): number => {
      const parts = timeStr.trim().split(':');
      if (parts.length === 3) {
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        const s = parseInt(parts[2]) || 0;
        return h * 3600 + m * 60 + s;
      }
      if (parts.length === 2) {
        const m = parseInt(parts[0]) || 0;
        const s = parseInt(parts[1]) || 0;
        return m * 60 + s;
      }
      const num = parseFloat(timeStr);
      return isNaN(num) ? 0 : num;
    };

    // 按接待客服分组统计
    const agentMap = new Map<string, {
      validSessions: number;
      satisfied: number;
      neutral: number;
      dissatisfied: number;
      group: string;
      within60s: number;
      inviteCount: number;
    }>();

    let minDate = '';
    let maxDate = '';

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length <= Math.max(agentIndex, satisfactionIndex)) continue;

      const name = parts[agentIndex]?.trim();
      if (!name || name === '总计' || name === '--') continue;

      const satisfaction = parts[satisfactionIndex]?.trim() || '';
      const groupRaw = groupIndex !== -1 ? parts[groupIndex]?.trim() || '' : '';

      // 统计首响60秒（"--"或空值算未达标，计入分母不计分子）
      let within60s = false;
      if (responseTimeIndex !== -1) {
        const responseTimeStr = parts[responseTimeIndex]?.trim();
        if (responseTimeStr && responseTimeStr !== '--') {
          const seconds = timeToSeconds(responseTimeStr);
          if (seconds <= 60) within60s = true;
        }
      }

      // 统计邀评
      const invited = inviteIndex !== -1 ? (parts[inviteIndex]?.trim() === '是') : false;

      // 统计日期范围
      if (timeIndex !== -1) {
        const time = parts[timeIndex]?.trim() || '';
        const datePart = time.split(' ')[0];
        if (datePart) {
          if (!minDate || datePart < minDate) minDate = datePart;
          if (!maxDate || datePart > maxDate) maxDate = datePart;
        }
      }

      if (!agentMap.has(name)) {
        agentMap.set(name, { validSessions: 0, satisfied: 0, neutral: 0, dissatisfied: 0, group: groupRaw, within60s: 0, inviteCount: 0 });
      }
      const agent = agentMap.get(name)!;
      agent.validSessions++;

      if (within60s) agent.within60s++;

      if (invited) agent.inviteCount++;

      if (satisfaction === '满意') {
        agent.satisfied++;
      } else if (satisfaction === '一般') {
        agent.neutral++;
      } else if (satisfaction === '不满意') {
        agent.dissatisfied++;
      }
    }

    const dateRange = (minDate && maxDate) ? `${minDate}-${maxDate}` : '';

    // 转换为 EmployeeQuality
    const data: EmployeeQuality[] = [];
    agentMap.forEach((stats, name) => {
      const staffConfig = getStaffByName(name);

      let group: 'A组' | 'B组' = 'A组';
      const staffGroup = staffConfig?.group || stats.group;
      const groupUpper = staffGroup.toUpperCase();
      if (groupUpper === 'B' || groupUpper.includes('B组') || groupUpper.includes('二组') || groupUpper.includes('B ')) {
        group = 'B组';
      }

      const validSessions = stats.validSessions || 1;
      const inviteCount = stats.inviteCount;
      const inviteRate = (inviteCount / validSessions) * 100;
      const inviteSatisfactionRatio = inviteCount > 0 ? stats.satisfied / inviteCount : 0;
      const firstResponseRate60s = responseTimeIndex !== -1 ? (stats.within60s / validSessions) * 100 : 0;

      data.push({
        id: `eq_${Date.now()}_${Math.random()}`,
        name,
        group,
        type: staffConfig?.type || '基础',
        validSessions: stats.validSessions,
        satisfied: stats.satisfied,
        neutral: stats.neutral,
        dissatisfied: stats.dissatisfied,
        satisfactionRate: (stats.satisfied / validSessions) * 100,
        neutralRate: (stats.neutral / validSessions) * 100,
        dissatisfiedRate: (stats.dissatisfied / validSessions) * 100,
        avgResponseTime: 0,
        responseRate60s: 0,
        firstResponseRate60s,
        inviteCount,
        inviteRate,
        inviteSatisfactionRatio,
        dateRange,
      });
    });

    return { data, dateRange };
  }, [findColumnIndex, getStaffByName]);

  const handleProcessData = useCallback(() => {
    const useNewFormat = analysisFormat === 'new';

    if (useNewFormat && !sessionInput.trim()) {
      toast.error('请粘贴会话明细报表');
      return;
    }
    if (!useNewFormat && (!workloadInput.trim() || !qualityInput.trim())) {
      toast.error('请同时粘贴工作量报表和工作质量报表');
      return;
    }

    let mergedData: EmployeeQuality[] = [];
    let dateRange = '';

    // 解析首响数据（两种格式通用）
    const firstResponseData = firstResponseInput.trim() ? parseFirstResponseData(firstResponseInput) : [];

    if (useNewFormat) {
      const result = parseSessionData(sessionInput);
      if (result.data.length === 0) {
        toast.error('会话明细报表解析失败，请检查格式');
        return;
      }
      mergedData = result.data;
      dateRange = result.dateRange;
      // 合并首响数据
      if (firstResponseData.length > 0) {
        mergedData.forEach(item => {
          const fr = firstResponseData.find(f => f.name === item.name);
          if (fr) {
            item.firstResponseRate60s = fr.firstResponseRate60s;
          }
        });
      }
    } else {
      const { data: workloadData, dateRange: wlDateRange } = parseWorkloadData(workloadInput);
      const qualityData = parseQualityData(qualityInput);

      if (workloadData.length === 0 || qualityData.length === 0) {
        toast.error('数据解析失败，请检查格式');
        return;
      }

      workloadData.forEach(workload => {
        const quality = qualityData.find(q => q.name === workload.name);
        if (quality) {
          const validSessions = workload.validSessions || 1;
          const fr = firstResponseData.find(f => f.name === workload.name);
          mergedData.push({
            id: `eq_${Date.now()}_${Math.random()}`,
            name: workload.name,
            group: (workload.group as 'A组' | 'B组') || 'A组',
            type: (workload.type as '基础' | 'VIP' | '组长') || '基础',
            validSessions: workload.validSessions,
            satisfied: quality.satisfied,
            neutral: quality.neutral,
            dissatisfied: quality.dissatisfied,
            satisfactionRate: (quality.satisfied / validSessions) * 100,
            neutralRate: (quality.neutral / validSessions) * 100,
            dissatisfiedRate: (quality.dissatisfied / validSessions) * 100,
            avgResponseTime: quality.avgResponseTime,
            responseRate60s: quality.responseRate60s,
            firstResponseRate60s: fr?.firstResponseRate60s || 0,
            inviteCount: 0,
            inviteRate: 0,
            inviteSatisfactionRatio: 0,
            dateRange: wlDateRange,
          });
        }
      });
      dateRange = wlDateRange;
    }

    // 检测未登记人员并提醒
    const staffNames = new Set(staffList.map(s => s.name));
    const unregistered = mergedData.filter(d => !staffNames.has(d.name)).map(d => d.name);
    if (unregistered.length > 0) {
      setTimeout(() => {
        toast.warning(`发现未登记人员：${unregistered.join('、')}，请去人员管理添加`);
      }, 600);
    }

    setAnalysisResult(mergedData);
    setSortConfig({ key: 'satisfactionRate', direction: 'desc' });
    toast.success(`成功处理 ${mergedData.length} 条数据`);

    const newHistory: QualityHistory = {
      id: Date.now().toString(),
      dateRange: dateRange || new Date().toLocaleDateString(),
      timestamp: Date.now(),
      note: `${mergedData.length}条记录`,
      data: mergedData,
    };

    setHistoryList(prev => {
      const updated = [newHistory, ...prev].slice(0, MAX_HISTORY);
      return updated;
    });
  }, [workloadInput, qualityInput, sessionInput, firstResponseInput, analysisFormat, parseWorkloadData, parseQualityData, parseSessionData, parseFirstResponseData, staffList]);

  const filteredResult = useMemo(() => {
    return analysisResult.filter(e => {
      if (filterGroup !== 'all' && e.group !== filterGroup) return false;
      if (filterType !== 'all' && e.type !== filterType) return false;
      return true;
    });
  }, [analysisResult, filterGroup, filterType]);

  const sortedResult = useMemo(() => {
    if (!sortConfig.key) return filteredResult;
    return [...filteredResult].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredResult, sortConfig]);

  const groupStats = useMemo(() => {
    const stats: Record<string, { sessions: number; satisfied: number; neutral: number; dissatisfied: number; count: number }> = {};
    filteredResult.forEach(e => {
      const group = e.group || '未分组';
      if (!stats[group]) {
        stats[group] = { sessions: 0, satisfied: 0, neutral: 0, dissatisfied: 0, count: 0 };
      }
      stats[group].count++;
      stats[group].sessions += e.validSessions;
      stats[group].satisfied += e.satisfied;
      stats[group].neutral += e.neutral;
      stats[group].dissatisfied += e.dissatisfied;
    });
    return stats;
  }, [filteredResult]);

  const handleSort = (key: keyof EmployeeQuality) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const stats = useMemo(() => {
    const total = filteredResult.length;
    const totalSessions = filteredResult.reduce((sum, e) => sum + e.validSessions, 0);
    const totalSatisfied = filteredResult.reduce((sum, e) => sum + e.satisfied, 0);
    const totalNeutral = filteredResult.reduce((sum, e) => sum + e.neutral, 0);
    const totalDissatisfied = filteredResult.reduce((sum, e) => sum + e.dissatisfied, 0);

    const avgSatisfactionRate = totalSessions > 0 ? (totalSatisfied / totalSessions) * 100 : 0;
    const avgNeutralRate = totalSessions > 0 ? (totalNeutral / totalSessions) * 100 : 0;
    const avgDissatisfiedRate = totalSessions > 0 ? (totalDissatisfied / totalSessions) * 100 : 0;

    const vipSorted = filteredResult
      .filter(e => e.type === 'VIP')
      .sort((a, b) => b.satisfactionRate - a.satisfactionRate);
    const vipMVP = vipSorted[0] || null;
    const vipSecond = vipSorted[1] || null;
    const vipThird = vipSorted[2] || null;

    const basicSorted = filteredResult
      .filter(e => e.type === '基础')
      .sort((a, b) => b.satisfactionRate - a.satisfactionRate);
    const basicMVP = basicSorted[0] || null;
    const basicSecond = basicSorted[1] || null;
    const basicThird = basicSorted[2] || null;

    return {
      total,
      totalSessions,
      totalSatisfied,
      totalNeutral,
      totalDissatisfied,
      avgSatisfactionRate,
      avgNeutralRate,
      avgDissatisfiedRate,
      vipMVP,
      vipSecond,
      vipThird,
      basicMVP,
      basicSecond,
      basicThird,
    };
  }, [filteredResult]);

  const handleClearAll = useCallback(() => {
    setWorkloadInput('');
    setQualityInput('');
    setSessionInput('');
    setFirstResponseInput('');
    setAnalysisResult([]);
    setFilterGroup('all');
    setFilterType('all');
    setSortConfig({ key: null, direction: 'desc' });

    localStorage.removeItem(STORAGE_KEY_WORKLOAD_INPUT);
    localStorage.removeItem(STORAGE_KEY_QUALITY_INPUT);
    localStorage.removeItem(STORAGE_KEY_SESSION_INPUT);
    localStorage.removeItem(STORAGE_KEY_FIRST_RESPONSE_INPUT);
    localStorage.removeItem(STORAGE_KEY_FILTER_GROUP);
    localStorage.removeItem(STORAGE_KEY_FILTER_TYPE);

    toast.info('已清空所有数据');
  }, []);

  const handleCopyResult = useCallback(() => {
    if (sortedResult.length === 0) {
      toast.error('没有数据可复制');
      return;
    }

    const dateRange = sortedResult[0]?.dateRange || '未知日期范围';
    
    const localGroupStats: Record<string, { sessions: number; satisfied: number; neutral: number; dissatisfied: number; count: number }> = {};
    
    sortedResult.forEach(e => {
      const group = e.group || '未分组';
      if (!localGroupStats[group]) {
        localGroupStats[group] = { sessions: 0, satisfied: 0, neutral: 0, dissatisfied: 0, count: 0 };
      }
      localGroupStats[group].count++;
      localGroupStats[group].sessions += e.validSessions;
      localGroupStats[group].satisfied += e.satisfied;
      localGroupStats[group].neutral += e.neutral;
      localGroupStats[group].dissatisfied += e.dissatisfied;
    });

    const totalSessions = sortedResult.reduce((sum, e) => sum + e.validSessions, 0);
    const totalSatisfied = sortedResult.reduce((sum, e) => sum + e.satisfied, 0);
    const totalNeutral = sortedResult.reduce((sum, e) => sum + e.neutral, 0);
    const totalDissatisfied = sortedResult.reduce((sum, e) => sum + e.dissatisfied, 0);

    const lines: string[] = [];
    lines.push('日期范围\t客服类型\t组别\t姓名\t有效会话量\t满意\t一般\t不满意\t满意率\t一般率\t不满意率\t首响60秒应答率');

    sortedResult.forEach(e => {
      lines.push(`${dateRange}\t${e.type}\t${e.group}\t${e.name}\t${e.validSessions}\t${e.satisfied}\t${e.neutral}\t${e.dissatisfied}\t${e.satisfactionRate.toFixed(2)}%\t${e.neutralRate.toFixed(2)}%\t${e.dissatisfiedRate.toFixed(2)}%\t${e.firstResponseRate60s.toFixed(2)}%`);
    });

    const groupLeaderMap: Record<string, string> = { 'A组': '裘崇伟', 'B组': '孙泽沁' };
    ['A组', 'B组'].forEach(group => {
      const s = localGroupStats[group];
      if (s && s.count > 0) {
        const satRate = (s.satisfied / s.sessions * 100);
        const neuRate = (s.neutral / s.sessions * 100);
        const disRate = (s.dissatisfied / s.sessions * 100);
        const groupFirstResponse = sortedResult.filter(e => e.group === group && e.firstResponseRate60s > 0);
        const groupFirstResponseRate = groupFirstResponse.length > 0
          ? groupFirstResponse.reduce((sum, e) => sum + e.firstResponseRate60s * e.validSessions, 0) / (groupFirstResponse.reduce((sum, e) => sum + e.validSessions, 0) || 1)
          : 0;
        const leaderName = groupLeaderMap[group] || '';
        lines.push(`${dateRange}\t组长\t${group}\t${leaderName}\t${s.sessions}\t${s.satisfied}\t${s.neutral}\t${s.dissatisfied}\t${satRate.toFixed(2)}%\t${neuRate.toFixed(2)}%\t${disRate.toFixed(2)}%\t${groupFirstResponseRate.toFixed(2)}%`);
      }
    });

    const totalSatRate = totalSessions > 0 ? (totalSatisfied / totalSessions * 100) : 0;
    const totalNeuRate = totalSessions > 0 ? (totalNeutral / totalSessions * 100) : 0;
    const totalDisRate = totalSessions > 0 ? (totalDissatisfied / totalSessions * 100) : 0;
    const allWithFirstResponse = sortedResult.filter(e => e.firstResponseRate60s > 0);
    const totalFirstResponseRate = allWithFirstResponse.length > 0
      ? allWithFirstResponse.reduce((sum, e) => sum + e.firstResponseRate60s * e.validSessions, 0) / (allWithFirstResponse.reduce((sum, e) => sum + e.validSessions, 0) || 1)
      : 0;
    lines.push(`${dateRange}\t统计\t总计\t\t${totalSessions}\t${totalSatisfied}\t${totalNeutral}\t${totalDissatisfied}\t${totalSatRate.toFixed(2)}%\t${totalNeuRate.toFixed(2)}%\t${totalDisRate.toFixed(2)}%\t${totalFirstResponseRate.toFixed(2)}%`);

    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('已复制到剪贴板');
  }, [sortedResult]);

  const handleExportResult = useCallback(() => {
    if (sortedResult.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const dateRange = sortedResult[0]?.dateRange || '未知日期范围';
    
    const localGroupStats: Record<string, { sessions: number; satisfied: number; neutral: number; dissatisfied: number; count: number; inviteCount: number }> = {};
    
    sortedResult.forEach(e => {
      const group = e.group || '未分组';
      if (!localGroupStats[group]) {
        localGroupStats[group] = { sessions: 0, satisfied: 0, neutral: 0, dissatisfied: 0, count: 0, inviteCount: 0 };
      }
      localGroupStats[group].count++;
      localGroupStats[group].sessions += e.validSessions;
      localGroupStats[group].satisfied += e.satisfied;
      localGroupStats[group].neutral += e.neutral;
      localGroupStats[group].dissatisfied += e.dissatisfied;
      localGroupStats[group].inviteCount += e.inviteCount ?? 0;
    });

    const totalSessions = sortedResult.reduce((sum, e) => sum + e.validSessions, 0);
    const totalSatisfied = sortedResult.reduce((sum, e) => sum + e.satisfied, 0);
    const totalNeutral = sortedResult.reduce((sum, e) => sum + e.neutral, 0);
    const totalDissatisfied = sortedResult.reduce((sum, e) => sum + e.dissatisfied, 0);
    const totalInviteCount = sortedResult.reduce((sum, e) => sum + (e.inviteCount ?? 0), 0);

    const lines: string[] = [];
    lines.push('日期范围\t客服类型\t组别\t姓名\t有效会话量\t满意\t一般\t不满意\t满意率\t一般率\t不满意率\t首响60秒应答率\t主动邀评数\t主动邀评率\t邀评满意转化比');

    sortedResult.forEach(e => {
      const invSatRatio = (e.inviteCount ?? 0) > 0 ? (e.inviteSatisfactionRatio ?? 0).toFixed(2) : '-';
      lines.push(`${dateRange}\t${e.type}\t${e.group}\t${e.name}\t${e.validSessions}\t${e.satisfied}\t${e.neutral}\t${e.dissatisfied}\t${e.satisfactionRate.toFixed(2)}%\t${e.neutralRate.toFixed(2)}%\t${e.dissatisfiedRate.toFixed(2)}%\t${e.firstResponseRate60s.toFixed(2)}%\t${e.inviteCount ?? 0}\t${(e.inviteRate ?? 0).toFixed(2)}%\t${invSatRatio}`);
    });

    const groupLeaderMap: Record<string, string> = { 'A组': '裘崇伟', 'B组': '孙泽沁' };
    ['A组', 'B组'].forEach(group => {
      const s = localGroupStats[group];
      if (s && s.count > 0) {
        const satRate = (s.satisfied / s.sessions * 100);
        const neuRate = (s.neutral / s.sessions * 100);
        const disRate = (s.dissatisfied / s.sessions * 100);
        const groupFirstResponse = sortedResult.filter(e => e.group === group && e.firstResponseRate60s > 0);
        const groupFirstResponseRate = groupFirstResponse.length > 0
          ? groupFirstResponse.reduce((sum, e) => sum + e.firstResponseRate60s * e.validSessions, 0) / (groupFirstResponse.reduce((sum, e) => sum + e.validSessions, 0) || 1)
          : 0;
        const groupInviteRate = s.sessions > 0 ? (s.inviteCount / s.sessions * 100) : 0;
        const groupInvSatRatio = s.inviteCount > 0 ? (s.satisfied / s.inviteCount).toFixed(2) : '-';
        const leaderName = groupLeaderMap[group] || '';
        lines.push(`${dateRange}\t组长\t${group}\t${leaderName}\t${s.sessions}\t${s.satisfied}\t${s.neutral}\t${s.dissatisfied}\t${satRate.toFixed(2)}%\t${neuRate.toFixed(2)}%\t${disRate.toFixed(2)}%\t${groupFirstResponseRate.toFixed(2)}%\t${s.inviteCount}\t${groupInviteRate.toFixed(2)}%\t${groupInvSatRatio}`);
      }
    });

    const totalSatRate = totalSessions > 0 ? (totalSatisfied / totalSessions * 100) : 0;
    const totalNeuRate = totalSessions > 0 ? (totalNeutral / totalSessions * 100) : 0;
    const totalDisRate = totalSessions > 0 ? (totalDissatisfied / totalSessions * 100) : 0;
    const allWithFirstResponse = sortedResult.filter(e => e.firstResponseRate60s > 0);
    const totalFirstResponseRate = allWithFirstResponse.length > 0
      ? allWithFirstResponse.reduce((sum, e) => sum + e.firstResponseRate60s * e.validSessions, 0) / (allWithFirstResponse.reduce((sum, e) => sum + e.validSessions, 0) || 1)
      : 0;
    const totalInviteRate = totalSessions > 0 ? (totalInviteCount / totalSessions * 100) : 0;
    const totalInvSatRatio = totalInviteCount > 0 ? (totalSatisfied / totalInviteCount).toFixed(2) : '-';
    lines.push(`${dateRange}\t统计\t总计\t\t${totalSessions}\t${totalSatisfied}\t${totalNeutral}\t${totalDissatisfied}\t${totalSatRate.toFixed(2)}%\t${totalNeuRate.toFixed(2)}%\t${totalDisRate.toFixed(2)}%\t${totalFirstResponseRate.toFixed(2)}%\t${totalInviteCount}\t${totalInviteRate.toFixed(2)}%\t${totalInvSatRatio}`);

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileDate = dateRange.replace(/[\/\s~:-]/g, '_');
    link.download = `客服质量分析_${fileDate}.txt`;
    link.click();
    toast.success('导出成功');
  }, [sortedResult]);

  const comparisonMetrics = useMemo(() => {
    if (!comparisonResult) return null;

    const filterData = (data: EmployeeQuality[]) => data.filter(e => {
      if (comparisonFilterGroup !== 'all' && e.group !== comparisonFilterGroup) return false;
      if (comparisonFilterType !== 'all' && e.type !== comparisonFilterType) return false;
      return true;
    });

    const lastWeekData = filterData(comparisonResult.lastWeek || []);
    const thisWeekData = filterData(comparisonResult.thisWeek || []);

    const lastTotalSessions = lastWeekData.reduce((sum, e) => sum + e.validSessions, 0);
    const thisTotalSessions = thisWeekData.reduce((sum, e) => sum + e.validSessions, 0);

    const lastTotalSatisfied = lastWeekData.reduce((sum, e) => sum + e.satisfied, 0);
    const thisTotalSatisfied = thisWeekData.reduce((sum, e) => sum + e.satisfied, 0);

    const lastTotalDissatisfied = lastWeekData.reduce((sum, e) => sum + e.dissatisfied, 0);
    const thisTotalDissatisfied = thisWeekData.reduce((sum, e) => sum + e.dissatisfied, 0);

    const lastAvgResponse = lastWeekData.length > 0
      ? lastWeekData.reduce((sum, e) => sum + e.avgResponseTime, 0) / lastWeekData.length
      : 0;
    const thisAvgResponse = thisWeekData.length > 0
      ? thisWeekData.reduce((sum, e) => sum + e.avgResponseTime, 0) / thisWeekData.length
      : 0;

    const lastAvgResponse60s = lastWeekData.length > 0
      ? lastWeekData.reduce((sum, e) => sum + e.responseRate60s * e.validSessions, 0) / (lastWeekData.reduce((sum, e) => sum + e.validSessions, 0) || 1)
      : 0;
    const thisAvgResponse60s = thisWeekData.length > 0
      ? thisWeekData.reduce((sum, e) => sum + e.responseRate60s * e.validSessions, 0) / (thisWeekData.reduce((sum, e) => sum + e.validSessions, 0) || 1)
      : 0;

    const lastAvgFirstResponse60s = lastWeekData.length > 0
      ? lastWeekData.reduce((sum, e) => sum + e.firstResponseRate60s * e.validSessions, 0) / (lastWeekData.reduce((sum, e) => sum + e.validSessions, 0) || 1)
      : 0;
    const thisAvgFirstResponse60s = thisWeekData.length > 0
      ? thisWeekData.reduce((sum, e) => sum + e.firstResponseRate60s * e.validSessions, 0) / (thisWeekData.reduce((sum, e) => sum + e.validSessions, 0) || 1)
      : 0;

    const calcChange = (current: number, last: number) => {
      if (last === 0) return current > 0 ? 100 : 0;
      return ((current - last) / last) * 100;
    };

    return {
      problemCount: {
        current: thisTotalSessions,
        last: lastTotalSessions,
        change: calcChange(thisTotalSessions, lastTotalSessions),
      },
      satisfactionRate: {
        current: thisTotalSessions > 0 ? (thisTotalSatisfied / thisTotalSessions) * 100 : 0,
        last: lastTotalSessions > 0 ? (lastTotalSatisfied / lastTotalSessions) * 100 : 0,
        change: calcChange(
          thisTotalSessions > 0 ? (thisTotalSatisfied / thisTotalSessions) : 0,
          lastTotalSessions > 0 ? (lastTotalSatisfied / lastTotalSessions) : 0
        ),
      },
      badReviewCount: {
        current: thisTotalDissatisfied,
        last: lastTotalDissatisfied,
        change: calcChange(thisTotalDissatisfied, lastTotalDissatisfied),
      },
      avgResponseTime: {
        current: thisAvgResponse,
        last: lastAvgResponse,
        change: calcChange(thisAvgResponse, lastAvgResponse),
      },
      responseRate60s: {
        current: thisAvgResponse60s,
        last: lastAvgResponse60s,
        change: calcChange(thisAvgResponse60s, lastAvgResponse60s),
      },
      firstResponseRate60s: {
        current: thisAvgFirstResponse60s,
        last: lastAvgFirstResponse60s,
        change: calcChange(thisAvgFirstResponse60s, lastAvgFirstResponse60s),
      },
    };
  }, [comparisonResult, comparisonFilterGroup, comparisonFilterType]);

  const employeeComparisonData = useMemo((): EmployeeComparison[] => {
    if (!comparisonResult) return [];

    const allNames = new Set([
      ...(comparisonResult.lastWeek || []).map(e => e.name),
      ...(comparisonResult.thisWeek || []).map(e => e.name),
    ]);

    const calcChange = (current: number, last: number): number => {
      if (last === 0) return current > 0 ? 100 : 0;
      return ((current - last) / last) * 100;
    };

    const calcSatisfactionRate = (satisfied: number, total: number): number => {
      return total > 0 ? (satisfied / total) * 100 : 0;
    };

    return Array.from(allNames)
      .map(name => {
        const lastWeek = (comparisonResult.lastWeek || []).find(e => e.name === name);
        const thisWeek = (comparisonResult.thisWeek || []).find(e => e.name === name);

        if (!lastWeek && !thisWeek) return null;

        const employee = thisWeek || lastWeek!;

        const lastSessions = lastWeek?.validSessions || 0;
        const thisSessions = thisWeek?.validSessions || 0;

        const lastSatisfied = lastWeek?.satisfied || 0;
        const thisSatisfied = thisWeek?.satisfied || 0;

        const lastDissatisfied = lastWeek?.dissatisfied || 0;
        const thisDissatisfied = thisWeek?.dissatisfied || 0;

        const lastSatisfactionRate = calcSatisfactionRate(lastSatisfied, lastSessions);
        const thisSatisfactionRate = calcSatisfactionRate(thisSatisfied, thisSessions);

        const lastAvgResponse = lastWeek?.avgResponseTime || 0;
        const thisAvgResponse = thisWeek?.avgResponseTime || 0;

        const lastResponse60s = lastWeek?.responseRate60s || 0;
        const thisResponse60s = thisWeek?.responseRate60s || 0;

        const lastFirstResponse60s = lastWeek?.firstResponseRate60s || 0;
        const thisFirstResponse60s = thisWeek?.firstResponseRate60s || 0;

        return {
          name,
          group: employee.group,
          type: employee.type,
          metrics: {
            validSessions: {
              last: lastSessions,
              this: thisSessions,
              change: calcChange(thisSessions, lastSessions),
            },
            satisfactionRate: {
              last: lastSatisfactionRate,
              this: thisSatisfactionRate,
              change: calcChange(thisSatisfactionRate, lastSatisfactionRate),
            },
            dissatisfied: {
              last: lastDissatisfied,
              this: thisDissatisfied,
              change: calcChange(thisDissatisfied, lastDissatisfied),
            },
            avgResponseTime: {
              last: lastAvgResponse,
              this: thisAvgResponse,
              change: calcChange(thisAvgResponse, lastAvgResponse),
            },
            responseRate60s: {
              last: lastResponse60s,
              this: thisResponse60s,
              change: calcChange(thisResponse60s, lastResponse60s),
            },
            firstResponseRate60s: {
              last: lastFirstResponse60s,
              this: thisFirstResponse60s,
              change: calcChange(thisFirstResponse60s, lastFirstResponse60s),
            },
          },
        };
      })
      .filter((e): e is EmployeeComparison => {
        if (!e) return false;
        if (comparisonFilterGroup !== 'all' && e.group !== comparisonFilterGroup) return false;
        if (comparisonFilterType !== 'all' && e.type !== comparisonFilterType) return false;
        return true;
      })
      .sort((a, b) => {
      if (a.type === 'VIP' && b.type !== 'VIP') return -1;
      if (a.type !== 'VIP' && b.type === 'VIP') return 1;
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }, [comparisonResult, comparisonFilterGroup, comparisonFilterType]);

  const handleCopyComparison = useCallback(() => {
    if (!comparisonMetrics) {
      toast.error('没有数据可复制');
      return;
    }

    const lines: string[] = [];

    const formatChange = (change: number) => {
      const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '';
      return `${Math.abs(change).toFixed(2)}%${arrow}`;
    };

    lines.push(`- 问题数：${comparisonMetrics.problemCount.current}，环比：${formatChange(comparisonMetrics.problemCount.change)}`);
    lines.push(`- 满意率：${comparisonMetrics.satisfactionRate.current.toFixed(2)}%，环比：${formatChange(comparisonMetrics.satisfactionRate.change)}`);
    lines.push(`- 差评数：${comparisonMetrics.badReviewCount.current}个，环比：${formatChange(comparisonMetrics.badReviewCount.change)}`);
    lines.push(`- 首响60秒应答率：${comparisonMetrics.firstResponseRate60s.current.toFixed(2)}%，环比：${formatChange(comparisonMetrics.firstResponseRate60s.change)}`);

    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('已复制到剪贴板');
  }, [comparisonMetrics, comparisonFilterGroup, comparisonFilterType]);

  const handleExecuteComparison = useCallback(() => {
    if (!comparisonConfig.targetA.name && !comparisonConfig.targetA.group) {
      toast.error('请选择对比对象 A');
      return;
    }
    if (!comparisonConfig.targetB.name && !comparisonConfig.targetB.group) {
      toast.error('请选择对比对象 B');
      return;
    }
    if (comparisonConfig.type === 'person' && comparisonConfig.targetA.name === comparisonConfig.targetB.name) {
      toast.error('不能选择同一人进行对比');
      return;
    }

    let targetAData: EmployeeQuality[] = [];
    let targetBData: EmployeeQuality[] = [];

    if (comparisonConfig.type === 'person') {
      targetAData = analysisResult.filter(e => e.name === comparisonConfig.targetA.name);
      targetBData = analysisResult.filter(e => e.name === comparisonConfig.targetB.name);
    } else {
      targetAData = analysisResult.filter(e => {
        if (comparisonConfig.targetA.group && comparisonConfig.targetA.group !== 'all' && e.group !== comparisonConfig.targetA.group) return false;
        if (comparisonConfig.targetA.type && comparisonConfig.targetA.type !== 'all' && e.type !== comparisonConfig.targetA.type) return false;
        return true;
      });
      targetBData = analysisResult.filter(e => {
        if (comparisonConfig.targetB.group && comparisonConfig.targetB.group !== 'all' && e.group !== comparisonConfig.targetB.group) return false;
        if (comparisonConfig.targetB.type && comparisonConfig.targetB.type !== 'all' && e.type !== comparisonConfig.targetB.type) return false;
        return true;
      });
    }

    if (targetAData.length === 0 || targetBData.length === 0) {
      toast.error('所选对象没有数据，请先分析数据');
      return;
    }

    const calcStats = (data: EmployeeQuality[]) => {
      const totalSessions = data.reduce((sum, e) => sum + e.validSessions, 0);
      const totalSatisfied = data.reduce((sum, e) => sum + e.satisfied, 0);
      const totalDissatisfied = data.reduce((sum, e) => sum + e.dissatisfied, 0);
      const totalResponseTime = data.reduce((sum, e) => sum + e.avgResponseTime * e.validSessions, 0);
      const totalResponse60s = data.reduce((sum, e) => sum + e.responseRate60s * e.validSessions, 0);
      const totalFirstResponse60s = data.reduce((sum, e) => sum + e.firstResponseRate60s * e.validSessions, 0);

      return {
        totalSessions,
        satisfactionRate: totalSessions > 0 ? (totalSatisfied / totalSessions) * 100 : 0,
        dissatisfied: totalDissatisfied,
        avgResponseTime: totalSessions > 0 ? totalResponseTime / totalSessions : 0,
        responseRate60s: totalSessions > 0 ? totalResponse60s / totalSessions : 0,
        firstResponseRate60s: totalSessions > 0 ? totalFirstResponse60s / totalSessions : 0,
      };
    };

    const statsA = calcStats(targetAData);
    const statsB = calcStats(targetBData);

    const result: ComparisonResult = {
      targetA: {
        name: comparisonConfig.type === 'person' 
          ? (comparisonConfig.targetA.name || '对象A')
          : `${comparisonConfig.targetA.group || '全部'}${comparisonConfig.targetA.type || '全部'}`,
        data: targetAData,
        stats: statsA,
      },
      targetB: {
        name: comparisonConfig.type === 'person'
          ? (comparisonConfig.targetB.name || '对象B')
          : `${comparisonConfig.targetB.group || '全部'}${comparisonConfig.targetB.type || '全部'}`,
        data: targetBData,
        stats: statsB,
      },
      diff: {
        sessionsDiff: statsB.totalSessions - statsA.totalSessions,
        satisfactionDiff: statsB.satisfactionRate - statsA.satisfactionRate,
        dissatisfiedDiff: statsB.dissatisfied - statsA.dissatisfied,
        responseTimeDiff: statsB.avgResponseTime - statsA.avgResponseTime,
        responseRateDiff: statsB.responseRate60s - statsA.responseRate60s,
        firstResponseRateDiff: statsB.firstResponseRate60s - statsA.firstResponseRate60s,
      },
    };

    setComparisonResult2(result);
    toast.success('对比完成');
  }, [analysisResult, comparisonConfig]);

  // ==================== 历史记录功能 ====================

  const handleLoadHistory = useCallback((history: QualityHistory) => {
    const normalizedData = history.data.map(e => ({
      ...e,
      inviteCount: e.inviteCount ?? 0,
      inviteRate: e.inviteRate ?? 0,
      inviteSatisfactionRatio: e.inviteSatisfactionRatio ?? 0,
    }));
    setAnalysisResult(normalizedData);
    setSortConfig({ key: 'satisfactionRate', direction: 'desc' });
    setActiveTab('analysis');
    toast.success(`已加载历史记录（${history.data.length}条）`);
  }, []);

  // 数据对比页 - 从历史记录加载数据（不跳转Tab）
  const handleLoadHistoryForComparison = useCallback((history: QualityHistory) => {
    const normalizedData = history.data.map(e => ({
      ...e,
      inviteCount: e.inviteCount ?? 0,
      inviteRate: e.inviteRate ?? 0,
      inviteSatisfactionRatio: e.inviteSatisfactionRatio ?? 0,
    }));
    setAnalysisResult(normalizedData);
    setComparisonDataSource({ label: history.dateRange, count: history.data.length, dateRange: history.dateRange });
    setComparisonConfig({ type: 'person', targetA: {}, targetB: {} });
    setComparisonResult2(null);
    setShowHistoryPicker(false);
    toast.success(`已加载历史数据（${history.data.length}条）`);
  }, []);

  // 数据对比页 - 同步当前分析结果
  const handleSyncAnalysisToComparison = useCallback(() => {
    if (analysisResult.length > 0) {
      const dateRange = analysisResult[0]?.dateRange;
      setComparisonDataSource({ label: dateRange || '当前分析结果', count: analysisResult.length, dateRange });
      setComparisonConfig({ type: 'person', targetA: {}, targetB: {} });
      setComparisonResult2(null);
      toast.success(`已同步分析结果（${analysisResult.length}条）`);
    }
  }, [analysisResult]);

  // 数据对比页 - 清空数据源
  const handleClearComparisonData = useCallback(() => {
    setComparisonDataSource(null);
    setComparisonConfig({ type: 'person', targetA: {}, targetB: {} });
    setComparisonResult2(null);
  }, []);

  const handleDeleteHistory = useCallback((id: string) => {
    setHistoryList(prev => prev.filter(h => h.id !== id));
    toast.success('已删除历史记录');
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistoryList([]);
    toast.info('已清空历史记录');
  }, []);

  // 标记历史记录为永久存储（localStorage 版本）
  const handleMarkAsPermanent = useCallback((history: QualityHistory, markType: '日' | '周' | '双周' | '月' | '季' | '年') => {
    try {
      const exists = permanentHistoryList.some(p => p.id === history.id);
      if (exists) {
        // 更新现有记录
        const updatedList = permanentHistoryList.map(p =>
          p.id === history.id ? { ...p, markType } : p
        );
        storageApi.savePermanentHistoryList(updatedList);
        setPermanentHistoryList(updatedList);
      } else {
        // 创建新记录
        const newRecord: PermanentHistory = {
          ...history,
          markType,
        };
        const updatedList = [newRecord, ...permanentHistoryList];
        storageApi.savePermanentHistoryList(updatedList);
        setPermanentHistoryList(updatedList);
      }
      toast.success(`已标记为${markType}数据`);
    } catch (error) {
      console.error('标记永久存储失败', error);
      toast.error('标记失败，请重试');
    }
  }, [permanentHistoryList]);

  // 取消永久存储标记（localStorage 版本）
  const handleUnmarkPermanent = useCallback((id: string) => {
    try {
      const updatedList = permanentHistoryList.filter(p => p.id !== id);
      storageApi.savePermanentHistoryList(updatedList);
      setPermanentHistoryList(updatedList);
      toast.success('已取消永久存储标记');
    } catch (error) {
      console.error('取消永久存储失败', error);
      toast.error('操作失败，请重试');
    }
  }, [permanentHistoryList]);

  // 从历史记录直接加载到环比分析
  const handleLoadHistoryToComparison = useCallback((historyId: string, target: 'lastWeek' | 'thisWeek') => {
    const history = [...permanentHistoryList, ...historyList].find(h => h.id === historyId);
    if (!history) {
      toast.error('未找到历史记录');
      return;
    }
    
    setSelectedHistoryForComparison(prev => ({ ...prev, [target]: historyId }));
    
    const historyData = history.data.map(e => ({
      ...e,
      neutralRate: e.neutralRate ?? 0,
      dissatisfiedRate: e.dissatisfiedRate ?? 0,
      firstResponseRate60s: e.firstResponseRate60s ?? 0,
    }));
    
    setComparisonResult(prev => {
      const base: ComparisonData = prev ?? { lastWeek: [], thisWeek: [], lastWeekDateRange: '', thisWeekDateRange: '' };
      if (target === 'lastWeek') {
        return { ...base, lastWeek: historyData, lastWeekDateRange: history.dateRange };
      } else {
        return { ...base, thisWeek: historyData, thisWeekDateRange: history.dateRange };
      }
    });
    
    toast.success(`已加载 ${history.dateRange} 到${target === 'lastWeek' ? '对比基准期' : '对比当期'}`);
  }, [historyList, permanentHistoryList]);

  // ==================== 渲染 ====================

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">数据分析</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">环比分析</span>
          </TabsTrigger>
          <TabsTrigger value="datacompare" className="flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            <span className="hidden sm:inline">数据对比</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">历史记录</span>
          </TabsTrigger>
        </TabsList>

        {/* ========== 数据分析页 ========== */}
        <TabsContent value="analysis" className="space-y-4 mt-0">
          {/* 数据输入区 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  数据导入
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 格式选择 */}
                <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                  <span className="text-sm text-muted-foreground">数据格式：</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="analysisFormat"
                      value="new"
                      checked={analysisFormat === 'new'}
                      onChange={() => setAnalysisFormat('new')}
                      className="accent-primary"
                    />
                    会话记录（满意度+邀评+首响）
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="analysisFormat"
                      value="old"
                      checked={analysisFormat === 'old'}
                      onChange={() => setAnalysisFormat('old')}
                      className="accent-primary"
                    />
                    坐席报表（工作量+质量+首响）
                  </label>
                </div>

                {analysisFormat === 'new' ? (
                  /* 新格式：会话明细报表 */
                  <div className="space-y-2">
                    <label className="text-sm font-medium">会话明细报表</label>
                    <Textarea
                      placeholder={`会话开始时间\t客服首次响应时长\t接待客服\t访客用户名\t满意度\t邀评来源\t客服是否邀评`}
                      value={sessionInput}
                      onChange={(e) => setSessionInput(e.target.value)}
                      className="h-[200px] max-h-[300px] overflow-y-auto font-mono text-sm resize-none"
                    />
                  </div>
                ) : (
                  /* 原格式：工作量报表 + 工作质量报表 + 首响60秒应答率 */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">工作量报表</label>
                      <Textarea
                        placeholder={`开始时间\t结束时间\tID\t姓名\t会话总量\t接入会话量\t转出量\t有效会话量...`}
                        value={workloadInput}
                        onChange={(e) => setWorkloadInput(e.target.value)}
                        className="h-[200px] max-h-[300px] overflow-y-auto font-mono text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">工作质量报表</label>
                      <Textarea
                        placeholder={`开始时间\t结束时间\tID\t姓名\t平均首次响应时间\t平均响应时间\t60s应答率\t...\t满意(三级)\t一般(三级)\t不满意(三级)`}
                        value={qualityInput}
                        onChange={(e) => setQualityInput(e.target.value)}
                        className="h-[200px] max-h-[300px] overflow-y-auto font-mono text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">首响60秒应答率</label>
                      <Textarea
                        placeholder={`会话开始时间\t客服首次响应时长\t接待客服\t访客用户名`}
                        value={firstResponseInput}
                        onChange={(e) => setFirstResponseInput(e.target.value)}
                        className="h-[200px] max-h-[300px] overflow-y-auto font-mono text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleProcessData} className="bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4 mr-1" />
                    开始处理
                  </Button>
                  <Button variant="destructive" onClick={handleClearAll} disabled={!workloadInput && !qualityInput && !sessionInput && !firstResponseInput}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    一键清空
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 统计卡片 */}
          {analysisResult.length > 0 && (
            <>
              {/* 分组 MVP 客服展示 */}
              {(stats.vipMVP || stats.basicMVP) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* 左边：VIP MVP 区域 */}
                    <div className="space-y-2">
                      {stats.vipMVP && (
                        <Card className="py-3 gap-1 border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 overflow-hidden relative">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-full" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-200/30 to-transparent rounded-tr-full" />
                          <CardContent className="px-3 relative">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-200">
                                  <Trophy className="w-6 h-6 text-white" />
                                </div>
                                <motion.div
                                  className="absolute -top-1 -right-1"
                                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  <Crown className="w-4 h-4 text-amber-500" />
                                </motion.div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">VIP MVP</span>
                                  <Badge variant="outline" className="text-xs">{stats.vipMVP.group}</Badge>
                                </div>
                                <div className="flex items-baseline gap-3">
                                  <span className="text-xl font-bold text-foreground">{stats.vipMVP.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    满意率 <span className="text-emerald-600 font-bold text-lg">{stats.vipMVP.satisfactionRate.toFixed(2)}%</span>
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  会话量 {stats.vipMVP.validSessions} | 满意 {stats.vipMVP.satisfied} | 不满意 {stats.vipMVP.dissatisfied}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {(stats.vipSecond || stats.vipThird) && (
                        <div className="grid grid-cols-2 gap-2">
                          {stats.vipSecond && (
                            <Card className="py-4 gap-2 border border-amber-700/40 bg-gradient-to-r from-amber-50/60 to-orange-50/60 overflow-hidden relative">
                              <CardContent className="px-3 relative">
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-700 to-orange-800 flex items-center justify-center shadow-md">
                                      <Medal className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded-full">VIP 第2</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-lg font-bold text-foreground truncate">{stats.vipSecond.name}</span>
                                      <span className="text-xs text-muted-foreground">满意率 <span className="text-emerald-600 font-semibold text-base">{stats.vipSecond.satisfactionRate.toFixed(2)}%</span></span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">会话量 {stats.vipSecond.validSessions} | 满意 {stats.vipSecond.satisfied} | 不满意 {stats.vipSecond.dissatisfied}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {stats.vipThird && (
                            <Card className="py-4 gap-2 border border-slate-300 bg-gradient-to-r from-slate-50 to-gray-50 overflow-hidden relative">
                              <CardContent className="px-3 relative">
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-md">
                                      <Medal className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-full">VIP 第3</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-lg font-bold text-foreground truncate">{stats.vipThird.name}</span>
                                      <span className="text-xs text-muted-foreground">满意率 <span className="text-emerald-600 font-semibold text-base">{stats.vipThird.satisfactionRate.toFixed(2)}%</span></span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">会话量 {stats.vipThird.validSessions} | 满意 {stats.vipThird.satisfied} | 不满意 {stats.vipThird.dissatisfied}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </div>
                    {/* 右边：基础 MVP 区域 */}
                    <div className="space-y-2">
                      {stats.basicMVP && (
                        <Card className="py-3 gap-1 border-2 border-blue-400 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 overflow-hidden relative">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-200/30 to-transparent rounded-bl-full" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-sky-200/30 to-transparent rounded-tr-full" />
                          <CardContent className="px-3 relative">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-200">
                                  <Trophy className="w-6 h-6 text-white" />
                                </div>
                                <motion.div
                                  className="absolute -top-1 -right-1"
                                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  <Crown className="w-4 h-4 text-blue-500" />
                                </motion.div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">基础 MVP</span>
                                  <Badge variant="outline" className="text-xs">{stats.basicMVP.group}</Badge>
                                </div>
                                <div className="flex items-baseline gap-3">
                                  <span className="text-xl font-bold text-foreground">{stats.basicMVP.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    满意率 <span className="text-emerald-600 font-bold text-lg">{stats.basicMVP.satisfactionRate.toFixed(2)}%</span>
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  会话量 {stats.basicMVP.validSessions} | 满意 {stats.basicMVP.satisfied} | 不满意 {stats.basicMVP.dissatisfied}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {(stats.basicSecond || stats.basicThird) && (
                        <div className="grid grid-cols-2 gap-2">
                          {stats.basicSecond && (
                            <Card className="py-4 gap-2 border border-amber-700/40 bg-gradient-to-r from-amber-50/60 to-orange-50/60 overflow-hidden relative">
                              <CardContent className="px-3 relative">
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-700 to-orange-800 flex items-center justify-center shadow-md">
                                      <Medal className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded-full">基础 第2</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-lg font-bold text-foreground truncate">{stats.basicSecond.name}</span>
                                      <span className="text-xs text-muted-foreground">满意率 <span className="text-emerald-600 font-semibold text-base">{stats.basicSecond.satisfactionRate.toFixed(2)}%</span></span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">会话量 {stats.basicSecond.validSessions} | 满意 {stats.basicSecond.satisfied} | 不满意 {stats.basicSecond.dissatisfied}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {stats.basicThird && (
                            <Card className="py-4 gap-2 border border-slate-300 bg-gradient-to-r from-slate-50 to-gray-50 overflow-hidden relative">
                              <CardContent className="px-3 relative">
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-md">
                                      <Medal className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-full">基础 第3</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-lg font-bold text-foreground truncate">{stats.basicThird.name}</span>
                                      <span className="text-xs text-muted-foreground">满意率 <span className="text-emerald-600 font-semibold text-base">{stats.basicThird.satisfactionRate.toFixed(2)}%</span></span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">会话量 {stats.basicThird.validSessions} | 满意 {stats.basicThird.satisfied} | 不满意 {stats.basicThird.dissatisfied}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                  <Card className="py-3 gap-1 hover:shadow-md transition-shadow">
                    <CardContent className="px-3">
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">总会话量</p>
                      </div>
                      <p className="text-lg font-bold">{stats.totalSessions}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                  <Card className="py-3 gap-1 hover:shadow-md transition-shadow border-emerald-200">
                    <CardContent className="px-3">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <p className="text-xs text-muted-foreground">满意数</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-600">{stats.totalSatisfied}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                  <Card className="py-3 gap-1 hover:shadow-md transition-shadow border-amber-200">
                    <CardContent className="px-3">
                      <div className="flex items-center gap-1.5">
                        <MinusCircle className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-xs text-muted-foreground">一般数</p>
                      </div>
                      <p className="text-lg font-bold text-amber-600">{stats.totalNeutral}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                  <Card className="py-3 gap-1 hover:shadow-md transition-shadow border-red-200">
                    <CardContent className="px-3">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <p className="text-xs text-muted-foreground">不满意数</p>
                      </div>
                      <p className="text-lg font-bold text-red-600">{stats.totalDissatisfied}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* 筛选和操作 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-xl border"
              >
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="组别筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部组别</SelectItem>
                    <SelectItem value="A组">A组</SelectItem>
                    <SelectItem value="B组">B组</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="类型筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="基础">基础</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1" />

                <Button variant="outline" onClick={handleCopyResult}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制结果
                </Button>
                <Button variant="outline" onClick={handleExportResult}>
                  <Download className="w-4 h-4 mr-2" />
                  导出结果
                </Button>
              </motion.div>

              {/* 结果表格 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card rounded-xl border overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">客服类型</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">组别</th>
                        <th
                          onClick={() => handleSort('name')}
                          className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            姓名
                            {sortConfig.key === 'name' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('validSessions')}
                          className="px-4 py-3 text-center text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            有效会话量
                            {sortConfig.key === 'validSessions' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('satisfied')}
                          className="px-4 py-3 text-center text-sm font-medium text-emerald-600 cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            满意
                            {sortConfig.key === 'satisfied' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('neutral')}
                          className="px-4 py-3 text-center text-sm font-medium text-amber-600 cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            一般
                            {sortConfig.key === 'neutral' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('dissatisfied')}
                          className="px-4 py-3 text-center text-sm font-medium text-red-600 cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            不满意
                            {sortConfig.key === 'dissatisfied' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('satisfactionRate')}
                          className="px-4 py-3 text-center text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            满意率
                            {sortConfig.key === 'satisfactionRate' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('neutralRate')}
                          className="px-4 py-3 text-center text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            一般率
                            {sortConfig.key === 'neutralRate' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('dissatisfiedRate')}
                          className="px-4 py-3 text-center text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            不满意率
                            {sortConfig.key === 'dissatisfiedRate' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('firstResponseRate60s')}
                          className="px-4 py-3 text-center text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            首响60秒应答率
                            {sortConfig.key === 'firstResponseRate60s' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('inviteCount')}
                          className="px-4 py-3 text-center text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            主动邀评数
                            {sortConfig.key === 'inviteCount' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('inviteRate')}
                          className="px-4 py-3 text-center text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            主动邀评率
                            {sortConfig.key === 'inviteRate' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('inviteSatisfactionRatio')}
                          className="px-4 py-3 text-center text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1">
                            邀评满意转化比
                            {sortConfig.key === 'inviteSatisfactionRatio' && (
                              <ArrowUpDown className={cn("w-3 h-3", sortConfig.direction === 'desc' && "rotate-180")} />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedResult.map((e, index) => (
                        <motion.tr
                          key={e.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            ((stats.vipMVP?.id === e.id) || (stats.basicMVP?.id === e.id)) && "bg-gradient-to-r from-amber-50/50 to-yellow-50/50"
                          )}
                        >
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              {e.type === 'VIP' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                  VIP
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                                  基础
                                </span>
                              )}
                              {(stats.vipMVP?.id === e.id || stats.basicMVP?.id === e.id) && (
                                <Crown className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2"><span className={`font-medium ${e.group === 'A组' ? 'text-blue-700' : e.group === 'B组' ? 'text-green-700' : ''}`}>{e.group}</span></td>
                          <td className="px-4 py-2 font-medium">{e.name}</td>
                          <td className="px-4 py-2 text-center">{e.validSessions}</td>
                          <td className="px-4 py-2 text-center text-emerald-600">{e.satisfied}</td>
                          <td className="px-4 py-2 text-center text-amber-600">{e.neutral}</td>
                          <td className="px-4 py-2 text-center text-red-600">{e.dissatisfied}</td>
                          <td className="px-4 py-2 text-center font-medium">{e.satisfactionRate.toFixed(2)}%</td>
                          <td className="px-4 py-2 text-center">{e.neutralRate.toFixed(2)}%</td>
                          <td className="px-4 py-2 text-center">{e.dissatisfiedRate.toFixed(2)}%</td>
                          <td className="px-4 py-2 text-center font-medium text-cyan-600">{e.validSessions > 0 ? `${e.firstResponseRate60s.toFixed(2)}%` : '-'}</td>
                          <td className="px-4 py-2 text-center font-medium text-purple-600">{e.inviteCount}</td>
                          <td className="px-4 py-2 text-center text-purple-600">{e.inviteRate.toFixed(2)}%</td>
                          <td className="px-4 py-2 text-center font-medium text-indigo-600">{e.inviteCount > 0 ? `${e.inviteSatisfactionRatio.toFixed(2)}` : '-'}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* 分组统计卡片 */}
              {filteredResult.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4"
                >
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">分组统计</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['A组'].map(group => {
                      const stat = groupStats[group];
                      if (!stat) return null;
                      const satRate = ((stat.satisfied / (stat.sessions || 1)) * 100).toFixed(2);
                      const neuRate = ((stat.neutral / (stat.sessions || 1)) * 100).toFixed(2);
                      const disRate = ((stat.dissatisfied / (stat.sessions || 1)) * 100).toFixed(2);
                      return (
                        <Card key={`card-${group}`} className="py-3 gap-1 bg-blue-50 border-blue-200">
                          <CardContent className="px-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                              <h5 className="font-medium text-blue-700 text-sm">{group} 统计</h5>
                              <Badge variant="secondary" className="ml-auto text-[10px]">{stat.count}人</Badge>
                            </div>
                            <table className="w-full text-sm border-separate border-spacing-1">
                              <tbody>
                                <tr>
                                  <td rowSpan={2} className="bg-white rounded p-1.5 text-center align-middle">
                                    <p className="text-muted-foreground text-xs">问题数</p>
                                    <p className="font-semibold text-blue-700 text-base">{stat.sessions}</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">满意率</p>
                                    <p className="font-semibold text-emerald-600 text-base">{satRate}%</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">一般率</p>
                                    <p className="font-semibold text-amber-600 text-base">{neuRate}%</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">差评率</p>
                                    <p className="font-semibold text-red-500 text-base">{disRate}%</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">满意数</p>
                                    <p className="font-semibold text-emerald-600 text-base">{stat.satisfied}</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">一般数</p>
                                    <p className="font-semibold text-amber-600 text-base">{stat.neutral}</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">差评数</p>
                                    <p className="font-semibold text-red-500 text-base">{stat.dissatisfied}</p>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {['B组'].map(group => {
                      const stat = groupStats[group];
                      if (!stat) return null;
                      const satRate = ((stat.satisfied / (stat.sessions || 1)) * 100).toFixed(2);
                      const neuRate = ((stat.neutral / (stat.sessions || 1)) * 100).toFixed(2);
                      const disRate = ((stat.dissatisfied / (stat.sessions || 1)) * 100).toFixed(2);
                      return (
                        <Card key={`card-${group}`} className="py-3 gap-1 bg-green-50 border-green-200">
                          <CardContent className="px-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                              <h5 className="font-medium text-green-700 text-sm">{group} 统计</h5>
                              <Badge variant="secondary" className="ml-auto text-[10px]">{stat.count}人</Badge>
                            </div>
                            <table className="w-full text-sm border-separate border-spacing-1">
                              <tbody>
                                <tr>
                                  <td rowSpan={2} className="bg-white rounded p-1.5 text-center align-middle">
                                    <p className="text-muted-foreground text-xs">问题数</p>
                                    <p className="font-semibold text-green-700 text-base">{stat.sessions}</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">满意率</p>
                                    <p className="font-semibold text-emerald-600 text-base">{satRate}%</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">一般率</p>
                                    <p className="font-semibold text-amber-600 text-base">{neuRate}%</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">差评率</p>
                                    <p className="font-semibold text-red-500 text-base">{disRate}%</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">满意数</p>
                                    <p className="font-semibold text-emerald-600 text-base">{stat.satisfied}</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">一般数</p>
                                    <p className="font-semibold text-amber-600 text-base">{stat.neutral}</p>
                                  </td>
                                  <td className="bg-white rounded p-1.5 text-center">
                                    <p className="text-muted-foreground text-xs">差评数</p>
                                    <p className="font-semibold text-red-500 text-base">{stat.dissatisfied}</p>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </CardContent>
                        </Card>
                      );
                    })}
                    <Card className="py-3 gap-1 bg-purple-50 border-purple-200">
                      <CardContent className="px-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                          <h5 className="font-medium text-purple-700 text-sm">总计</h5>
                          <Badge variant="secondary" className="ml-auto text-[10px]">{filteredResult.length}人</Badge>
                        </div>
                        <table className="w-full text-sm border-separate border-spacing-1">
                          <tbody>
                            <tr>
                              <td rowSpan={2} className="bg-white rounded p-1.5 text-center align-middle">
                                <p className="text-muted-foreground text-xs">问题数</p>
                                <p className="font-semibold text-purple-700 text-base">{stats.totalSessions}</p>
                              </td>
                              <td className="bg-white rounded p-1.5 text-center">
                                <p className="text-muted-foreground text-xs">满意率</p>
                                <p className="font-semibold text-emerald-600 text-base">{stats.avgSatisfactionRate.toFixed(2)}%</p>
                              </td>
                              <td className="bg-white rounded p-1.5 text-center">
                                <p className="text-muted-foreground text-xs">一般率</p>
                                <p className="font-semibold text-amber-600 text-base">{stats.avgNeutralRate.toFixed(2)}%</p>
                              </td>
                              <td className="bg-white rounded p-1.5 text-center">
                                <p className="text-muted-foreground text-xs">差评率</p>
                                <p className="font-semibold text-red-500 text-base">{stats.avgDissatisfiedRate.toFixed(2)}%</p>
                              </td>
                            </tr>
                            <tr>
                              <td className="bg-white rounded p-1.5 text-center">
                                <p className="text-muted-foreground text-xs">满意数</p>
                                <p className="font-semibold text-emerald-600 text-base">{stats.totalSatisfied}</p>
                              </td>
                              <td className="bg-white rounded p-1.5 text-center">
                                <p className="text-muted-foreground text-xs">一般数</p>
                                <p className="font-semibold text-amber-600 text-base">{stats.totalNeutral}</p>
                              </td>
                              <td className="bg-white rounded p-1.5 text-center">
                                <p className="text-muted-foreground text-xs">差评数</p>
                                <p className="font-semibold text-red-500 text-base">{stats.totalDissatisfied}</p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </TabsContent>

        {/* ========== 环比分析页 ========== */}
        <TabsContent value="comparison" className="space-y-4 mt-0">
          {/* 历史记录快速选择 */}
          {(historyList.length > 0 || permanentHistoryList.length > 0) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="w-5 h-5 text-primary" />
                    从历史记录加载
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-700">对比基准期（上周）</label>
                      <Select
                        value={selectedHistoryForComparison.lastWeek || ''}
                        onValueChange={(value) => handleLoadHistoryToComparison(value, 'lastWeek')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择历史记录" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...permanentHistoryList, ...historyList].map(h => {
                            const permanentItem = permanentHistoryList.find(p => p.id === h.id);
                            return (
                              <SelectItem key={h.id} value={h.id}>
                                {h.dateRange} - {h.note}
                                {permanentItem && (
                                  <span className="ml-1 text-blue-600">[永久{permanentItem.markType ? `/${permanentItem.markType}` : ''}]</span>
                                )}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-green-700">对比当期（本周）</label>
                      <Select
                        value={selectedHistoryForComparison.thisWeek || ''}
                        onValueChange={(value) => handleLoadHistoryToComparison(value, 'thisWeek')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择历史记录" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...permanentHistoryList, ...historyList].map(h => {
                            const permanentItem = permanentHistoryList.find(p => p.id === h.id);
                            return (
                              <SelectItem key={h.id} value={h.id}>
                                {h.dateRange} - {h.note}
                                {permanentItem && (
                                  <span className="ml-1 text-blue-600">[永久{permanentItem.markType ? `/${permanentItem.markType}` : ''}]</span>
                                )}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}


          {/* 筛选和结果 */}
          {comparisonResult && comparisonMetrics && (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-xl border"
              >
                <Select value={comparisonFilterGroup} onValueChange={setComparisonFilterGroup}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="组别筛选" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部组别</SelectItem>
                    <SelectItem value="A组">A组</SelectItem>
                    <SelectItem value="B组">B组</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={comparisonFilterType} onValueChange={setComparisonFilterType}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="类型筛选" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="基础">基础</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                <Button variant="outline" onClick={handleCopyComparison}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制结果
                </Button>
              </motion.div>

              {/* 环比指标卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <span className="text-lg font-semibold text-foreground">问题数</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground mb-2">{comparisonMetrics.problemCount.current}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">环比:</span>
                        <span className={`text-sm font-semibold flex items-center gap-1 ${comparisonMetrics.problemCount.change > 0 ? 'text-red-500' : comparisonMetrics.problemCount.change === 0 ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                          {comparisonMetrics.problemCount.change === 0 ? '持平' : (<>{comparisonMetrics.problemCount.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{Math.abs(comparisonMetrics.problemCount.change).toFixed(2)}%{comparisonMetrics.problemCount.change > 0 ? '↑' : '↓'}</>)}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-blue-200/50">
                        <span className="text-xs text-muted-foreground">上周: {comparisonMetrics.problemCount.last}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="bg-emerald-50 border-emerald-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Smile className="w-5 h-5 text-emerald-500" />
                        <span className="text-lg font-semibold text-foreground">满意率</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground mb-2">{comparisonMetrics.satisfactionRate.current.toFixed(2)}%</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">环比:</span>
                        <span className={`text-sm font-semibold flex items-center gap-1 ${comparisonMetrics.satisfactionRate.change > 0 ? 'text-red-500' : comparisonMetrics.satisfactionRate.change === 0 ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                          {comparisonMetrics.satisfactionRate.change === 0 ? '持平' : (<>{comparisonMetrics.satisfactionRate.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{Math.abs(comparisonMetrics.satisfactionRate.change).toFixed(2)}%{comparisonMetrics.satisfactionRate.change > 0 ? '↑' : '↓'}</>)}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-emerald-200/50">
                        <span className="text-xs text-muted-foreground">上周: {comparisonMetrics.satisfactionRate.last.toFixed(2)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="bg-red-50 border-red-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Frown className="w-5 h-5 text-red-500" />
                        <span className="text-lg font-semibold text-foreground">差评数</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground mb-2">{comparisonMetrics.badReviewCount.current}个</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">环比:</span>
                        <span className={`text-sm font-semibold flex items-center gap-1 ${comparisonMetrics.badReviewCount.change > 0 ? 'text-emerald-500' : comparisonMetrics.badReviewCount.change === 0 ? 'text-muted-foreground' : 'text-red-500'}`}>
                          {comparisonMetrics.badReviewCount.change === 0 ? '持平' : (<>{comparisonMetrics.badReviewCount.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{Math.abs(comparisonMetrics.badReviewCount.change).toFixed(2)}%{comparisonMetrics.badReviewCount.change > 0 ? '↑' : '↓'}</>)}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-red-200/50">
                        <span className="text-xs text-muted-foreground">上周: {comparisonMetrics.badReviewCount.last}个</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <Card className="bg-cyan-50 border-cyan-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Timer className="w-5 h-5 text-cyan-500" />
                        <span className="text-lg font-semibold text-foreground">首响60秒应答率</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground mb-2">{comparisonMetrics.firstResponseRate60s.current.toFixed(2)}%</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">环比:</span>
                        <span className={`text-sm font-semibold flex items-center gap-1 ${comparisonMetrics.firstResponseRate60s.change > 0 ? 'text-red-500' : comparisonMetrics.firstResponseRate60s.change === 0 ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                          {comparisonMetrics.firstResponseRate60s.change === 0 ? '持平' : (<>{comparisonMetrics.firstResponseRate60s.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{Math.abs(comparisonMetrics.firstResponseRate60s.change).toFixed(2)}%{comparisonMetrics.firstResponseRate60s.change > 0 ? '↑' : '↓'}</>)}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-cyan-200/50">
                        <span className="text-xs text-muted-foreground">上周: {comparisonMetrics.firstResponseRate60s.last.toFixed(2)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center text-sm text-muted-foreground"
              >
                <span className="inline-flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    上周: {comparisonResult.lastWeekDateRange || '未识别'}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    本周: {comparisonResult.thisWeekDateRange || '未识别'}
                  </span>
                </span>
              </motion.div>

              {/* 个人环比数据表格 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        个人环比数据
                        <span className="text-xs text-muted-foreground font-normal">({employeeComparisonData.length}人)</span>
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                            变好
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                            变差
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b">
                            <th className="px-4 py-3 text-left font-medium text-foreground sticky left-0 bg-muted/50 z-10 min-w-[100px]">姓名</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground min-w-[70px]">组别</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground min-w-[70px]">类型</th>
                            <th className="px-4 py-3 text-right font-medium text-foreground">
                              <div className="flex flex-col items-end"><span>问题数</span><span className="text-xs text-muted-foreground/70">环比</span></div>
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-foreground">
                              <div className="flex flex-col items-end"><span>满意率</span><span className="text-xs text-muted-foreground/70">环比</span></div>
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-foreground">
                              <div className="flex flex-col items-end"><span>差评数</span><span className="text-xs text-muted-foreground/70">环比</span></div>
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-foreground">
                              <div className="flex flex-col items-end"><span>首响60秒应答率</span><span className="text-xs text-muted-foreground/70">环比</span></div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeComparisonData.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">暂无数据</td></tr>
                          ) : (
                            employeeComparisonData.map((employee, index) => (
                              <tr
                                key={employee.name}
                                onClick={() => { setSelectedEmployee(employee); setIsEmployeeDetailOpen(true); }}
                                className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                              >
                                <td className="px-4 py-3 font-medium sticky left-0 bg-inherit z-10">{employee.name}</td>
                                <td className={`px-4 py-3 text-center font-medium ${employee.group === 'A组' ? 'text-blue-700' : employee.group === 'B组' ? 'text-green-700' : ''}`}>{employee.group}</td>
                                <td className="px-4 py-3 text-center">
                                  {employee.type === 'VIP' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">VIP</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">基础</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground">{employee.metrics.validSessions.this}</span>
                                    <span className={`text-xs font-medium ${employee.metrics.validSessions.change > 0 ? 'text-red-500' : employee.metrics.validSessions.change < 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                      {employee.metrics.validSessions.change === 0 ? '持平' : `${employee.metrics.validSessions.change > 0 ? '+' : ''}${employee.metrics.validSessions.change.toFixed(2)}%`}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground">{employee.metrics.satisfactionRate.this.toFixed(2)}%</span>
                                    <span className={`text-xs font-medium ${employee.metrics.satisfactionRate.change > 0 ? 'text-red-500' : employee.metrics.satisfactionRate.change < 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                      {employee.metrics.satisfactionRate.change === 0 ? '持平' : `${employee.metrics.satisfactionRate.change > 0 ? '+' : ''}${employee.metrics.satisfactionRate.change.toFixed(2)}%`}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground">{employee.metrics.dissatisfied.this}</span>
                                    <span className={`text-xs font-medium ${employee.metrics.dissatisfied.change > 0 ? 'text-emerald-500' : employee.metrics.dissatisfied.change < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                      {employee.metrics.dissatisfied.change === 0 ? '持平' : `${employee.metrics.dissatisfied.change > 0 ? '+' : ''}${employee.metrics.dissatisfied.change.toFixed(2)}%`}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground">{employee.metrics.firstResponseRate60s.this > 0 ? `${employee.metrics.firstResponseRate60s.this.toFixed(2)}%` : '-'}</span>
                                    <span className={`text-xs font-medium ${employee.metrics.firstResponseRate60s.change > 0 ? 'text-red-500' : employee.metrics.firstResponseRate60s.change < 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                      {employee.metrics.firstResponseRate60s.this > 0 ? (employee.metrics.firstResponseRate60s.change === 0 ? '持平' : `${employee.metrics.firstResponseRate60s.change > 0 ? '+' : ''}${employee.metrics.firstResponseRate60s.change.toFixed(2)}%`) : ''}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}

          {/* 空状态提示 */}
          {(!comparisonResult || !comparisonMetrics) && (
            <div className="text-center py-16 text-muted-foreground bg-white rounded-lg border border-dashed">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-lg font-medium">暂无环比数据</p>
              <p className="text-sm mt-2">
                请先在数据分析页处理数据并保存历史记录，<br />
                然后在此选择基准期和当期进行环比分析
              </p>
            </div>
          )}
        </TabsContent>

        {/* ========== 历史记录页 ========== */}
        <TabsContent value="history" className="space-y-4 mt-0">
          {historyList.length === 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                  <span>📜</span> 历史记录
                </h2>
              </div>
              <div className="text-center py-16 text-muted-foreground bg-white rounded-lg border border-dashed">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-lg font-medium">暂无历史记录</p>
                <p className="text-sm mt-2">在数据分析页处理数据后，记录将自动保存到这里</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 标题栏 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                    <span>📜</span> 历史记录
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    共 {historyList.length} 条记录 (最多保存10条)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DataBackup storageKeys={['service_quality_history']} label="历史记录" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                        <Trash2 className="w-3.5 h-3.5 mr-1" />清空历史
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认清空</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要清空所有历史记录吗？标记为永久的记录不会被删除。此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearHistory}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          确认清空
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* 提示信息 */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                <span>💡</span>
                <span>点击"加载"按钮可直接跳转到数据分析页签查看完整数据，点击🔖可标记为永久存储</span>
              </div>

              {/* 卡片网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {historyList.map((history) => {
                  const isPermanent = permanentHistoryList.some(p => p.id === history.id);
                  const permanentItem = permanentHistoryList.find(p => p.id === history.id);
                  return (
                    <Card key={history.id} className={`hover:shadow-sm transition-shadow border h-[52px] ${isPermanent ? 'border-blue-300' : 'border-gray-200'}`}>
                      <CardContent className="p-0 px-3 h-full">
                        <div className="flex items-center justify-between h-full">
                          <div className="flex-1 min-w-0">
                            {/* 日期范围 + 永久标记 */}
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-900 text-sm truncate leading-tight">
                                {history.dateRange}
                              </span>
                              {isPermanent && permanentItem && (
                                <Badge variant="secondary" className="text-xs shrink-0 h-4 px-1.5">
                                  <BookmarkCheck className="w-2.5 h-2.5 mr-0.5" />{permanentItem.markType}
                                </Badge>
                              )}
                            </div>
                            {/* 时间 */}
                            <div className="text-xs text-gray-500 leading-tight mt-0.5">
                              {new Date(history.timestamp).toLocaleString()}
                            </div>
                          </div>
                          {/* 操作按钮 */}
                          <div className="flex items-center gap-0.5 ml-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 hover:bg-blue-50"
                                  title="标记为永久"
                                >
                                  <Bookmark className={`w-3.5 h-3.5 ${isPermanent ? 'text-blue-600' : 'text-gray-400'}`} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleMarkAsPermanent(history, '日')}>日</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarkAsPermanent(history, '周')}>周</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarkAsPermanent(history, '双周')}>双周</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarkAsPermanent(history, '月')}>月</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarkAsPermanent(history, '季')}>季</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarkAsPermanent(history, '年')}>年</DropdownMenuItem>
                                {isPermanent && (
                                  <>
                                    <DropdownMenuItem variant="destructive" onClick={() => handleUnmarkPermanent(history.id)}>取消</DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleLoadHistory(history)}
                              title="加载数据"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  title="删除记录"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除记录 "{history.dateRange}" 吗？此操作无法撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteHistory(history.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* ========== 永久储存区域 ========== */}
              {permanentHistoryList.length > 0 && (
                <div className="space-y-3 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                        <span>🔖</span> 永久储存
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        共 {permanentHistoryList.length} 条记录
                      </span>
                    </div>
                    <DataBackup storageKeys={['service_quality_permanent_history']} label="永久储存记录" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    <span>💡</span>
                    <span>点击"加载"按钮可直接跳转到数据分析页签查看完整数据，点击🗑️可取消永久存储</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {permanentHistoryList.map((history) => (
                      <Card key={history.id} className="hover:shadow-sm transition-shadow border-blue-300 border h-[52px]">
                        <CardContent className="p-0 px-3 h-full">
                          <div className="flex items-center justify-between h-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-gray-900 text-sm truncate leading-tight">
                                  {history.dateRange}
                                </span>
                                {history.markType && (
                                  <Badge variant="secondary" className="text-xs shrink-0 h-4 px-1.5">
                                    <BookmarkCheck className="w-2.5 h-2.5 mr-0.5" />{history.markType}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 leading-tight mt-0.5">
                                {new Date(history.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 ml-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleLoadHistory(history)}
                                title="加载数据"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    title="取消永久存储"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确认取消永久存储</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      确定要取消 "{history.dateRange}" 的永久存储标记吗？该记录将移回普通历史记录。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleUnmarkPermanent(history.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      确认取消
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ========== 数据对比页 ========== */}
        <TabsContent value="datacompare" className="space-y-4 mt-0">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitCompare className="w-5 h-5" />数据对比</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 数据源状态条 */}
                <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${comparisonDataSource ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
                  {comparisonDataSource ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-blue-700">当前数据源：{comparisonDataSource.label}</span>
                        <span className="text-xs text-blue-500 ml-2">{comparisonDataSource.count}人</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <span className="text-sm font-medium text-red-600">暂无数据，请先分析数据或从历史记录加载</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {comparisonDataSource && (
                      <Button variant="ghost" size="sm" onClick={handleClearComparisonData} className="text-xs">
                        <Trash2 className="w-3 h-3 mr-1" />清空
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('analysis')} className="text-xs">
                      <BarChart3 className="w-3 h-3 mr-1" />去分析
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowHistoryPicker(true)} className="text-xs">
                      <History className="w-3 h-3 mr-1" />从历史选择
                    </Button>
                  </div>
                </div>

                {/* 有数据时才显示同步提示 */}
                {analysisResult.length > 0 && !comparisonDataSource && (
                  <div className="flex items-center justify-between rounded-lg px-4 py-2 bg-amber-50 border border-amber-200">
                    <span className="text-sm text-amber-700">检测到分析结果中有 {analysisResult.length} 条数据，点击同步后可用于对比</span>
                    <Button variant="outline" size="sm" onClick={handleSyncAnalysisToComparison} className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
                      <RefreshCw className="w-3 h-3 mr-1" />同步分析结果
                    </Button>
                  </div>
                )}

                {/* 对比类型选择 */}
                <div className="flex gap-4">
                  <Button variant={comparisonConfig.type === 'person' ? 'default' : 'outline'}
                    onClick={() => setComparisonConfig(prev => ({ ...prev, type: 'person', targetA: {}, targetB: {} }))}
                    disabled={!comparisonDataSource}>
                    <Users className="w-4 h-4 mr-2" />人员对比
                  </Button>
                  <Button variant={comparisonConfig.type === 'group' ? 'default' : 'outline'}
                    onClick={() => setComparisonConfig(prev => ({ ...prev, type: 'group', targetA: {}, targetB: {} }))}
                    disabled={!comparisonDataSource}>
                    <BarChart3 className="w-4 h-4 mr-2" />组别对比
                  </Button>
                </div>

                {/* 人员对比选择 */}
                {comparisonConfig.type === 'person' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">对比对象 A</label>
                      <Select value={comparisonConfig.targetA.name || ''}
                        disabled={!comparisonDataSource}
                        onValueChange={(value) => setComparisonConfig(prev => ({ ...prev, targetA: { ...prev.targetA, name: value } }))}>
                        <SelectTrigger><SelectValue placeholder={comparisonDataSource ? '选择人员' : '请先加载数据'} /></SelectTrigger>
                        <SelectContent>
                          {analysisResult.map(e => (<SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">对比对象 B</label>
                      <Select value={comparisonConfig.targetB.name || ''}
                        disabled={!comparisonDataSource}
                        onValueChange={(value) => setComparisonConfig(prev => ({ ...prev, targetB: { ...prev.targetB, name: value } }))}>
                        <SelectTrigger><SelectValue placeholder={comparisonDataSource ? '选择人员' : '请先加载数据'} /></SelectTrigger>
                        <SelectContent>
                          {analysisResult.map(e => (<SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* 组别对比选择 */}
                {comparisonConfig.type === 'group' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <label className="text-sm font-medium">对比对象 A</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={comparisonConfig.targetA.group || 'all'}
                          disabled={!comparisonDataSource}
                          onValueChange={(value) => setComparisonConfig(prev => ({ ...prev, targetA: { ...prev.targetA, group: value } }))}>
                          <SelectTrigger><SelectValue placeholder="选择组别" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部组别</SelectItem><SelectItem value="A组">A组</SelectItem><SelectItem value="B组">B组</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={comparisonConfig.targetA.type || 'all'}
                          disabled={!comparisonDataSource}
                          onValueChange={(value) => setComparisonConfig(prev => ({ ...prev, targetA: { ...prev.targetA, type: value } }))}>
                          <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部类型</SelectItem><SelectItem value="基础">基础</SelectItem><SelectItem value="VIP">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-sm font-medium">对比对象 B</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={comparisonConfig.targetB.group || 'all'}
                          disabled={!comparisonDataSource}
                          onValueChange={(value) => setComparisonConfig(prev => ({ ...prev, targetB: { ...prev.targetB, group: value } }))}>
                          <SelectTrigger><SelectValue placeholder="选择组别" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部组别</SelectItem><SelectItem value="A组">A组</SelectItem><SelectItem value="B组">B组</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={comparisonConfig.targetB.type || 'all'}
                          disabled={!comparisonDataSource}
                          onValueChange={(value) => setComparisonConfig(prev => ({ ...prev, targetB: { ...prev.targetB, type: value } }))}>
                          <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部类型</SelectItem><SelectItem value="基础">基础</SelectItem><SelectItem value="VIP">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 执行对比按钮 - 前置校验禁用 */}
                <Button
                  onClick={handleExecuteComparison}
                  className="w-full"
                  disabled={!comparisonDataSource ||
                    (comparisonConfig.type === 'person'
                      ? !comparisonConfig.targetA.name || !comparisonConfig.targetB.name
                      : false)
                  }>
                  <GitCompare className="w-4 h-4 mr-2" />执行对比
                </Button>

                {/* 对比结果 */}
                {comparisonResult2 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">对比结果</h4>
                      {comparisonDataSource && (
                        <span className="text-xs text-muted-foreground">数据源：{comparisonDataSource.label}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-blue-50">
                        <CardContent className="p-4">
                          <h5 className="font-medium text-blue-700 mb-1">{comparisonResult2.targetA.name}</h5>
                          {comparisonConfig.type === 'person' && (() => {
                            const emp = analysisResult.find(e => e.name === comparisonResult2.targetA.name);
                            return emp ? <p className="text-xs text-blue-400 mb-3">{emp.type} · {emp.group}</p> : <div className="mb-3" />;
                          })()}
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">问题数</span><span className="font-medium">{comparisonResult2.targetA.stats.totalSessions}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">满意率</span><span className="font-medium">{comparisonResult2.targetA.stats.satisfactionRate.toFixed(2)}%</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">差评数</span><span className="font-medium">{comparisonResult2.targetA.stats.dissatisfied}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">响应时间</span><span className="font-medium">{comparisonResult2.targetA.stats.avgResponseTime.toFixed(2)}s</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">60秒应答率</span><span className="font-medium">{comparisonResult2.targetA.stats.responseRate60s.toFixed(2)}%</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">首响60秒应答率</span><span className="font-medium text-cyan-600">{comparisonResult2.targetA.stats.firstResponseRate60s.toFixed(2)}%</span></div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50">
                        <CardContent className="p-4">
                          <h5 className="font-medium text-gray-700 mb-3">差异对比 (B - A)</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">问题数差异</span><span className={`font-medium ${comparisonResult2.diff.sessionsDiff > 0 ? 'text-red-500' : comparisonResult2.diff.sessionsDiff < 0 ? 'text-green-500' : ''}`}>{comparisonResult2.diff.sessionsDiff > 0 ? '+' : ''}{comparisonResult2.diff.sessionsDiff}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">满意率差异</span><span className={`font-medium ${comparisonResult2.diff.satisfactionDiff > 0 ? 'text-green-500' : comparisonResult2.diff.satisfactionDiff < 0 ? 'text-red-500' : ''}`}>{comparisonResult2.diff.satisfactionDiff > 0 ? '+' : ''}{comparisonResult2.diff.satisfactionDiff.toFixed(2)}%</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">差评数差异</span><span className={`font-medium ${comparisonResult2.diff.dissatisfiedDiff > 0 ? 'text-red-500' : comparisonResult2.diff.dissatisfiedDiff < 0 ? 'text-green-500' : ''}`}>{comparisonResult2.diff.dissatisfiedDiff > 0 ? '+' : ''}{comparisonResult2.diff.dissatisfiedDiff}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">响应时间差异</span><span className={`font-medium ${comparisonResult2.diff.responseTimeDiff > 0 ? 'text-red-500' : comparisonResult2.diff.responseTimeDiff < 0 ? 'text-green-500' : ''}`}>{comparisonResult2.diff.responseTimeDiff > 0 ? '+' : ''}{comparisonResult2.diff.responseTimeDiff.toFixed(2)}s</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">应答率差异</span><span className={`font-medium ${comparisonResult2.diff.responseRateDiff > 0 ? 'text-green-500' : comparisonResult2.diff.responseRateDiff < 0 ? 'text-red-500' : ''}`}>{comparisonResult2.diff.responseRateDiff > 0 ? '+' : ''}{comparisonResult2.diff.responseRateDiff.toFixed(2)}%</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">首响应答率差异</span><span className={`font-medium ${comparisonResult2.diff.firstResponseRateDiff > 0 ? 'text-green-500' : comparisonResult2.diff.firstResponseRateDiff < 0 ? 'text-red-500' : ''}`}>{comparisonResult2.diff.firstResponseRateDiff > 0 ? '+' : ''}{comparisonResult2.diff.firstResponseRateDiff.toFixed(2)}%</span></div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50">
                        <CardContent className="p-4">
                          <h5 className="font-medium text-green-700 mb-1">{comparisonResult2.targetB.name}</h5>
                          {comparisonConfig.type === 'person' && (() => {
                            const emp = analysisResult.find(e => e.name === comparisonResult2.targetB.name);
                            return emp ? <p className="text-xs text-green-400 mb-3">{emp.type} · {emp.group}</p> : <div className="mb-3" />;
                          })()}
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">问题数</span><span className="font-medium">{comparisonResult2.targetB.stats.totalSessions}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">满意率</span><span className="font-medium">{comparisonResult2.targetB.stats.satisfactionRate.toFixed(2)}%</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">差评数</span><span className="font-medium">{comparisonResult2.targetB.stats.dissatisfied}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">响应时间</span><span className="font-medium">{comparisonResult2.targetB.stats.avgResponseTime.toFixed(2)}s</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">60秒应答率</span><span className="font-medium">{comparisonResult2.targetB.stats.responseRate60s.toFixed(2)}%</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">首响60秒应答率</span><span className="font-medium text-cyan-600">{comparisonResult2.targetB.stats.firstResponseRate60s.toFixed(2)}%</span></div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* 历史记录选择弹窗（数据对比页用） */}
        <Dialog open={showHistoryPicker} onOpenChange={setShowHistoryPicker}>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>从历史记录选择数据</DialogTitle>
            </DialogHeader>
            {historyList.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">暂无历史记录</p>
                <p className="text-xs mt-1">请先在「数据分析」中处理数据生成历史记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyList.map(h => (
                  <div key={h.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleLoadHistoryForComparison(h)}>
                    <div>
                      <p className="text-sm font-medium">{h.dateRange}</p>
                      <p className="text-xs text-muted-foreground">{h.note} · {new Date(h.timestamp).toLocaleString()}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Tabs>

      {/* 员工详情弹窗 */}
      <Dialog open={isEmployeeDetailOpen} onOpenChange={setIsEmployeeDetailOpen}>
        <DialogContent className="!max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl">{selectedEmployee?.name}</DialogTitle>
                {selectedEmployee?.type === 'VIP' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">VIP</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">基础</span>
                )}
                <span className="text-sm text-muted-foreground">({selectedEmployee?.group})</span>
              </div>
              <Button className="mr-8" variant="outline" size="sm"
                onClick={() => {
                  if (!selectedEmployee) return;
                  const lines: string[] = [];
                  lines.push(`- 问题数：${selectedEmployee.metrics.validSessions.this}，环比：${selectedEmployee.metrics.validSessions.change.toFixed(2)}%${selectedEmployee.metrics.validSessions.change > 0 ? '↑' : '↓'}`);
                  lines.push(`- 满意率：${selectedEmployee.metrics.satisfactionRate.this.toFixed(2)}%，环比：${selectedEmployee.metrics.satisfactionRate.change.toFixed(2)}%${selectedEmployee.metrics.satisfactionRate.change > 0 ? '↑' : '↓'}`);
                  lines.push(`- 差评数：${selectedEmployee.metrics.dissatisfied.this}个，环比：${selectedEmployee.metrics.dissatisfied.change.toFixed(2)}%${selectedEmployee.metrics.dissatisfied.change > 0 ? '↑' : '↓'}`);
                  lines.push(`- 首响60秒应答率：${selectedEmployee.metrics.firstResponseRate60s.this.toFixed(2)}%，环比：${selectedEmployee.metrics.firstResponseRate60s.change.toFixed(2)}%${selectedEmployee.metrics.firstResponseRate60s.change > 0 ? '↑' : '↓'}`);
                  navigator.clipboard.writeText(lines.join('\n'));
                  toast.success('已复制到剪贴板');
                }}
              >
                <Copy className="w-4 h-4 mr-1" />复制结果
              </Button>
            </div>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {/* 问题数 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap"><MessageSquare className="w-5 h-5 text-blue-500" /><span className="text-lg font-semibold text-foreground">问题数</span></div>
                    <div className="text-2xl font-bold text-foreground mb-2">{selectedEmployee.metrics.validSessions.this}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">环比:</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${selectedEmployee.metrics.validSessions.change > 0 ? 'text-red-500' : selectedEmployee.metrics.validSessions.change === 0 ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                        {selectedEmployee.metrics.validSessions.change === 0 ? '持平' : (<>{selectedEmployee.metrics.validSessions.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{Math.abs(selectedEmployee.metrics.validSessions.change).toFixed(2)}%{selectedEmployee.metrics.validSessions.change > 0 ? '↑' : '↓'}</>)}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-blue-200/50"><span className="text-xs text-muted-foreground">上周: {selectedEmployee.metrics.validSessions.last}</span></div>
                  </CardContent>
                </Card>
              </motion.div>
              {/* 满意率 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="bg-emerald-50 border-emerald-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap"><Smile className="w-5 h-5 text-emerald-500" /><span className="text-lg font-semibold text-foreground">满意率</span></div>
                    <div className="text-2xl font-bold text-foreground mb-2">{selectedEmployee.metrics.satisfactionRate.this.toFixed(2)}%</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">环比:</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${selectedEmployee.metrics.satisfactionRate.change > 0 ? 'text-red-500' : selectedEmployee.metrics.satisfactionRate.change === 0 ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                        {selectedEmployee.metrics.satisfactionRate.change === 0 ? '持平' : (<>{selectedEmployee.metrics.satisfactionRate.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{Math.abs(selectedEmployee.metrics.satisfactionRate.change).toFixed(2)}%{selectedEmployee.metrics.satisfactionRate.change > 0 ? '↑' : '↓'}</>)}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-emerald-200/50"><span className="text-xs text-muted-foreground">上周: {selectedEmployee.metrics.satisfactionRate.last.toFixed(2)}%</span></div>
                  </CardContent>
                </Card>
              </motion.div>
              {/* 差评数 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="bg-red-50 border-red-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap"><Frown className="w-5 h-5 text-red-500" /><span className="text-lg font-semibold text-foreground">差评数</span></div>
                    <div className="text-2xl font-bold text-foreground mb-2">{selectedEmployee.metrics.dissatisfied.this}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">环比:</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${selectedEmployee.metrics.dissatisfied.change > 0 ? 'text-emerald-500' : selectedEmployee.metrics.dissatisfied.change === 0 ? 'text-muted-foreground' : 'text-red-500'}`}>
                        {selectedEmployee.metrics.dissatisfied.change === 0 ? '持平' : (<>{selectedEmployee.metrics.dissatisfied.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{Math.abs(selectedEmployee.metrics.dissatisfied.change).toFixed(2)}%{selectedEmployee.metrics.dissatisfied.change > 0 ? '↑' : '↓'}</>)}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-red-200/50"><span className="text-xs text-muted-foreground">上周: {selectedEmployee.metrics.dissatisfied.last}</span></div>
                  </CardContent>
                </Card>
              </motion.div>
              {/* 首响60秒应答率 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className="bg-cyan-50 border-cyan-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap"><Timer className="w-5 h-5 text-cyan-500" /><span className="text-lg font-semibold text-foreground">首响60秒应答率</span></div>
                    <div className="text-2xl font-bold text-foreground mb-2">{selectedEmployee.metrics.firstResponseRate60s.this > 0 ? `${selectedEmployee.metrics.firstResponseRate60s.this.toFixed(2)}%` : '-'}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">环比:</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${selectedEmployee.metrics.firstResponseRate60s.change > 0 ? 'text-red-500' : selectedEmployee.metrics.firstResponseRate60s.change === 0 ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                        {selectedEmployee.metrics.firstResponseRate60s.this > 0 ? (
                          selectedEmployee.metrics.firstResponseRate60s.change === 0 ? '持平' : (<>{selectedEmployee.metrics.firstResponseRate60s.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{Math.abs(selectedEmployee.metrics.firstResponseRate60s.change).toFixed(2)}%{selectedEmployee.metrics.firstResponseRate60s.change > 0 ? '↑' : '↓'}</>)
                        ) : <span className="text-xs text-muted-foreground">无数据</span>}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-cyan-200/50"><span className="text-xs text-muted-foreground">上周: {selectedEmployee.metrics.firstResponseRate60s.last.toFixed(2)}%</span></div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
