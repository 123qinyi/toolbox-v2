import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { DataBackup } from '@/components/DataBackup';
import {
  Upload,
  BarChart3,
  Smile,
  Settings,
  Play,
  RotateCcw,
  Copy,
  FileSpreadsheet,
  ChevronUp,
  ChevronDown,
  History,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import {
  parseRawInput,
  convertData,
  processData,
  calculateSatisfaction,
  buildSatisfactionOutput,
  calculateEmotionDistribution,
  buildTableOutput,
  buildEmotionL3Table,
  type TopSettings,
  type TopConvertedRecord,
  type ProcessedData,
  type EmotionStats,
  type CategoryMergeRule,
  type ClassificationLevel,
  type MatchMode,
  DEFAULT_SETTINGS,
  DEFAULT_MERGE_RULES,
  ALL_INDICATORS,
  type DisplayMode,
} from '@/lib/top-utils';

interface TopToolProps {
  // 可以在这里扩展props
}

// 历史记录类型定义
interface TopHistoryRecord {
  id: string;
  name: string;
  created_at: string;
  rawInput: string;
  convertedRecords: TopConvertedRecord[];
  processedData: ProcessedData | null;
  resultOutput: string;
  settings: TopSettings;
  recordCount: number;
}

const MAX_TOP_HISTORY = 12;

// ============================================================
// 分类顺序配置弹窗
// ============================================================
function CategoryOrderDialog({
  open,
  onClose,
  order,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  order: string[];
  onConfirm: (newOrder: string[]) => void;
}) {
  const [currentOrder, setCurrentOrder] = useState([...order]);

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const newOrder = [...currentOrder];
    [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
    setCurrentOrder(newOrder);
  };

  const moveDown = (idx: number) => {
    if (idx >= currentOrder.length - 1) return;
    const newOrder = [...currentOrder];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setCurrentOrder(newOrder);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>分类顺序配置</DialogTitle>
          <DialogDescription>调整分类的显示顺序</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {currentOrder.map((cat, idx) => (
            <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">{idx + 1}. {cat}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveUp(idx)} disabled={idx <= 0}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveDown(idx)} disabled={idx >= currentOrder.length - 1}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => onConfirm(currentOrder)}>确认</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// 自定义显示配置弹窗
// ============================================================
function CustomDisplayDialog({
  open,
  onClose,
  config,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  config: TopSettings['customDisplay'];
  onConfirm: (newConfig: TopSettings['customDisplay']) => void;
}) {
  const [selected, setSelected] = useState<string[]>([...config.selectedIndicators]);
  const [position, setPosition] = useState(config.displayPosition);

  const toggleIndicator = (ind: string) => {
    setSelected(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>自定义显示配置</DialogTitle>
          <DialogDescription>选择要显示的指标和显示位置</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">显示位置</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'none', label: '不显示' },
                { value: 'category', label: '仅分类' },
                { value: 'subcategory', label: '仅子分类' },
                { value: 'both', label: '都显示' },
              ].map(opt => (
                <Button
                  key={opt.value}
                  variant={position === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPosition(opt.value as typeof position)}
                  className="text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          {position !== 'none' && (
            <div>
              <Label className="text-sm font-medium mb-2 block">选择指标</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_INDICATORS.map(ind => (
                  <Button
                    key={ind}
                    variant={selected.includes(ind) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleIndicator(ind)}
                    className="text-xs"
                  >
                    {ind}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => onConfirm({ selectedIndicators: selected, displayPosition: position, indicatorOrder: config.indicatorOrder })}>确认</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// 自定义分类合并配置弹窗
// ============================================================
const LEVEL_OPTIONS: ClassificationLevel[] = ['二级', '三级', '四级', '五级'];
const MODE_OPTIONS: MatchMode[] = ['精确', '包含'];

function CategoryMergeConfigDialog({
  open,
  onClose,
  rules,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  rules: CategoryMergeRule[];
  onConfirm: (newRules: CategoryMergeRule[]) => void;
}) {
  const [localRules, setLocalRules] = useState<CategoryMergeRule[]>(() =>
    rules.map(r => ({ ...r })),
  );

  useEffect(() => {
    if (open) {
      setLocalRules(rules.map(r => ({ ...r })));
    }
  }, [open, rules]);

  const updateRule = (id: string, patch: Partial<CategoryMergeRule>) => {
    setLocalRules(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const deleteRule = (id: string) => {
    setLocalRules(prev => prev.filter(r => r.id !== id));
  };

  const addRule = () => {
    const newRule: CategoryMergeRule = {
      id: `rule-${Date.now()}`,
      name: '新规则',
      matchLevel: '三级',
      matchValues: '',
      matchMode: '精确',
      targetLevel: '三级',
      enabled: true,
    };
    setLocalRules(prev => [...prev, newRule]);
  };

  const restoreDefaults = () => {
    setLocalRules(DEFAULT_MERGE_RULES.map(r => ({ ...r })));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[760px] w-[92vw]">
        <DialogHeader>
          <DialogTitle>自定义分类合并配置</DialogTitle>
          <DialogDescription className="text-xs">
            当指定级别的分类命中匹配值时，合并到目标级别统计。规则按顺序匹配，第一条命中即生效。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] mt-2">
          {localRules.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              暂无规则，点击「添加」创建
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-center font-medium py-1.5 px-1 w-[34px]">启用</th>
                  <th className="text-left font-medium py-1.5 px-1 w-[140px]">名称</th>
                  <th className="text-center font-medium py-1.5 px-1 w-[42px]">级别</th>
                  <th className="text-left font-medium py-1.5 px-1">匹配值</th>
                  <th className="text-center font-medium py-1.5 px-1 w-[20px]"></th>
                  <th className="text-center font-medium py-1.5 px-1 w-[46px]">统计到</th>
                  <th className="text-center font-medium py-1.5 px-1 w-[42px]">方式</th>
                  <th className="text-center font-medium py-1.5 px-1 w-[30px]"></th>
                </tr>
              </thead>
              <tbody>
                {localRules.map((rule) => (
                  <tr
                    key={rule.id}
                    className={`border-b last:border-0 ${rule.enabled ? '' : 'opacity-50'}`}
                  >
                    <td className="py-1.5 px-1 text-center">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={v => updateRule(rule.id, { enabled: v })}
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <Input
                        className="h-7 text-xs w-full"
                        value={rule.name}
                        onChange={e => updateRule(rule.id, { name: e.target.value })}
                        placeholder="规则名称"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <Select
                        value={rule.matchLevel}
                        onValueChange={v => updateRule(rule.id, { matchLevel: v as ClassificationLevel })}
                      >
                        <SelectTrigger className="h-7 w-full text-xs hideIcon" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVEL_OPTIONS.map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-1.5 px-1">
                      <Input
                        className="h-7 text-xs w-full"
                        value={rule.matchValues}
                        onChange={e => updateRule(rule.id, { matchValues: e.target.value })}
                        placeholder="输入匹配值，逗号分隔"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center text-muted-foreground">→</td>
                    <td className="py-1.5 px-1">
                      <Select
                        value={rule.targetLevel}
                        onValueChange={v => updateRule(rule.id, { targetLevel: v as ClassificationLevel })}
                      >
                        <SelectTrigger className="h-7 w-full text-xs hideIcon" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVEL_OPTIONS.map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-1.5 px-1">
                      <Select
                        value={rule.matchMode}
                        onValueChange={v => updateRule(rule.id, { matchMode: v as MatchMode })}
                      >
                        <SelectTrigger className="h-7 w-full text-xs hideIcon" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODE_OPTIONS.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          <span className="text-xs text-muted-foreground">{localRules.length} 条规则</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={restoreDefaults}>
              <RotateCcw className="w-3 h-3 mr-1" />
              恢复预设
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={addRule}>
              + 添加
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={onClose}>取消</Button>
            <Button size="sm" className="text-xs h-7" onClick={() => onConfirm(localRules)}>确认</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// 主组件
// ============================================================
export function TopTool(_props: TopToolProps) {
  // 核心数据状态（持久化到localStorage，切换工具不丢失）
  const [rawInput, setRawInput] = useLocalStorage<string>('top_raw_input', '');
  const [convertedRecords, setConvertedRecords] = useLocalStorage<TopConvertedRecord[]>('top_converted_records', []);
  const [processedData, setProcessedData] = useLocalStorage<ProcessedData | null>('top_processed_data', null);
  const [resultOutput, setResultOutput] = useLocalStorage<string>('top_result_output', '');
  const [activeTab, setActiveTab] = useLocalStorage<string>('top_active_tab', 'process');
  const [status, setStatus] = useState('就绪');

  // 设置状态
  const [settings, setSettings] = useLocalStorage<TopSettings>('top_settings', DEFAULT_SETTINGS);

  // 弹窗状态
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showCustomDisplayDialog, setShowCustomDisplayDialog] = useState(false);
  const [showCategoryMergeDialog, setShowCategoryMergeDialog] = useState(false);

  // 情绪分层状态
  const [emotionLevel, setEmotionLevel] = useLocalStorage<string>('top_emotion_level', 'L3');

  // 历史记录状态
  const [historyRecords, setHistoryRecords] = useLocalStorage<TopHistoryRecord[]>('top_history_v2', []);

  // 兼容性处理：旧 settings 没有 categoryMergeRules 字段，自动补全
  useEffect(() => {
    if (!settings.categoryMergeRules) {
      setSettings(prev => ({
        ...prev,
        categoryMergeRules: DEFAULT_MERGE_RULES.map(r => ({ ...r })),
      }));
    }
  }, []);

  // ============================================================
  // 处理逻辑
  // ============================================================

  const handleOneClickProcess = useCallback(() => {
    if (!rawInput.trim()) {
      toast.error('请输入原始数据');
      return;
    }

    setStatus('处理中...');
    try {
      // 1. 解析原始数据
      const rawRecords = parseRawInput(rawInput);
      if (rawRecords.length === 0) {
        toast.error('无法解析数据，请检查输入格式');
        setStatus('解析失败');
        return;
      }

      // 2. 转换数据
      const converted = convertData(rawRecords);
      setConvertedRecords(converted);

      // 3. 处理数据
      let data = processData(converted, settings);

      // 4. 计算满意度
      data = calculateSatisfaction(data, converted, settings);
      setProcessedData(data);

      if (!data) {
        toast.warning('没有匹配的数据');
        setStatus('无匹配数据');
        return;
      }

      // 5. 构建输出
      const output = buildSatisfactionOutput(data, settings);
      setResultOutput(output);

      // 6. 自动保存到历史记录
      const firstRecord = rawRecords[0];
      const fullDateTime = firstRecord?.会话开始时间 || '';
      // 只取日期部分（2026-04-20 16:32:42 → 2026-04-20）
      const datePart = fullDateTime.split(' ')[0] || new Date().toLocaleString('zh-CN').split(' ')[0];
      const recordName = `TOP分析_${datePart}`;
      const newRecord: TopHistoryRecord = {
        id: Date.now().toString(),
        name: recordName,
        created_at: new Date().toLocaleString('zh-CN'),
        rawInput,
        convertedRecords: converted,
        processedData: data,
        resultOutput: output,
        settings: { ...settings },
        recordCount: rawRecords.length,
      };
      setHistoryRecords(prev => {
        const newRecords = [newRecord, ...prev];
        if (newRecords.length > MAX_TOP_HISTORY) {
          return newRecords.slice(0, MAX_TOP_HISTORY);
        }
        return newRecords;
      });

      setStatus(`处理完成: ${rawRecords.length}条数据`);
      toast.success(`处理完成: ${rawRecords.length}条数据`);

      // 切换到结果分析页签
      setActiveTab('result');
    } catch (error) {
      console.error(error);
      toast.error('处理出错');
      setStatus('处理出错');
    }
  }, [rawInput, settings, emotionLevel]);

  const fallbackCopyToClipboard = (text: string): boolean => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch {
      success = false;
    }
    document.body.removeChild(textArea);
    return success;
  };

  const copyToClipboard = (text: string): boolean => {
    if (!text || text.length === 0) return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopyToClipboard(text);
      });
      return true;
    }
    return fallbackCopyToClipboard(text);
  };

  const handleCopyResult = useCallback(() => {
    if (!resultOutput || resultOutput.trim().length === 0) {
      toast.error('没有可复制的内容，请先处理数据');
      return;
    }
    const ok = copyToClipboard(resultOutput);
    if (ok) toast.success('已复制分析结果');
    else toast.error('复制失败');
  }, [resultOutput]);

  const handleCopyTable = useCallback(() => {
    if (!processedData || Object.keys(processedData).length === 0) {
      toast.error('没有可复制的数据，请先处理数据');
      return;
    }
    const tableOutput = buildTableOutput(processedData, settings);
    if (!tableOutput || tableOutput.trim().length === 0) {
      toast.error('表格数据为空');
      return;
    }
    const ok = copyToClipboard(tableOutput);
    if (ok) toast.success('表格数据已复制，可直接粘贴到Excel');
    else toast.error('复制失败');
  }, [processedData, settings]);

  const handleClearAll = useCallback(() => {
    setRawInput('');
    setResultOutput('');
    setConvertedRecords([]);
    setProcessedData(null);
    setStatus('已清空');
    toast.success('已清空所有内容');
  }, [setRawInput, setResultOutput, setConvertedRecords, setProcessedData]);

  // 当设置改变时自动刷新分析
  const refreshAnalysis = useCallback(() => {
    if (!convertedRecords.length || !processedData) return;
    try {
      let data = processData(convertedRecords, settings);
      data = calculateSatisfaction(data, convertedRecords, settings);
      setProcessedData(data);
      if (data) {
        const output = buildSatisfactionOutput(data, settings);
        setResultOutput(output);
      }
    } catch (error) {
      console.error(error);
    }
  }, [convertedRecords, settings]);

  // ============================================================
  // 设置更新
  // ============================================================

  const updateSetting = <K extends keyof TopSettings>(key: K, value: TopSettings[K]) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      return newSettings;
    });
  };

  // 设置变化后自动刷新
  useEffect(() => {
    const timeout = setTimeout(() => {
      refreshAnalysis();
    }, 300);
    return () => clearTimeout(timeout);
  }, [settings]);

  // ============================================================
  // 渲染设置面板
  // ============================================================

  const renderSettingsPanel = () => (
    <div className="space-y-2">
      {/* 显示模式 */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">显示模式</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'topN', label: 'TOP N' },
            { value: 'all', label: '全量' },
            { value: 'top5Bad', label: 'TOP5+差评' },
          ].map(opt => (
            <Button
              key={opt.value}
              variant={settings.displayMode === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('displayMode', opt.value as DisplayMode)}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 显示数量 */}
      {settings.displayMode === 'topN' && (
        <div>
          <Label className="text-sm font-semibold mb-2 block">显示数量</Label>
          <Select value={String(settings.topN)} onValueChange={v => updateSetting('topN', Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[3, 5, 10, 15, 20, 30, 50].map(n => (
                <SelectItem key={n} value={String(n)}>TOP {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 分组筛选 */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">分组筛选</Label>
        <Select value={settings.groupFilter} onValueChange={v => updateSetting('groupFilter', v as TopSettings['groupFilter'])}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部</SelectItem>
            <SelectItem value="基础">基础</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 满意度筛选 */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">满意度筛选</Label>
        <Select value={settings.satisfactionFilter} onValueChange={v => updateSetting('satisfactionFilter', v as TopSettings['satisfactionFilter'])}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部</SelectItem>
            <SelectItem value="未评价">未评价</SelectItem>
            <SelectItem value="评价">评价</SelectItem>
            <SelectItem value="满意">满意</SelectItem>
            <SelectItem value="一般">一般</SelectItem>
            <SelectItem value="不满意">不满意</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 特殊处理 */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">特殊处理</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs cursor-pointer" htmlFor="show-emotion">L3情绪占比</Label>
            <Switch id="show-emotion" checked={settings.showEmotionL3} onCheckedChange={v => updateSetting('showEmotionL3', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs cursor-pointer" htmlFor="hide-project">项目渠道隐藏</Label>
            <Switch id="hide-project" checked={settings.hideProjectChannel} onCheckedChange={v => updateSetting('hideProjectChannel', v)} />
          </div>
        </div>
      </div>

      {/* 关键词筛选 */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">关键词筛选</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch checked={settings.enableIncludeKeywords} onCheckedChange={v => updateSetting('enableIncludeKeywords', v)} />
            <Label className="text-xs">包含关键词</Label>
          </div>
          {settings.enableIncludeKeywords && (
            <Input
              placeholder="多个关键词用逗号分隔"
              value={settings.includeKeywords}
              onChange={e => updateSetting('includeKeywords', e.target.value)}
              className="text-sm"
            />
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.enableExcludeKeywords} onCheckedChange={v => updateSetting('enableExcludeKeywords', v)} />
            <Label className="text-xs">排除关键词</Label>
          </div>
          {settings.enableExcludeKeywords && (
            <Input
              placeholder="多个关键词用逗号分隔"
              value={settings.excludeKeywords}
              onChange={e => updateSetting('excludeKeywords', e.target.value)}
              className="text-sm"
            />
          )}
        </div>
      </div>

      {/* 配置按钮 */}
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowCategoryDialog(true)}>
          <Settings className="w-3 h-3 mr-1" />
          分类顺序配置
        </Button>
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowCustomDisplayDialog(true)}>
          <Settings className="w-3 h-3 mr-1" />
          自定义显示配置
        </Button>
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowCategoryMergeDialog(true)}>
          <Settings className="w-3 h-3 mr-1" />
          自定义分类配置
          {settings.categoryMergeRules && settings.categoryMergeRules.filter(r => r.enabled).length > 0 && (
            <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1 rounded">
              {settings.categoryMergeRules.filter(r => r.enabled).length}
            </span>
          )}
        </Button>
      </div>
    </div>
  );

  // ============================================================
  // 渲染结果面板
  // ============================================================

  const renderResultPanel = () => (
    <>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          分析结果
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyResult}>
            <Copy className="w-3.5 h-3.5 mr-1" />
            复制
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopyTable}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            复制表格
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pb-3">
        <ScrollArea className="flex-1 border rounded-lg bg-gray-50 p-4">
          {resultOutput ? (
            <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{resultOutput}</pre>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>请先处理数据</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </>
  );

  // ============================================================
  // 渲染情绪分层
  // ============================================================

  // 删除历史记录
  const handleDeleteHistory = useCallback((id: string) => {
    setHistoryRecords(prev => prev.filter(r => r.id !== id));
    toast.success('记录已删除');
  }, [setHistoryRecords]);

  // 加载历史记录
  const handleLoadHistory = useCallback((record: TopHistoryRecord) => {
    setRawInput(record.rawInput);
    setConvertedRecords(record.convertedRecords);
    setProcessedData(record.processedData);
    setResultOutput(record.resultOutput);
    setActiveTab('result');
    toast.success(`已加载记录: ${record.name}`);
  }, []);

  // 计算所有三组情绪分层数据
  const calculateAllEmotionStats = useCallback(() => {
    const allGroups = ['综合', 'VIP', '基础'];
    const results: Record<string, EmotionStats | null> = {};
    for (const group of allGroups) {
      results[group] = calculateEmotionDistribution(convertedRecords, group, emotionLevel, settings.satisfactionFilter);
    }
    return results;
  }, [convertedRecords, emotionLevel]);

  const renderEmotionLayer = () => {
    const allStats = calculateAllEmotionStats();
    const groups = ['综合', 'VIP', '基础'];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 h-[calc(100vh-220px)]">
        {/* 左侧：情绪等级选择 */}
        <Card className="overflow-auto">
          <CardHeader className="py-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Smile className="w-4 h-4 text-blue-600" />
              情绪等级
            </h3>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div>
              <Label className="text-sm font-semibold mb-2 block">情绪等级</Label>
              <Select value={emotionLevel} onValueChange={v => {
                setEmotionLevel(v);
                toast.success('已切换情绪等级');
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L1">L1</SelectItem>
                  <SelectItem value="L2">L2</SelectItem>
                  <SelectItem value="L3">L3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                if (!convertedRecords || convertedRecords.length === 0) {
                  toast.error('没有可复制的数据，请先处理数据');
                  return;
                }
                const text = buildEmotionL3Table(convertedRecords);
                if (!text || text.length === 0) {
                  toast.error('数据为空');
                  return;
                }
                const ok = copyToClipboard(text);
                if (ok) toast.success('L3情绪分层数据已复制，可直接粘贴到Excel');
                else toast.error('复制失败');
              }}
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              复制
            </Button>
          </CardContent>
        </Card>

        {/* 右侧：三组数据表格 */}
        <ScrollArea className="flex-1">
          <div className="space-y-6">
            {convertedRecords.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                <Smile className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>请先处理数据</p>
              </div>
            ) : (
              groups.map(group => {
                const stats = allStats[group];
                if (!stats) return null;
                return (
                  <Card key={group}>
                    <CardHeader className="py-2 px-4 bg-gray-50">
                      <h3 className="text-sm font-bold">{group}（{emotionLevel}）</h3>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-40">情绪等级占比</TableHead>
                            <TableHead className="text-center">满意</TableHead>
                            <TableHead className="text-center">中评</TableHead>
                            <TableHead className="text-center">差评</TableHead>
                            <TableHead className="text-center">未评价</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.rows.map((row, idx) => {
                            const isRateRow = String(row[0]).includes('占比');
                            return (
                              <TableRow key={idx} className={idx === 0 ? 'bg-gray-50 font-medium' : ''}>
                                <TableCell>{row[0]}</TableCell>
                                <TableCell className="text-center">{isRateRow ? `${row[1]}%` : row[1]}</TableCell>
                                <TableCell className="text-center">{isRateRow ? `${row[2]}%` : row[2]}</TableCell>
                                <TableCell className="text-center">{isRateRow ? `${row[3]}%` : row[3]}</TableCell>
                                <TableCell className="text-center">{isRateRow ? `${row[4]}%` : row[4]}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // ============================================================
  // 主渲染
  // ============================================================

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="process" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">数据处理</span>
          </TabsTrigger>
          <TabsTrigger value="result" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">结果分析</span>
          </TabsTrigger>
          <TabsTrigger value="emotion" className="flex items-center gap-2">
            <Smile className="w-4 h-4" />
            <span className="hidden sm:inline">情绪分层</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">历史记录</span>
          </TabsTrigger>
        </TabsList>

        {/* 数据处理页签 */}
        <TabsContent value="process" className="mt-0">
          <Card className="flex flex-col h-[calc(100vh-260px)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                数据导入
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pb-3">
              <div className="text-sm font-semibold text-gray-700 mb-2">原始数据输入</div>
              <Textarea
                className="flex-1 font-mono text-xs resize-none"
                placeholder="请粘贴TOP原始数据（Tab分隔格式）..."
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
              />
              <div className="flex gap-2 mt-3">
                <Button onClick={handleOneClickProcess} className="bg-green-600 hover:bg-green-700">
                  <Play className="w-3.5 h-3.5 mr-1" />
                  一键处理
                </Button>
                <Button variant="destructive" onClick={handleClearAll}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  清空
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 数据处理状态栏 */}
          <div className="mt-3 flex items-center justify-between px-4 py-2 bg-gray-100 rounded-lg text-sm">
            <span className="text-gray-500">{status}</span>
            <span className="text-gray-400 text-xs">
              快捷键: F5一键处理 | Ctrl+O导入 | Ctrl+H历史
            </span>
          </div>
        </TabsContent>

        {/* 结果分析页签 */}
        <TabsContent value="result" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 min-h-[calc(100vh-220px)]">
            {/* 左侧：设置面板 */}
            <Card className="gap-1">
              <CardHeader className="pt-3 pb-0">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  分析设置
                </h3>
              </CardHeader>
              <CardContent className="pt-0">
                {renderSettingsPanel()}
              </CardContent>
            </Card>

            {/* 右侧：结果面板 */}
            <Card>
              {renderResultPanel()}
            </Card>
          </div>
        </TabsContent>

        {/* 情绪分层页签 */}
        <TabsContent value="emotion" className="mt-0">
          {renderEmotionLayer()}
        </TabsContent>

        {/* 历史记录页签 */}
        <TabsContent value="history" className="mt-0">
          <div className="space-y-6">
            {/* 标题栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                  <span>📜</span> 历史记录
                </h2>
                <span className="text-sm text-muted-foreground">
                  共 {historyRecords.length} 条记录 (最多保存12条)
                </span>
              </div>
              <DataBackup storageKeys={['top_history_v2']} label="TOP历史记录" />
            </div>

            {/* 提示信息 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
              <span>💡</span>
              <span>点击"加载"按钮可恢复数据到数据处理页签</span>
            </div>

            {/* 空状态 */}
            {historyRecords.length === 0 && (
              <div className="text-center py-16 text-muted-foreground bg-white rounded-lg border border-dashed">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-lg font-medium">暂无历史记录</p>
                <p className="text-sm mt-2">在数据处理页签处理数据后，记录将自动保存到这里</p>
              </div>
            )}

            {/* 卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {historyRecords.map((record) => (
                <Card key={record.id} className="hover:shadow-sm transition-shadow border border-gray-200 h-[52px]">
                  <CardContent className="p-0 px-3 h-full">
                    <div className="flex items-center justify-between h-full">
                      <div className="flex-1 min-w-0">
                        {/* 记录名称 */}
                        <div className="font-medium text-gray-900 text-sm truncate leading-tight">
                          {record.name}
                        </div>
                        {/* 记录数和时间 */}
                        <div className="text-xs text-gray-500 leading-tight mt-0.5">
                          {record.recordCount}条记录 · {record.created_at}
                        </div>
                      </div>
                      {/* 操作按钮 */}
                      <div className="flex items-center gap-0.5 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleLoadHistory(record)}
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
                                确定要删除记录 "{record.name}" 吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteHistory(record.id)}
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
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 弹窗 */}
      <CategoryMergeConfigDialog
        open={showCategoryMergeDialog}
        onClose={() => setShowCategoryMergeDialog(false)}
        rules={settings.categoryMergeRules || []}
        onConfirm={newRules => {
          updateSetting('categoryMergeRules', newRules);
          setShowCategoryMergeDialog(false);
          toast.success('分类合并配置已更新');
        }}
      />
      <CategoryOrderDialog
        open={showCategoryDialog}
        onClose={() => setShowCategoryDialog(false)}
        order={settings.categoryOrder}
        onConfirm={newOrder => {
          updateSetting('categoryOrder', newOrder);
          setShowCategoryDialog(false);
          toast.success('分类顺序已更新');
        }}
      />
      <CustomDisplayDialog
        open={showCustomDisplayDialog}
        onClose={() => setShowCustomDisplayDialog(false)}
        config={settings.customDisplay}
        onConfirm={newConfig => {
          updateSetting('customDisplay', newConfig);
          setShowCustomDisplayDialog(false);
          toast.success('自定义显示配置已更新');
        }}
      />
    </div>
  );
}
