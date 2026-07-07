import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GRADE_COLORS, TYPE_ICONS } from '@/types/kpi';
import type { KPIConfig, KPIRecord, HistoryRecord } from '@/types/kpi';
import { BarChart3, TrendingUp, TrendingDown, Minus, Users, Calendar, ArrowRight, Target } from 'lucide-react';

interface DataCompareProps {
  records: HistoryRecord[];
  config: KPIConfig;
}

interface ComparisonItem {
  name: string;
  group: string;
  type: string;
  indicatorChanges: {
    indicatorName: string;
    columnName: string;
    unit: string;
    value1: number;
    value2: number;
    change: number;
    changePercent: number;
    grade1: string;
    grade2: string;
    gradeChange: number;
  }[];
}

interface DimensionSummary {
  dimension: string;
  totalCount: number;
  gradeChanges: {
    up: number;
    down: number;
    same: number;
  };
  avgValueChange: number;
}

export function DataCompare({ records, config }: DataCompareProps) {
  const [baseRecordId, setBaseRecordId] = useState('');
  const [currentRecordId, setCurrentRecordId] = useState('');
  const [comparisonData, setComparisonData] = useState<{
    baseRecord: HistoryRecord;
    currentRecord: HistoryRecord;
    comparisons: ComparisonItem[];
    dimensionSummaries: DimensionSummary[];
  } | null>(null);

  const recordOptions = useMemo(() => {
    return records.map(r => ({
      id: r.id,
      label: `${r.date_range} (${r.summary.total_count}人)`,
      dateRange: r.date_range,
    }));
  }, [records]);

  // 计算等级分数
  const getGradeScore = (grade: string) => {
    const scores: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
    return scores[grade] || 0;
  };

  // 计算指标等级
  const calculateIndicatorGrade = (value: number, indicatorConfig: { grades: { grade: string; min_value: number; max_value: number | null }[] }) => {
    const sortedGrades = [...indicatorConfig.grades].sort((a, b) => b.min_value - a.min_value);
    for (const g of sortedGrades) {
      if (value >= g.min_value && (g.max_value === null || value <= g.max_value)) {
        return g.grade;
      }
    }
    return 'D';
  };

  const handleCompare = useCallback(() => {
    if (!baseRecordId || !currentRecordId) {
      alert('请选择基准期和当期的记录');
      return;
    }

    if (baseRecordId === currentRecordId) {
      alert('基准期和当期不能选择同一个记录');
      return;
    }

    const baseRecord = records.find(r => r.id === baseRecordId);
    const currentRecord = records.find(r => r.id === currentRecordId);

    if (!baseRecord || !currentRecord) {
      alert('无法加载选中的记录');
      return;
    }

    // 构建人员对比数据
    const comparisons: ComparisonItem[] = [];
    const dimensionStats: Record<string, { up: number; down: number; same: number; totalChange: number; count: number }> = {
      '基础': { up: 0, down: 0, same: 0, totalChange: 0, count: 0 },
      'VIP': { up: 0, down: 0, same: 0, totalChange: 0, count: 0 },
      '组长': { up: 0, down: 0, same: 0, totalChange: 0, count: 0 },
    };

    // 遍历当期数据，找基准期对应人员
    for (const currentItem of currentRecord.processedData || []) {
      const baseItem = (baseRecord.processedData || []).find(
        b => b.姓名 === currentItem.姓名 && b.组别 === currentItem.组别
      );

      if (!baseItem) continue;

      const dimension = currentItem.客服类型 || '基础';
      const dimKey = dimension as '基础' | 'VIP' | '组长';
      const indicators = config[dimKey === '基础' ? 'basic' : dimKey === 'VIP' ? 'vip' : 'leader'].indicators;

      const indicatorChanges = indicators.map(ind => {
        const value1 = baseItem[ind.column_name as keyof KPIRecord] as number || 0;
        const value2 = currentItem[ind.column_name as keyof KPIRecord] as number || 0;
        const change = value2 - value1;
        const changePercent = value1 !== 0 ? (change / value1) * 100 : 0;
        
        const grade1 = calculateIndicatorGrade(value1, ind);
        const grade2 = calculateIndicatorGrade(value2, ind);
        const gradeChange = getGradeScore(grade2) - getGradeScore(grade1);

        return {
          indicatorName: ind.name,
          columnName: ind.column_name,
          unit: ind.unit,
          value1,
          value2,
          change,
          changePercent,
          grade1,
          grade2,
          gradeChange,
        };
      });

      // 统计等级变化
      const overallGradeChange = indicatorChanges.reduce((sum, ic) => sum + ic.gradeChange, 0);
      if (overallGradeChange > 0) dimensionStats[dimension].up++;
      else if (overallGradeChange < 0) dimensionStats[dimension].down++;
      else dimensionStats[dimension].same++;

      // 统计数值变化
      const avgChange = indicatorChanges.reduce((sum, ic) => sum + ic.changePercent, 0) / indicatorChanges.length;
      dimensionStats[dimension].totalChange += avgChange;
      dimensionStats[dimension].count++;

      comparisons.push({
        name: currentItem.姓名,
        group: currentItem.组别,
        type: dimension,
        indicatorChanges,
      });
    }

    // 构建维度汇总
    const dimensionSummaries: DimensionSummary[] = Object.entries(dimensionStats)
      .filter(([_, stats]) => stats.count > 0)
      .map(([dimension, stats]) => ({
        dimension,
        totalCount: stats.count,
        gradeChanges: {
          up: stats.up,
          down: stats.down,
          same: stats.same,
        },
        avgValueChange: stats.count > 0 ? stats.totalChange / stats.count : 0,
      }));

    setComparisonData({
      baseRecord,
      currentRecord,
      comparisons,
      dimensionSummaries,
    });
  }, [baseRecordId, currentRecordId, records, config]);

  // 获取趋势样式（A股风格：上升红色，下降绿色）
  const getTrendStyle = (change: number) => {
    if (change > 0) return { color: '#E74C3C', icon: '↑' };
    if (change < 0) return { color: '#2ECC71', icon: '↓' };
    return { color: '#9CA3AF', icon: '-' };
  };

  // 按维度分组
  const getComparisonsByDimension = (dimension: string) => {
    if (!comparisonData) return [];
    return comparisonData.comparisons.filter(c => c.type === dimension);
  };

  // 渲染指标对比表格
  const renderIndicatorComparisonTable = (comparisons: ComparisonItem[], dimension: string) => {
    if (comparisons.length === 0) return null;

    const indicators = config[dimension === '基础' ? 'basic' : dimension === 'VIP' ? 'vip' : 'leader'].indicators;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-white z-10 min-w-[80px]">姓名</TableHead>
            <TableHead>组别</TableHead>
            {indicators.map(ind => (
              <TableHead key={ind.column_name} className="text-center min-w-[120px]">
                <div>{ind.name}</div>
                <div className="text-xs text-muted-foreground">等级/环比</div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparisons.map((comp, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium sticky left-0 bg-white z-10">{comp.name}</TableCell>
              <TableCell>{comp.group}</TableCell>
              {comp.indicatorChanges.map(ic => {
                const gradeTrend = getTrendStyle(ic.gradeChange);
                const valueTrend = getTrendStyle(ic.change);
                
                return (
                  <TableCell key={ic.columnName} className="text-center">
                    {/* 等级对比 */}
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Badge 
                        className="text-xs" 
                        style={{ backgroundColor: GRADE_COLORS[ic.grade1] }}
                      >
                        {ic.grade1}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <Badge 
                        className="text-xs" 
                        style={{ backgroundColor: GRADE_COLORS[ic.grade2] }}
                      >
                        {ic.grade2}
                      </Badge>
                      {ic.gradeChange !== 0 && (
                        <span style={{ color: gradeTrend.color, fontSize: '12px', fontWeight: 'bold' }}>
                          {gradeTrend.icon}{Math.abs(ic.gradeChange)}
                        </span>
                      )}
                    </div>
                    {/* 数值环比 */}
                    <div className="text-xs text-muted-foreground">
                      {ic.unit === '%' ? ic.value1.toFixed(2) : ic.value1}
                      {ic.unit === '%' && '%'}
                      <span className="mx-1">→</span>
                      {ic.unit === '%' ? ic.value2.toFixed(2) : ic.value2}
                      {ic.unit === '%' && '%'}
                    </div>
                    {/* 变化率 */}
                    {ic.change !== 0 && (
                      <div 
                        className="text-xs font-medium mt-1"
                        style={{ color: valueTrend.color }}
                      >
                        {valueTrend.icon} {Math.abs(ic.changePercent).toFixed(1)}%
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          数据对比
        </h2>
      </div>

      {/* 选择区域 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" /> 选择对比记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                基准期（对比基准）
              </label>
              <Select value={baseRecordId} onValueChange={setBaseRecordId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择基准期记录" />
                </SelectTrigger>
                <SelectContent>
                  {recordOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-blue-600">
                <Calendar className="w-4 h-4" />
                当期（当前数据）
              </label>
              <Select value={currentRecordId} onValueChange={setCurrentRecordId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择当期记录" />
                </SelectTrigger>
                <SelectContent>
                  {recordOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleCompare}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={records.length < 2}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            开始对比
          </Button>

          {records.length < 2 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              需要至少2条历史记录才能进行对比
            </p>
          )}
        </CardContent>
      </Card>

      {/* 对比结果 */}
      {comparisonData && (
        <div className="space-y-6">
          {/* 总览卡片 */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">基准期</div>
                    <div className="font-semibold text-lg">{comparisonData.baseRecord.date_range}</div>
                    <div className="text-xs text-muted-foreground">{comparisonData.baseRecord.summary.total_count}人</div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-blue-500" />
                  <div className="text-center">
                    <div className="text-sm text-blue-600 mb-1 font-medium">当期</div>
                    <div className="font-semibold text-lg text-blue-700">{comparisonData.currentRecord.date_range}</div>
                    <div className="text-xs text-blue-600">{comparisonData.currentRecord.summary.total_count}人</div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      共同人员
                    </div>
                    <div className="text-2xl font-bold">{comparisonData.comparisons.length}</div>
                  </div>
                </div>
              </div>

              {/* 维度汇总 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {comparisonData.dimensionSummaries.map((summary) => (
                  <div key={summary.dimension} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{TYPE_ICONS[summary.dimension]}</span>
                      <span className="font-medium">{summary.dimension}</span>
                      <Badge variant="outline" className="ml-auto">{summary.totalCount}人</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-red-600">
                          <TrendingUp className="w-4 h-4" />
                          <span className="font-bold">{summary.gradeChanges.up}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">上升</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <TrendingDown className="w-4 h-4" />
                          <span className="font-bold">{summary.gradeChanges.down}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">下降</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-gray-500">
                          <Minus className="w-4 h-4" />
                          <span className="font-bold">{summary.gradeChanges.same}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">持平</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 按维度分组的详细对比 */}
          {(['基础', 'VIP', '组长'] as const).map(type => {
            const typeComparisons = getComparisonsByDimension(type);
            if (typeComparisons.length === 0) return null;

            return (
              <Card key={type} className="overflow-hidden">
                <CardHeader className="pb-3 bg-gray-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-xl">{TYPE_ICONS[type]}</span>
                    <span>{type}客服详细对比</span>
                    <Badge variant="secondary" className="ml-2">{typeComparisons.length}人</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {renderIndicatorComparisonTable(typeComparisons, type)}
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 空状态 */}
      {!comparisonData && records.length >= 2 && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">选择基准期和当期记录开始对比</p>
          <p className="text-sm mt-1">对比结果将显示在这里</p>
        </div>
      )}

      {records.length < 2 && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">历史记录不足</p>
          <p className="text-sm mt-1">需要至少2条历史记录才能进行对比分析</p>
        </div>
      )}
    </div>
  );
}
