import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  parseKPIData,
  parseFeedbackData,
  mergeFeedbackData,
  addGradesToData,
  calculateSummary,
  calculateCustomFields,
  generateTableText,
} from '@/lib/kpi-utils';
import type { KPIRecord, CustomField, KPIConfig } from '@/types/kpi';
import { useStaffContext } from '@/contexts/StaffContext';
import {
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  Star,
  Crown,
  User,
  Copy,
  Upload,
} from 'lucide-react';

interface ImportDataState {
  kpiData: string;
  feedbackData: string;
  processedData: KPIRecord[];
}

interface DataImportProps {
  importState: ImportDataState;
  onUpdateImportState: (updates: Partial<ImportDataState>) => void;
  customFields: CustomField[];
  config: KPIConfig;
  onSaveToHistory?: (dateRange: string, kpiData: string, feedbackData: string, processedData: KPIRecord[]) => void;
}

const GRADE_COLORS: Record<string, string> = {
  S: '#FFD700',  // 亮金色 - 卓越
  A: '#3498DB',  // 天蓝色 - 优秀
  B: '#2ECC71',  // 翠绿色 - 良好
  C: '#9B59B6',  // 紫罗兰色 - 合格
  D: '#E74C3C',  // 正红色 - 待改进
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  基础: <User className="w-4 h-4" />,
  VIP: <Star className="w-4 h-4" />,
  组长: <Crown className="w-4 h-4" />,
};

export function DataImport({ 
  importState,
  onUpdateImportState,
  customFields,
  config,
  onSaveToHistory,
}: DataImportProps) {
  const [kpiData, setKpiData] = useState(importState.kpiData);
  const [feedbackData, setFeedbackData] = useState(importState.feedbackData);
  const [processedData, setProcessedData] = useState<KPIRecord[]>(importState.processedData);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('✅ 就绪');

  // 获取人员列表，用于过滤：仅保留已转正人员参与KPI考核
  const { staffList } = useStaffContext();
  const validStaffNames = new Set(
    staffList.filter(s => s.status === '已转正').map(s => s.name)
  );

  // 详细数据筛选
  const [filterGroup, setFilterGroup] = useState<string>('全部');
  const [filterType, setFilterType] = useState<string>('全部');

  // 筛选后的数据（组长排在最前面，仅保留已转正人员参与KPI考核）
  const filteredData = processedData.filter(r => {
    if (!validStaffNames.has(r.姓名 || '')) return false;
    if (filterGroup !== '全部' && r.组别 !== filterGroup) return false;
    if (filterType !== '全部' && r.客服类型 !== filterType) return false;
    return true;
  }).sort((a, b) => {
    const typeOrder: Record<string, number> = { '组长': 0, 'VIP': 1, '基础': 2 };
    const orderA = typeOrder[a.客服类型 || '基础'] ?? 99;
    const orderB = typeOrder[b.客服类型 || '基础'] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.姓名 || '').localeCompare(b.姓名 || '');
  });

  // 同步外部状态变化
  useEffect(() => {
    setKpiData(importState.kpiData);
    setFeedbackData(importState.feedbackData);
    setProcessedData(importState.processedData);
  }, [importState]);

  // 当数据变化时更新全局状态
  const updateKpiData = useCallback((value: string) => {
    setKpiData(value);
    onUpdateImportState({ kpiData: value });
  }, [onUpdateImportState]);

  const updateFeedbackData = useCallback((value: string) => {
    setFeedbackData(value);
    onUpdateImportState({ feedbackData: value });
  }, [onUpdateImportState]);

  const updateProcessedData = useCallback((data: KPIRecord[]) => {
    setProcessedData(data);
    onUpdateImportState({ processedData: data });
  }, [onUpdateImportState]);

  const handleProcess = useCallback(() => {
    if (!kpiData.trim()) {
      setStatus('error');
      setStatusMessage('⚠️ 请粘贴KPI报表数据');
      return;
    }

    setStatus('processing');
    setStatusMessage('⏳ 正在处理...');

    try {
      let parsedKPI = parseKPIData(kpiData);
      
      if (feedbackData.trim()) {
        const parsedFeedback = parseFeedbackData(feedbackData);
        parsedKPI = mergeFeedbackData(parsedKPI, parsedFeedback);
      }

      // 计算自定义字段（计算字段）
      const calculatedFields = customFields.filter(f => f.is_calculated);
      if (calculatedFields.length > 0) {
        parsedKPI = parsedKPI.map(record => {
          const recordWithCalculatedFields = calculateCustomFields(
            record as unknown as Record<string, unknown>, 
            calculatedFields
          );
          return { ...record, ...recordWithCalculatedFields } as KPIRecord;
        });
      }

      parsedKPI = addGradesToData(parsedKPI, config);
      updateProcessedData(parsedKPI);
      setStatus('success');
      setStatusMessage(`✅ 处理完成：${parsedKPI.length}条KPI数据`);

      // 自动保存到历史记录
      if (parsedKPI.length > 0 && onSaveToHistory) {
        const dateRange = parsedKPI[0]?.日期范围 || '未知';
        onSaveToHistory(dateRange, kpiData, feedbackData, parsedKPI);
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage('❌ 处理出错');
      console.error(error);
    }
  }, [kpiData, feedbackData, updateProcessedData, onSaveToHistory]);

  const handleClear = useCallback(() => {
    setKpiData('');
    setFeedbackData('');
    setProcessedData([]);
    onUpdateImportState({ kpiData: '', feedbackData: '', processedData: [] });
    setStatus('idle');
    setStatusMessage('✅ 已清空');
  }, [onUpdateImportState]);

  const summary = processedData.length > 0 ? calculateSummary(processedData) : null;

  return (
    <div className="space-y-6">
      {/* 数据输入区 - 合并为大Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            数据导入
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium flex items-center gap-2 mb-2">
                <span>📊</span> KPI报表数据（必填）
              </div>
              <Textarea
                placeholder={`日期范围\t客服类型\t组别\t姓名\t有效会话量\t满意\t一般\t不满意\t满意率\t一般率\t不满意率\t投诉数`}
                value={kpiData}
                onChange={(e) => updateKpiData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 提示：从报表复制数据，包含表头，制表符分隔
              </p>
            </div>

            <div>
              <div className="text-sm font-medium flex items-center gap-2 mb-2">
                <span>📝</span> 有效反馈数据（选填）
              </div>
              <Textarea
                placeholder={`A组\t有效反馈数\t对应达成结果\tB组\t有效反馈数\t对应达成结果`}
                value={feedbackData}
                onChange={(e) => updateFeedbackData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 提示：反馈数据，选填
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleProcess}
                disabled={status === 'processing'}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-1" />
                开始处理
              </Button>
              <Button onClick={handleClear} variant="destructive" disabled={!kpiData && !feedbackData}>
                <Trash2 className="w-4 h-4 mr-1" />
                一键清空
              </Button>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
              {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
              {status === 'processing' && <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
              <span className={`font-medium ${
                status === 'success' ? 'text-green-600' :
                status === 'error' ? 'text-red-600' :
                status === 'processing' ? 'text-blue-600' :
                'text-gray-600'
              }`}>
                {statusMessage}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 处理结果 */}
      {processedData.length > 0 && summary && (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="text-sm opacity-90">总考核人数</span>
                </div>
                <div className="text-3xl font-bold mt-2">{processedData.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span className="text-sm opacity-90">基础客服</span>
                </div>
                <div className="text-3xl font-bold mt-2">{summary.types['基础'] || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-orange-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  <span className="text-sm opacity-90">VIP客服</span>
                </div>
                <div className="text-3xl font-bold mt-2">{summary.types['VIP'] || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  <span className="text-sm opacity-90">组长</span>
                </div>
                <div className="text-3xl font-bold mt-2">{summary.types['组长'] || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* 筛选栏 */}
          <div className="flex items-center gap-4 bg-white border rounded-lg px-4 py-3">
            <span className="text-sm text-gray-500 font-medium">筛选：</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">组别</span>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="全部">全部组别</SelectItem>
                  {[...new Set(processedData.map(r => r.组别).filter(Boolean))].sort().map(g => (
                    <SelectItem key={g} value={g!}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">类型</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="全部">全部类型</SelectItem>
                  <SelectItem value="基础">基础客服</SelectItem>
                  <SelectItem value="VIP">VIP客服</SelectItem>
                  <SelectItem value="组长">组长</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto text-xs text-gray-400">
              共 {filteredData.length} 人
            </div>
          </div>

          {/* 指标等级分布统计 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>📊</span> 指标等级分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(['basic', 'vip', 'leader'] as const).map(dim => {
                  // 根据筛选类型过滤显示（filterType: 全部/基础/VIP/组长，dim: basic/vip/leader）
                  const dimensionName = dim === 'basic' ? '基础客服' : dim === 'vip' ? 'VIP客服' : '组长';
                  const dimToType = { basic: '基础', vip: 'VIP', leader: '组长' };
                  if (filterType !== '全部' && dimToType[dim] !== filterType) return null;
                  
                  const indicators = config[dim].indicators;
                  if (indicators.length === 0) return null;
                  
                  return (
                    <div key={dim} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        {dim === 'basic' && <User className="w-4 h-4 text-green-500" />}
                        {dim === 'vip' && <Star className="w-4 h-4 text-orange-500" />}
                        {dim === 'leader' && <Crown className="w-4 h-4 text-purple-500" />}
                        {dimensionName}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {indicators.map((ind, idx) => {
                          // 统计该指标各等级人数
                          const gradeCount: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
                          
                          filteredData.forEach(record => {
                            let recordDim: 'basic' | 'vip' | 'leader' = 'basic';
                            if (record.客服类型 === 'VIP') recordDim = 'vip';
                            else if (record.客服类型 === '组长') recordDim = 'leader';
                            
                            // 只统计当前维度的记录
                            if (recordDim !== dim) return;
                            
                            // 获取该指标的值
                            const value = record[ind.column_name as keyof KPIRecord] as number;
                            if (value === undefined) return;
                            
                            // 先判断门槛是否达成（门槛默认受考核周期影响，与进阶独立）
                            let thresholdPass = true;
                            if (ind.threshold.enabled) {
                              const thresholdValue = record[ind.threshold.field as keyof KPIRecord] as number;
                              if (thresholdValue !== undefined) {
                                const thresholdAffectedByPeriod = ind.threshold.affected_by_period !== false;
                                const thresholdMultiplier = (config.assessment_period === 'quarterly' && thresholdAffectedByPeriod) ? 3 : 1;
                                const adjustedThresholdValue = ind.threshold.value * thresholdMultiplier;
                                switch (ind.threshold.condition) {
                                  case '>=': thresholdPass = thresholdValue >= adjustedThresholdValue; break;
                                  case '<=': thresholdPass = thresholdValue <= adjustedThresholdValue; break;
                                  case '>': thresholdPass = thresholdValue > adjustedThresholdValue; break;
                                  case '<': thresholdPass = thresholdValue < adjustedThresholdValue; break;
                                  case '==': thresholdPass = thresholdValue === adjustedThresholdValue; break;
                                  case '!=': thresholdPass = thresholdValue !== adjustedThresholdValue; break;
                                }
                              }
                            }
                            
                            let indicatorGrade = 'D';
                            // 门槛未达成，等级强制为D
                            if (thresholdPass) {
                              // 进阶受 affected_by_period 开关控制（默认true）
                              const gradeAffectedByPeriod = ind.affected_by_period !== false;
                              const gradeMultiplier = (config.assessment_period === 'quarterly' && gradeAffectedByPeriod) ? 3 : 1;
                              const adjustedValue = value / gradeMultiplier;
                              
                              // 计算等级
                              const sortedGrades = [...ind.grades].sort((a, b) => b.min_value - a.min_value);
                              for (const g of sortedGrades) {
                                if (adjustedValue >= g.min_value && (g.max_value === null || adjustedValue <= g.max_value)) {
                                  indicatorGrade = g.grade;
                                  break;
                                }
                              }
                            }
                            gradeCount[indicatorGrade]++;
                          });
                          
                          return (
                            <div key={idx} className="bg-gray-50 rounded-lg p-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">{ind.name}</div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {['S', 'A', 'B', 'C', 'D'].map(grade => (
                                  <div key={grade} className="flex items-center gap-1">
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: GRADE_COLORS[grade] }}>
                                      {grade}
                                    </span>
                                    <span className="text-sm font-medium">{gradeCount[grade]}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 详细数据表 */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>📋</span> 详细数据
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const text = generateTableText(filteredData, config);
                  navigator.clipboard.writeText(text).then(() => {
                    toast.success('表格数据已复制，可直接粘贴到Excel');
                  }).catch(() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    toast.success('表格数据已复制，可直接粘贴到Excel');
                  });
                }}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <Copy className="w-4 h-4 mr-1" />
                复制文本
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto border border-gray-300 rounded-lg">
                <Table className="border-collapse">
                  <TableHeader className="sticky top-0 z-20">
                    <TableRow className="border-b border-gray-300">
                      <TableHead className="sticky left-0 z-30 min-w-[80px] border-r border-gray-200">姓名</TableHead>
                      <TableHead className="min-w-[60px] border-r border-gray-200">组别</TableHead>
                      <TableHead className="min-w-[70px] border-r border-gray-200">类型</TableHead>
                      {/* 动态生成指标列头 - 收集所有维度的不重复指标 */}
                      {filteredData.length > 0 && (() => {
                        // 获取自定义字段的显示名称
                        const getFieldDisplayName = (columnName: string): string => {
                          const field = config.global_custom_fields?.find(f => f.column_name === columnName);
                          return field?.name || columnName;
                        };
                        
                        // 收集所有维度的不重复指标，保持顺序
                        const allIndicators: { column_name: string; hasThreshold: boolean; thresholdField?: string; hasBonus: boolean }[] = [];
                        const seenNames = new Set<string>();
                        
                        // 按顺序遍历所有维度
                        (['basic', 'vip', 'leader'] as const).forEach(dim => {
                          config[dim].indicators.forEach(ind => {
                            if (!seenNames.has(ind.column_name)) {
                              seenNames.add(ind.column_name);
                              allIndicators.push({
                                column_name: ind.column_name,
                                hasThreshold: ind.threshold.enabled,
                                thresholdField: ind.threshold.enabled ? ind.threshold.field : undefined,
                                hasBonus: false // 稍后统一计算
                              });
                            }
                          });
                        });
                        
                        // 统一计算 hasBonus：任一维度有此指标且有奖金配置
                        allIndicators.forEach(indInfo => {
                          (['basic', 'vip', 'leader'] as const).forEach(dim => {
                            const dimInd = config[dim].indicators.find(i => i.column_name === indInfo.column_name);
                            if (dimInd?.grades.some(g => (g.bonus || 0) > 0)) {
                              indInfo.hasBonus = true;
                            }
                          });
                        });
                        
                        return allIndicators.flatMap((indInfo, idx) => {
                          const headers = [];
                          // 只要任一维度有此指标的门槛，就显示门槛列
                          let anyThresholdEnabled = false;
                          let thresholdFieldColumn = '';
                          (['basic', 'vip', 'leader'] as const).forEach(dim => {
                            const dimInd = config[dim].indicators.find(i => i.column_name === indInfo.column_name);
                            if (dimInd?.threshold.enabled) {
                              anyThresholdEnabled = true;
                              thresholdFieldColumn = dimInd.threshold.field;
                            }
                          });
                          
                          if (anyThresholdEnabled) {
                            headers.push(
                              <TableHead key={`th-threshold-${idx}`} className="text-orange-600 min-w-[70px] whitespace-nowrap text-center border-r border-gray-200">
                                <div>{getFieldDisplayName(thresholdFieldColumn)}</div>
                                <div className="text-xs">门槛</div>
                              </TableHead>
                            );
                          }
                          headers.push(
                            <TableHead key={`th-value-${idx}`} className="min-w-[70px] whitespace-nowrap text-center border-r border-gray-200">
                              <div>{getFieldDisplayName(indInfo.column_name)}</div>
                              <div className="text-xs">进阶</div>
                            </TableHead>
                          );
                          // 有奖金时同时显示等级和奖金列，否则只显示等级列
                          headers.push(
                            <TableHead key={`th-grade-${idx}`} className="min-w-[50px] whitespace-nowrap text-center border-r border-gray-200">
                              <div>等级</div>
                            </TableHead>
                          );
                          if (indInfo.hasBonus) {
                            headers.push(
                              <TableHead key={`th-bonus-${idx}`} className="min-w-[60px] whitespace-nowrap text-center text-green-600 border-r border-gray-200">
                                <div>奖金</div>
                              </TableHead>
                            );
                          }
                          return headers;
                        });
                      })()}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((record, index) => {
                      let dimension: 'basic' | 'vip' | 'leader' = 'basic';
                      if (record.客服类型 === 'VIP') dimension = 'vip';
                      else if (record.客服类型 === '组长') dimension = 'leader';
                      const indicators = config[dimension].indicators;
                      
                      // 获取当前记录维度的指标名称集合
                      const recordIndicatorMap = new Map(indicators.map(ind => [ind.column_name, ind]));
                      
                      // 收集所有不重复指标名称（与表头一致）
                      const allIndicatorNames: string[] = [];
                      const seenNames = new Set<string>();
                      (['basic', 'vip', 'leader'] as const).forEach(dim => {
                        config[dim].indicators.forEach(ind => {
                          if (!seenNames.has(ind.column_name)) {
                            seenNames.add(ind.column_name);
                            allIndicatorNames.push(ind.column_name);
                          }
                        });
                      });
                      
                      return (
                        <TableRow key={index} className="border-b border-gray-200">
                          <TableCell className="font-medium sticky left-0 bg-white z-10 border-r border-gray-200">{record.姓名}</TableCell>
                          <TableCell className="border-r border-gray-200">{record.组别}</TableCell>
                          <TableCell className="border-r border-gray-200">
                            <div className="flex items-center gap-1">
                              {TYPE_ICONS[record.客服类型] || <User className="w-4 h-4" />}
                              <span>{record.客服类型}</span>
                            </div>
                          </TableCell>
                          {/* 为每个指标生成单元格 */}
                          {allIndicatorNames.flatMap((indName, idx) => {
                            const ind = recordIndicatorMap.get(indName);
                            const cells = [];
                            
                            // 检查是否需要显示门槛列（任一维度有此指标的门槛）
                            let anyThresholdEnabled = false;
                            (['basic', 'vip', 'leader'] as const).forEach(dim => {
                              const dimInd = config[dim].indicators.find(i => i.column_name === indName);
                              if (dimInd?.threshold.enabled) anyThresholdEnabled = true;
                            });
                            
                            // 检查是否有奖金配置
                            let hasBonusConfig = false;
                            (['basic', 'vip', 'leader'] as const).forEach(dim => {
                              const dimInd = config[dim].indicators.find(i => i.column_name === indName);
                              if (dimInd?.grades.some(g => (g.bonus || 0) > 0)) hasBonusConfig = true;
                            });
                            
                            // 门槛列（与表头一致）
                            if (anyThresholdEnabled) {
                              if (ind?.threshold.enabled) {
                                const thresholdValue = record[ind.threshold.field as keyof KPIRecord] as number;
                                let isPass = false;
                                if (thresholdValue !== undefined) {
                                  const thresholdAffectedByPeriod = ind.threshold.affected_by_period !== false;
                                  const thresholdMultiplier = (config.assessment_period === 'quarterly' && thresholdAffectedByPeriod) ? 3 : 1;
                                  const adjustedThresholdValue = ind.threshold.value * thresholdMultiplier;
                                  switch (ind.threshold.condition) {
                                    case '>=': isPass = thresholdValue >= adjustedThresholdValue; break;
                                    case '<=': isPass = thresholdValue <= adjustedThresholdValue; break;
                                    case '>': isPass = thresholdValue > adjustedThresholdValue; break;
                                    case '<': isPass = thresholdValue < adjustedThresholdValue; break;
                                    case '==': isPass = thresholdValue === adjustedThresholdValue; break;
                                    case '!=': isPass = thresholdValue !== adjustedThresholdValue; break;
                                  }
                                }
                                cells.push(
                                  <TableCell key={`cell-threshold-${idx}`} className="text-center border-r border-gray-200">
                                    <span className={isPass ? 'text-green-600' : 'text-red-500'}>
                                      {thresholdValue !== undefined ? thresholdValue : '-'}
                                    </span>
                                  </TableCell>
                                );
                              } else {
                                cells.push(<TableCell key={`cell-threshold-${idx}`} className="text-center border-r border-gray-200">-</TableCell>);
                              }
                            }
                            
                            // 进阶值列（总是显示，与表头一致）
                            const value = record[indName as keyof KPIRecord] as number;
                            let displayValue = '-';
                            if (ind && value !== undefined) {
                              if (ind.unit === '%') {
                                displayValue = `${value.toFixed(2)}%`;
                              } else if (ind.column_name === '服务分') {
                                displayValue = value.toFixed(2);
                              } else {
                                displayValue = String(value);
                              }
                            }
                            cells.push(
                              <TableCell key={`cell-value-${idx}`} className="text-center border-r border-gray-200">
                                {displayValue}
                              </TableCell>
                            );
                            
                            // 等级列（总是显示，与表头一致）
                            if (ind) {
                              let indicatorGrade = 'D';
                              let bonusAmount = 0;
                              
                              // 先判断门槛是否达成（门槛默认受考核周期影响，与进阶开关独立）
                              let thresholdPass = true;
                              if (ind.threshold.enabled) {
                                const thresholdValue = record[ind.threshold.field as keyof KPIRecord] as number;
                                if (thresholdValue !== undefined) {
                                  // 门槛默认受考核周期影响（除非显式设置 threshold.affected_by_period = false）
                                  const thresholdAffectedByPeriod = ind.threshold.affected_by_period !== false;
                                  const periodMultiplier = (config.assessment_period === 'quarterly' && thresholdAffectedByPeriod) ? 3 : 1;
                                  const adjustedThresholdValue = ind.threshold.value * periodMultiplier;
                                  switch (ind.threshold.condition) {
                                    case '>=': thresholdPass = thresholdValue >= adjustedThresholdValue; break;
                                    case '<=': thresholdPass = thresholdValue <= adjustedThresholdValue; break;
                                    case '>': thresholdPass = thresholdValue > adjustedThresholdValue; break;
                                    case '<': thresholdPass = thresholdValue < adjustedThresholdValue; break;
                                    case '==': thresholdPass = thresholdValue === adjustedThresholdValue; break;
                                    case '!=': thresholdPass = thresholdValue !== adjustedThresholdValue; break;
                                  }
                                }
                              }
                              
                              // 门槛未达成，等级强制为D
                              if (!thresholdPass) {
                                indicatorGrade = 'D';
                              } else if (value !== undefined) {
                                // 考核周期系数：季度考核时，受影响的指标实际值需要除以3再与等级标准比较
                                // 使用 affected_by_period 开关控制（默认true）
                                const affectedByPeriod = ind.affected_by_period !== false;
                                const periodMultiplier = (config.assessment_period === 'quarterly' && affectedByPeriod) ? 3 : 1;
                                const adjustedValue = value / periodMultiplier;
                                
                                const sortedGrades = [...ind.grades].sort((a, b) => b.min_value - a.min_value);
                                for (const g of sortedGrades) {
                                  if (adjustedValue >= g.min_value && (g.max_value === null || adjustedValue <= g.max_value)) {
                                    indicatorGrade = g.grade;
                                    bonusAmount = g.bonus || 0;
                                    break;
                                  }
                                }
                              }
                              
                              // 总是显示等级
                              cells.push(
                                <TableCell key={`cell-grade-${idx}`} className="text-center border-r border-gray-200">
                                  <Badge className="text-white text-xs" style={{ backgroundColor: GRADE_COLORS[indicatorGrade] }}>
                                    {indicatorGrade}
                                  </Badge>
                                </TableCell>
                              );
                              // 有奖金时额外显示奖金列
                              if (hasBonusConfig) {
                                cells.push(
                                  <TableCell key={`cell-bonus-${idx}`} className="text-center border-r border-gray-200">
                                    {bonusAmount > 0 ? (
                                      <span className="text-green-600 font-medium">+{bonusAmount}元</span>
                                    ) : '-'}
                                  </TableCell>
                                );
                              }
                            } else {
                              // 当前维度无此指标，生成空白等级列和奖金列
                              cells.push(<TableCell key={`cell-grade-${idx}`} className="text-center border-r border-gray-200">-</TableCell>);
                              if (hasBonusConfig) {
                                cells.push(<TableCell key={`cell-bonus-${idx}`} className="text-center border-r border-gray-200">-</TableCell>);
                              }
                            }
                            return cells;
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
