import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDefaultConfig } from '@/lib/kpi-utils';
import type { KPIConfig, KPIIndicator, GradeThreshold, CustomField } from '@/types/kpi';
import { SimpleFormulaEditor } from './SimpleFormulaEditor';
import { toast } from 'sonner';
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Award,
  ChevronDown,
  ChevronUp,
  Database,
  LayoutGrid,
  HelpCircle,
} from 'lucide-react';

// 等级输入组件 - 处理小数点输入问题
interface GradeInputProps {
  value: number | null;
  isPercentage: boolean;
  allowNull?: boolean;
  onChange: (value: number | null) => void;
}

function GradeInput({ value, isPercentage, allowNull = false, onChange }: GradeInputProps) {
  // 本地状态存储输入字符串
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // 格式化数字显示，去除浮点数精度问题
  const formatDisplayValue = (val: number): string => {
    // 直接显示原始值，不再转换
    return val.toFixed(10).replace(/\.?0+$/, '');
  };

  // 当外部值变化且不在编辑状态时，更新显示值
  useEffect(() => {
    if (!isEditing) {
      if (value === null || value === undefined) {
        setInputValue('');
      } else {
        setInputValue(formatDisplayValue(value));
      }
    }
  }, [value, isEditing, isPercentage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // 允许空字符串、数字、小数点
    if (newValue === '' || newValue === '.' || /^\d*\.?\d*$/.test(newValue)) {
      setInputValue(newValue);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    
    if (inputValue === '' || inputValue === '.') {
      if (allowNull) {
        onChange(null);
      } else {
        onChange(0);
        setInputValue('0');
      }
      return;
    }

    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      // 直接存储输入值，不再转换
      const finalValue = numValue;
      onChange(finalValue);
      // 更新显示值
      setInputValue(formatDisplayValue(finalValue));
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={allowNull ? '无上限' : '0'}
      className="h-8"
    />
  );
}

interface IndicatorConfigProps {
  config: KPIConfig;
  userDefaultConfig: KPIConfig | null;
  onSave: (config: KPIConfig) => void;      // 设为基准配置
  onUpdate: (config: KPIConfig) => void;    // 只更新当前配置，不设为基准
  onReset: () => void;
  onDeleteDefault?: () => void;             // 删除基准配置
}

const GRADE_COLORS: Record<string, string> = {
  S: '#FFD700',  // 亮金色 - 卓越
  A: '#3498DB',  // 天蓝色 - 优秀
  B: '#2ECC71',  // 翠绿色 - 良好
  C: '#9B59B6',  // 紫罗兰色 - 合格
  D: '#E74C3C',  // 正红色 - 待改进
};

const CONDITION_OPTIONS = ['>=', '<=', '>', '<', '==', '!='];
const DATA_TYPE_OPTIONS = [
  { value: 'number', label: '数字' },
  { value: 'string', label: '字符串' },
  { value: 'percentage', label: '百分比' },
];

// 创建空指标模板
const createEmptyIndicator = (): KPIIndicator => ({
  name: '', // 新增指标名称默认为空，需要手动输入
  column_name: '',
  weight: 0,
  unit: '',
  formula: '',
  description: '',
  threshold: {
    enabled: false,
    field: '',
    condition: '>=',
    value: 0,
    description: '',
  },
  grades: [
    { grade: 'D', min_value: 0, max_value: 60, bonus: 0, description: '待改进' },
    { grade: 'C', min_value: 60, max_value: 70, bonus: 0, description: '合格' },
    { grade: 'B', min_value: 70, max_value: 80, bonus: 0, description: '良好' },
    { grade: 'A', min_value: 80, max_value: 90, bonus: 0, description: '优秀' },
    { grade: 'S', min_value: 90, max_value: null, bonus: 0, description: '卓越' },
  ],
  is_higher_better: true,
  grade_standard_id: undefined,
});

// 创建空自定义字段模板
const createEmptyCustomField = (isCalculated = false): CustomField => ({
  id: `field_${Date.now()}`,
  name: '',
  column_name: '',
  description: '',
  unit: '',
  data_type: 'number',
  is_required: false,
  is_calculated: isCalculated,
  formula: '',
  source_fields: [],
});

export function IndicatorConfig({ config, userDefaultConfig, onSave, onUpdate, onReset, onDeleteDefault }: IndicatorConfigProps) {
  const [localConfig, setLocalConfig] = useState<KPIConfig>(config);
  
  // 当外部config变化时同步更新localConfig
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // 导入配置状态
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [importConfigText, setImportConfigText] = useState('');
  
  // 指标编辑状态
  const [editingIndicator, setEditingIndicator] = useState<{
    dimension: 'basic' | 'vip' | 'leader';
    index: number;
    indicator: KPIIndicator;
  } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    dimension: 'basic' | 'vip' | 'leader';
    index: number;
  } | null>(null);
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set());

  // 自定义字段编辑状态
  const [editingCustomField, setEditingCustomField] = useState<{
    index: number;
    field: CustomField;
  } | null>(null);
  const [showCustomFieldDialog, setShowCustomFieldDialog] = useState(false);
  const [showDeleteFieldDialog, setShowDeleteFieldDialog] = useState(false);
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<number | null>(null);

  // 等级标准编辑状态
  const [editingGradeStandard, setEditingGradeStandard] = useState<{
    index: number;
    standard: import('@/types/kpi').GradeStandard;
  } | null>(null);
  const [showGradeStandardDialog, setShowGradeStandardDialog] = useState(false);
  const [showDeleteGradeStandardDialog, setShowDeleteGradeStandardDialog] = useState(false);
  const [deleteGradeStandardTarget, setDeleteGradeStandardTarget] = useState<number | null>(null);

  const handleSave = useCallback(() => {
    onSave(localConfig);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  }, [localConfig, onSave]);

  const handleReset = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const toggleExpand = (key: string) => {
    setExpandedIndicators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // ========== 指标管理 ==========
  const handleAddIndicator = (dimension: 'basic' | 'vip' | 'leader') => {
    setEditingIndicator({
      dimension,
      index: -1,
      indicator: createEmptyIndicator(),
    });
    setShowEditDialog(true);
  };

  const handleEditIndicator = (
    dimension: 'basic' | 'vip' | 'leader',
    index: number,
    indicator: KPIIndicator
  ) => {
    setEditingIndicator({
      dimension,
      index,
      indicator: JSON.parse(JSON.stringify(indicator)),
    });
    setShowEditDialog(true);
  };

  const handleDeleteIndicator = (dimension: 'basic' | 'vip' | 'leader', index: number) => {
    setDeleteTarget({ dimension, index });
    setShowDeleteDialog(true);
  };

  const confirmDeleteIndicator = () => {
    if (!deleteTarget) return;

    const newConfig = {
      ...localConfig,
      [deleteTarget.dimension]: {
        ...localConfig[deleteTarget.dimension],
        indicators: localConfig[deleteTarget.dimension].indicators.filter((_, i) => i !== deleteTarget.index),
      },
    };
    
    setLocalConfig(newConfig);
    onSave(newConfig); // 自动保存到 localStorage
    
    setShowDeleteDialog(false);
    setDeleteTarget(null);
  };

  const handleSaveIndicator = () => {
    if (!editingIndicator) return;

    const { dimension, index, indicator } = editingIndicator;

    if (!indicator.name.trim()) {
      alert('请输入指标名称');
      return;
    }
    if (!indicator.column_name.trim()) {
      alert('请输入列名');
      return;
    }

    const newIndicators = [...localConfig[dimension].indicators];
    if (index === -1) {
      newIndicators.push(indicator);
    } else {
      newIndicators[index] = indicator;
    }
    
    const newConfig = {
      ...localConfig,
      [dimension]: {
        ...localConfig[dimension],
        indicators: newIndicators,
      },
    };
    
    setLocalConfig(newConfig);
    onUpdate(newConfig); // 只更新当前配置，不设为基准

    setShowEditDialog(false);
    setEditingIndicator(null);
  };

  // ========== 导入配置 ==========
  const handleImportConfig = () => {
    try {
      if (!importConfigText.trim()) {
        toast.error('请输入配置JSON');
        return;
      }
      
      const importedConfig = JSON.parse(importConfigText);
      
      // 验证配置结构
      if (!importedConfig.basic || !importedConfig.vip || !importedConfig.leader) {
        toast.error('配置格式错误：缺少必要的维度配置');
        return;
      }
      
      // 合并导入的配置，确保有默认值
      const mergedConfig: KPIConfig = {
        ...getDefaultConfig(),
        ...importedConfig,
        basic: {
          ...getDefaultConfig().basic,
          ...importedConfig.basic,
          custom_fields: importedConfig.basic?.custom_fields || [],
        },
        vip: {
          ...getDefaultConfig().vip,
          ...importedConfig.vip,
          custom_fields: importedConfig.vip?.custom_fields || [],
        },
        leader: {
          ...getDefaultConfig().leader,
          ...importedConfig.leader,
          custom_fields: importedConfig.leader?.custom_fields || [],
        },
        global_custom_fields: importedConfig.global_custom_fields || getDefaultConfig().global_custom_fields,
        grade_standards: importedConfig.grade_standards || getDefaultConfig().grade_standards,
        assessment_period: importedConfig.assessment_period || 'monthly',
      };
      
      setLocalConfig(mergedConfig);
      onSave(mergedConfig); // 保存到 localStorage
      
      setShowImportDialog(false);
      setImportConfigText('');
      toast.success('配置导入成功！');
    } catch (error) {
      toast.error('配置格式错误，请检查JSON格式');
      console.error('Import config error:', error);
    }
  };

  // ========== 自定义字段管理 ==========
  const handleAddCustomField = (isCalculated = false) => {
    setEditingCustomField({
      index: -1,
      field: createEmptyCustomField(isCalculated),
    });
    setShowCustomFieldDialog(true);
  };

  const handleEditCustomField = (index: number, field: CustomField) => {
    setEditingCustomField({
      index,
      field: JSON.parse(JSON.stringify(field)),
    });
    setShowCustomFieldDialog(true);
  };

  const handleDeleteCustomField = (index: number) => {
    setDeleteFieldTarget(index);
    setShowDeleteFieldDialog(true);
  };

  const confirmDeleteCustomField = () => {
    if (deleteFieldTarget === null) return;

    const newConfig = {
      ...localConfig,
      global_custom_fields: (localConfig.global_custom_fields || []).filter((_, i) => i !== deleteFieldTarget),
    };
    
    setLocalConfig(newConfig);
    onSave(newConfig); // 自动保存到 localStorage
    
    setShowDeleteFieldDialog(false);
    setDeleteFieldTarget(null);
  };

  const handleSaveCustomField = () => {
    if (!editingCustomField) return;

    const { index, field } = editingCustomField;

    if (!field.name.trim()) {
      alert('请输入字段名称');
      return;
    }
    if (!field.column_name.trim()) {
      alert('请输入列名');
      return;
    }

    // 确保计算字段的 formula 和 source_fields 正确保存
    const fieldToSave = {
      ...field,
      formula: field.is_calculated ? (field.formula || '') : '',
      source_fields: field.is_calculated ? (field.source_fields || []) : [],
    };

    const newConfig = {
      ...localConfig,
      global_custom_fields: [...(localConfig.global_custom_fields || [])],
    };
    
    if (index === -1) {
      if (fieldToSave.is_calculated) {
        // 计算字段：直接追加到末尾
        newConfig.global_custom_fields.push(fieldToSave);
      } else {
        // 普通字段：插入到最后一个普通字段后面（第一个计算字段前面）
        const lastNormalIndex = newConfig.global_custom_fields.reduce((lastIdx, f, i) =>
          !f.is_calculated ? i : lastIdx, -1);
        newConfig.global_custom_fields.splice(lastNormalIndex + 1, 0, fieldToSave);
      }
    } else {
      newConfig.global_custom_fields[index] = fieldToSave;
    }
    
    setLocalConfig(newConfig);
    onUpdate(newConfig);

    setShowCustomFieldDialog(false);
    setEditingCustomField(null);
  };

  // ========== 等级标准管理 ==========
  const createEmptyGradeStandard = (): import('@/types/kpi').GradeStandard => ({
    id: `grade_std_${Date.now()}`,
    name: '',
    unit: '%',
    description: '',
    mode: 'grade',
    grades: [
      { grade: 'S', min_value: 0.90, max_value: 1.00, bonus: 0, description: '卓越' },
      { grade: 'A', min_value: 0.85, max_value: 0.90, bonus: 0, description: '优秀' },
      { grade: 'B', min_value: 0.80, max_value: 0.85, bonus: 0, description: '良好' },
      { grade: 'C', min_value: 0.70, max_value: 0.80, bonus: 0, description: '合格' },
      { grade: 'D', min_value: 0.00, max_value: 0.70, bonus: 0, description: '待改进' },
    ],
  });

  const handleAddGradeStandard = () => {
    setEditingGradeStandard({
      index: -1,
      standard: createEmptyGradeStandard(),
    });
    setShowGradeStandardDialog(true);
  };

  const handleEditGradeStandard = (index: number, standard: import('@/types/kpi').GradeStandard) => {
    setEditingGradeStandard({
      index,
      standard: JSON.parse(JSON.stringify(standard)),
    });
    setShowGradeStandardDialog(true);
  };

  const handleDeleteGradeStandard = (index: number) => {
    setDeleteGradeStandardTarget(index);
    setShowDeleteGradeStandardDialog(true);
  };

  const confirmDeleteGradeStandard = () => {
    if (deleteGradeStandardTarget === null) return;

    const newConfig = {
      ...localConfig,
      grade_standards: (localConfig.grade_standards || []).filter((_, i) => i !== deleteGradeStandardTarget),
    };
    
    setLocalConfig(newConfig);
    onSave(newConfig);
    
    setShowDeleteGradeStandardDialog(false);
    setDeleteGradeStandardTarget(null);
  };

  const handleSaveGradeStandard = () => {
    if (!editingGradeStandard) return;

    const { index, standard } = editingGradeStandard;

    if (!standard.name.trim()) {
      alert('请输入标准名称');
      return;
    }

    const newConfig = {
      ...localConfig,
      grade_standards: [...(localConfig.grade_standards || [])],
    };
    
    if (index === -1) {
      newConfig.grade_standards.push(standard);
    } else {
      newConfig.grade_standards[index] = standard;
    }
    
    setLocalConfig(newConfig);
    onUpdate(newConfig); // 只更新当前配置，不设为基准

    setShowGradeStandardDialog(false);
    setEditingGradeStandard(null);
  };

  const updateEditingGradeStandard = (updates: Partial<import('@/types/kpi').GradeStandard>) => {
    if (!editingGradeStandard) return;
    setEditingGradeStandard({
      ...editingGradeStandard,
      standard: { ...editingGradeStandard.standard, ...updates },
    });
  };

  const updateEditingGradeStandardGrade = (gradeIndex: number, updates: Partial<GradeThreshold>) => {
    if (!editingGradeStandard) return;
    const newGrades = [...editingGradeStandard.standard.grades];
    newGrades[gradeIndex] = { ...newGrades[gradeIndex], ...updates };
    updateEditingGradeStandard({ grades: newGrades });
  };

  // ========== 更新函数 ==========
  const updateEditingIndicator = (updates: Partial<KPIIndicator>) => {
    if (!editingIndicator) return;
    setEditingIndicator({
      ...editingIndicator,
      indicator: { ...editingIndicator.indicator, ...updates },
    });
  };

  const updateEditingThreshold = (updates: Partial<KPIIndicator['threshold']>) => {
    if (!editingIndicator) return;
    updateEditingIndicator({
      threshold: { ...editingIndicator.indicator.threshold, ...updates },
    });
  };

  const updateEditingCustomField = (updates: Partial<CustomField>) => {
    if (!editingCustomField) return;
    setEditingCustomField({
      ...editingCustomField,
      field: { ...editingCustomField.field, ...updates },
    });
  };

  // ========== 渲染函数 ==========
  const renderIndicatorCard = (
    indicator: KPIIndicator,
    dimension: 'basic' | 'vip' | 'leader',
    index: number
  ) => {
    const key = `${dimension}-${index}`;
    const isExpanded = expandedIndicators.has(key);
    
    // 获取自定义字段的显示名称
    const getFieldDisplayName = (columnName: string): string => {
      const field = localConfig.global_custom_fields?.find(f => f.column_name === columnName);
      return field?.name || columnName;
    };

    return (
      <Card key={key} className="mb-3 border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6"
                onClick={() => toggleExpand(key)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <CardTitle className="text-base font-semibold">{indicator.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">权重 {indicator.weight}%</Badge>
              <Badge variant="secondary">{indicator.unit}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditIndicator(dimension, index, indicator)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => handleDeleteIndicator(dimension, index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* 门槛指标、进阶指标、等级标准（始终显示） */}
          <div className="pl-9 mt-2 space-y-1">
            {indicator.threshold.enabled ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-orange-600 font-medium">🚪 门槛指标:</span>
                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                  {getFieldDisplayName(indicator.threshold.field)} {indicator.threshold.condition} {indicator.threshold.value}
                </Badge>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <span className="text-gray-400">🚫 无门槛指标</span>
              </div>
            )}
            {/* 进阶指标名称 */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-600 font-medium">📈 进阶指标:</span>
              <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                {getFieldDisplayName(indicator.column_name)}
              </Badge>
            </div>
            {/* 等级标准 */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[...indicator.grades].reverse().map((grade) => (
                <div
                  key={grade.grade}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: `${GRADE_COLORS[grade.grade]}33` }}  // 20% opacity
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: GRADE_COLORS[grade.grade] }}>
                    {grade.grade}
                  </span>
                  <span>
                    {indicator.unit === '%' ? `${grade.min_value}%` : grade.min_value}
                    {'~'}
                    {grade.max_value === null ? '∞' : (indicator.unit === '%' ? `${grade.max_value}%` : grade.max_value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {/* 操作按钮行 */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          onClick={() => setShowHelp(!showHelp)}
          variant="ghost"
          size="icon"
          className="w-8 h-8 p-0 text-blue-400 hover:text-blue-600 hover:bg-blue-50"
          title="配置说明"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
        <Button 
          onClick={() => {
            const configJson = JSON.stringify(localConfig, null, 2);
            const blob = new Blob([configJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'kpi-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('配置文件已下载！换设备时导入即可');
          }}
          variant="outline"
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
        >
          <span className="mr-1">📋</span>
          导出配置
        </Button>
        <Button 
          onClick={() => setShowImportDialog(true)}
          variant="outline"
          className="text-purple-600 border-purple-300 hover:bg-purple-50"
          title="从其他设备导入配置"
        >
          <span className="mr-1">📥</span>
          导入配置
        </Button>
        <Button 
          onClick={handleSave} 
          className="bg-green-600 hover:bg-green-700"
          title="将当前配置设为基准配置，方便后续恢复"
        >
          <Save className="w-4 h-4 mr-1" />
          设为基准配置
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          className="text-orange-600 border-orange-300 hover:bg-orange-50"
          title={userDefaultConfig ? "恢复到基准配置" : "恢复到系统默认配置"}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          {userDefaultConfig ? "恢复基准配置" : "恢复系统默认"}
        </Button>
        {userDefaultConfig && (
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
            title="删除已保存的基准配置"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            删除基准配置
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2 px-3 py-1 border rounded-md bg-gray-50">
          <span className="text-xs text-gray-600">月度</span>
          <Switch
            checked={localConfig.assessment_period === 'quarterly'}
            onCheckedChange={(checked) => {
              const newConfig: KPIConfig = {
                ...localConfig,
                assessment_period: checked ? 'quarterly' : 'monthly',
              };
              setLocalConfig(newConfig);
              onUpdate(newConfig);
            }}
          />
          <span className="text-xs text-gray-600">季度</span>
        </div>
      </div>

      {/* 主标签页 */}
      <Tabs defaultValue="fields" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            自定义字段
            <Badge variant="secondary" className="ml-1 text-xs">
              {localConfig.global_custom_fields?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="grade-standards" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            等级标准
            <Badge variant="secondary" className="ml-1 text-xs">
              {localConfig.grade_standards?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="indicators" className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            考核指标
            <Badge variant="secondary" className="ml-1 text-xs">
              {localConfig.basic.indicators.length + localConfig.vip.indicators.length + localConfig.leader.indicators.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* 自定义字段标签页 */}
        <TabsContent value="fields" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    自定义字段
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    定义从导入数据中提取的字段或通过公式计算的字段
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleAddCustomField(false)} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    添加普通字段
                  </Button>
                  <Button onClick={() => handleAddCustomField(true)} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    添加计算字段
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {(localConfig.global_custom_fields?.length || 0) === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无自定义字段</p>
                    <div className="flex gap-2 justify-center mt-2">
                      <Button
                        onClick={() => handleAddCustomField(false)}
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加普通字段
                      </Button>
                      <Button
                        onClick={() => handleAddCustomField(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加计算字段
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(localConfig.global_custom_fields || []).map((field, index) => (
                      <div 
                        key={field.id} 
                        className={`flex items-center justify-between px-3 py-2 rounded border-l-4 ${field.is_calculated ? 'border-l-orange-500 bg-orange-50/30' : 'border-l-purple-500 bg-purple-50/30'} hover:bg-gray-50`}
                      >
                        <div className="flex-1 min-w-0">
                          {/* 单行显示所有信息 */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground w-6">#{index + 1}</span>
                            <span className="font-medium">{field.name}</span>
                            {field.is_calculated && (
                              <Badge className="text-xs bg-orange-500">计算</Badge>
                            )}
                            {!field.is_calculated && field.is_required && (
                              <Badge variant="destructive" className="text-xs">必需</Badge>
                            )}
                            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{field.column_name}</code>
                            <Badge variant="outline" className="text-xs">{DATA_TYPE_OPTIONS.find(t => t.value === field.data_type)?.label || field.data_type}</Badge>
                            {field.unit && <span className="text-xs text-muted-foreground">[{field.unit}]</span>}
                            {field.is_calculated && field.formula && (
                              <code className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{field.formula}</code>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditCustomField(index, field)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteCustomField(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 等级标准标签页 */}
        <TabsContent value="grade-standards" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    等级标准
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    预设等级标准，可在考核指标中直接引用
                  </p>
                </div>
                <Button onClick={handleAddGradeStandard} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  添加标准
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {(localConfig.grade_standards?.length || 0) === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无预设等级标准</p>
                    <Button
                      onClick={handleAddGradeStandard}
                      variant="outline"
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加第一个标准
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(localConfig.grade_standards || []).map((standard, index) => (
                      <Card key={standard.id} className="border-l-4 border-l-yellow-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{standard.name}</h4>
                                <Badge variant="outline">{standard.unit}</Badge>
                                <Badge variant={standard.mode === 'bonus' ? 'default' : 'secondary'}>
                                  {standard.mode === 'bonus' ? '奖金评定' : '等级评定'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {standard.description}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {/* 反转显示顺序：D -> C -> B -> A -> S */}
                                {[...standard.grades].reverse().map((grade) => (
                                  <div
                                    key={grade.grade}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                                    style={{ backgroundColor: `${GRADE_COLORS[grade.grade]}33` }}  // 20% opacity
                                  >
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: GRADE_COLORS[grade.grade] }}>
                                      {grade.grade}
                                    </span>
                                    <span>
                                      {standard.unit.includes('%')
                                        ? `${grade.min_value}%`
                                        : grade.min_value}
                                      {' ~ '}
                                      {grade.max_value === null
                                        ? '∞'
                                        : standard.unit.includes('%')
                                        ? `${grade.max_value}%`
                                        : grade.max_value}
                                    </span>
                                    {standard.mode === 'bonus' && grade.bonus > 0 && (
                                      <span className="text-green-600 font-medium">+{grade.bonus}元</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditGradeStandard(index, standard)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGradeStandard(index)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 考核指标标签页 */}
        <TabsContent value="indicators" className="mt-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <span>👤</span> 基础客服
                <Badge variant="secondary" className="ml-1 text-xs">
                  {localConfig.basic.indicators.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="vip" className="flex items-center gap-2">
                <span>⭐</span> VIP客服
                <Badge variant="secondary" className="ml-1 text-xs">
                  {localConfig.vip.indicators.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="leader" className="flex items-center gap-2">
                <span>👑</span> 组长
                <Badge variant="secondary" className="ml-1 text-xs">
                  {localConfig.leader.indicators.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {(['basic', 'vip', 'leader'] as const).map((dimension) => (
              <TabsContent key={dimension} value={dimension} className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {dimension === 'basic' && '👤 基础客服考核指标'}
                          {dimension === 'vip' && '⭐ VIP客服考核指标'}
                          {dimension === 'leader' && '👑 组长考核指标'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {localConfig[dimension].description}
                        </p>
                      </div>
                      <Button onClick={() => handleAddIndicator(dimension)} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        添加指标
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      {localConfig[dimension].indicators.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>暂无指标</p>
                          <Button
                            onClick={() => handleAddIndicator(dimension)}
                            variant="outline"
                            className="mt-2"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            添加第一个指标
                          </Button>
                        </div>
                      ) : (
                        localConfig[dimension].indicators.map((indicator, index) =>
                          renderIndicatorCard(indicator, dimension, index)
                        )
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* 等级说明 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🏆</span> 等级标准说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {[
              { grade: 'S', name: '卓越', desc: '表现优异，超出预期', color: '#FFD700' },
              { grade: 'A', name: '优秀', desc: '表现良好，达到高标准', color: '#3498DB' },
              { grade: 'B', name: '良好', desc: '表现稳定，符合要求', color: '#2ECC71' },
              { grade: 'C', name: '合格', desc: '基本达标，有待提升', color: '#9B59B6' },
              { grade: 'D', name: '待改进', desc: '未达标，需要改进', color: '#E74C3C' },
            ].map((item) => (
              <div key={item.grade} className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold" style={{ color: item.color }}>{item.grade}</div>
                <div className="font-medium text-sm mt-1">{item.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 编辑指标对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingIndicator?.index === -1 ? '➕ 添加新指标' : '✏️ 编辑指标'}
            </DialogTitle>
            <DialogDescription>配置指标的详细信息、门槛条件和等级标准</DialogDescription>
          </DialogHeader>

          {editingIndicator && (
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* 指标名称 + 权重（同一行） */}
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">指标名称 *</Label>
                      <Input
                        id="name"
                        value={editingIndicator.indicator.name}
                        onChange={(e) => updateEditingIndicator({ name: e.target.value })}
                        placeholder="请输入指标名称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">权重 (%)</Label>
                      <Input
                        id="weight"
                        type="number"
                        min={0}
                        max={100}
                        value={editingIndicator.indicator.weight}
                        onChange={(e) =>
                          updateEditingIndicator({ weight: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  {/* 选择数据字段 + 字段标识（同一行） */}
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="field_select">选择数据字段 *</Label>
                      <Select
                        value={editingIndicator.indicator.column_name}
                        onValueChange={(value) => {
                          const selectedField = localConfig.global_custom_fields?.find(
                            (f) => f.column_name === value
                          );
                          if (selectedField) {
                            // 只填充单位和描述，不自动填充指标名称
                            const isCalculated = selectedField.is_calculated;
                            updateEditingIndicator({
                              column_name: selectedField.column_name,
                              unit: selectedField.unit,
                              description: selectedField.description,
                              formula: isCalculated ? selectedField.column_name : '',
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择自定义字段" />
                        </SelectTrigger>
                        <SelectContent>
                          {(localConfig.global_custom_fields || []).map((field) => (
                            <SelectItem key={field.id} value={field.column_name}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="column_name">字段标识</Label>
                      <Input
                        id="column_name"
                        value={editingIndicator.indicator.column_name}
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_higher_better"
                      checked={editingIndicator.indicator.is_higher_better}
                      onCheckedChange={(checked) =>
                        updateEditingIndicator({ is_higher_better: checked })
                      }
                    />
                    <Label htmlFor="is_higher_better">数值越高越好</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <Switch
                      id="affected_by_period"
                      checked={editingIndicator.indicator.affected_by_period !== false}
                      onCheckedChange={(checked) =>
                        updateEditingIndicator({ affected_by_period: checked })
                      }
                    />
                    <div className="space-y-1">
                      <Label htmlFor="affected_by_period" className="text-amber-800 font-medium">
                        受考核周期影响
                      </Label>
                      <p className="text-xs text-amber-600">
                        开启后，季度考核时该指标标准自动×3。如：服务分、满意率等百分比指标建议关闭。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 门槛指标 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">门槛指标</h4>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="threshold_enabled"
                    checked={editingIndicator.indicator.threshold.enabled}
                    onCheckedChange={(checked) =>
                      updateEditingThreshold({ enabled: checked })
                    }
                  />
                  <Label htmlFor="threshold_enabled">启用门槛指标</Label>
                </div>

                {editingIndicator.indicator.threshold.enabled && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>字段</Label>
                      <Select
                        value={editingIndicator.indicator.threshold.field || editingIndicator.indicator.column_name}
                        onValueChange={(value) =>
                          updateEditingThreshold({ field: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择字段" />
                        </SelectTrigger>
                        <SelectContent>
                          {(localConfig.global_custom_fields || []).map((field) => (
                            <SelectItem key={field.id} value={field.column_name}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>条件</Label>
                      <Select
                        value={editingIndicator.indicator.threshold.condition}
                        onValueChange={(value) =>
                          updateEditingThreshold({ condition: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>阈值</Label>
                      <Input
                        type="number"
                        value={editingIndicator.indicator.threshold.value}
                        onChange={(e) =>
                          updateEditingThreshold({
                            value: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 等级标准 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">等级标准</h4>
                </div>
                
                {/* 选择预设等级标准 */}
                <div className="space-y-2">
                  <Label>选择预设标准</Label>
                  <Select
                    value={editingIndicator.indicator.grade_standard_id || ''}
                    onValueChange={(value) => {
                      const selectedStandard = localConfig.grade_standards?.find(s => s.id === value);
                      if (selectedStandard) {
                        // 复制预设标准的等级到当前指标，同时记录标准ID
                        updateEditingIndicator({ 
                          grades: JSON.parse(JSON.stringify(selectedStandard.grades)),
                          grade_standard_id: selectedStandard.id
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="点击选择预设等级标准..." />
                    </SelectTrigger>
                    <SelectContent className="max-w-[500px]">
                      {(localConfig.grade_standards || []).map((standard) => (
                        <SelectItem key={standard.id} value={standard.id} className="py-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{standard.name}</span>
                            <span className="text-xs text-muted-foreground">
                              [{standard.unit}] {standard.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    选择预设标准后会自动填充等级数值，也可在下方手动调整
                  </p>
                </div>

                {/* 当前等级标准展示 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">当前等级配置</Label>
                  <div className="space-y-2">
                    {editingIndicator.indicator.grades.map((grade) => {
                      const isPercentage = editingIndicator.indicator.unit.includes('%');
                      // 直接显示原始值，单位%只是后缀
                      const minDisplay = isPercentage 
                        ? `${grade.min_value}%`
                        : grade.min_value;
                      const maxDisplay = grade.max_value === null 
                        ? '无上限' 
                        : (isPercentage 
                          ? `${grade.max_value}%`
                          : grade.max_value);
                      
                      return (
                        <div
                          key={grade.grade}
                          className="flex items-center gap-3 p-2 rounded"
                          style={{ backgroundColor: `${GRADE_COLORS[grade.grade]}1A` }}  // 10% opacity
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: GRADE_COLORS[grade.grade] }}
                          >
                            {grade.grade}
                          </div>
                          <div className="flex-1 text-sm">
                            <span className="font-medium">{minDisplay}</span>
                            {' '}~{' '}
                            <span className="font-medium">{maxDisplay}</span>
                            {grade.bonus > 0 && (
                              <span className="text-green-600 ml-2">+{grade.bonus}元</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveIndicator} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-1" />
              保存指标
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑自定义字段对话框 */}
      <Dialog open={showCustomFieldDialog} onOpenChange={setShowCustomFieldDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomField?.index === -1 ? '➕ 添加自定义字段' : '✏️ 编辑自定义字段'}
            </DialogTitle>
            <DialogDescription>定义从导入数据中提取的字段信息</DialogDescription>
          </DialogHeader>

          {editingCustomField && (
            <div className="space-y-4 py-4">
              {/* 计算字段开关 */}
              <div className="flex items-center space-x-2 pb-4 border-b">
                <Switch
                  id="field_is_calculated"
                  checked={editingCustomField.field.is_calculated}
                  onCheckedChange={(checked) =>
                    updateEditingCustomField({ 
                      is_calculated: checked,
                      // 切换时清空相关字段
                      column_name: checked ? editingCustomField.field.column_name : '',
                      formula: checked ? editingCustomField.field.formula : '',
                      source_fields: checked ? editingCustomField.field.source_fields : [],
                    })
                  }
                />
                <Label htmlFor="field_is_calculated" className="font-medium">
                  计算字段（通过公式从其他字段计算得出）
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="field_name">字段名称 *</Label>
                  <Input
                    id="field_name"
                    value={editingCustomField.field.name}
                    onChange={(e) => updateEditingCustomField({ name: e.target.value })}
                    placeholder="例如：满意率"
                  />
                </div>

                {/* 普通字段：字段标识 */}
                {!editingCustomField.field.is_calculated && (
                  <div className="space-y-2">
                    <Label htmlFor="field_column_name">字段标识 *</Label>
                    <Input
                      id="field_column_name"
                      value={editingCustomField.field.column_name}
                      onChange={(e) => updateEditingCustomField({ column_name: e.target.value })}
                      placeholder="例如：满意率"
                    />
                    <p className="text-xs text-muted-foreground">
                      与导入数据中的列名一致
                    </p>
                  </div>
                )}

                {/* 计算字段：列名标识 */}
                {editingCustomField.field.is_calculated && (
                  <div className="space-y-2">
                    <Label htmlFor="field_column_name_calc">字段标识 *</Label>
                    <Input
                      id="field_column_name_calc"
                      value={editingCustomField.field.column_name}
                      onChange={(e) => updateEditingCustomField({ column_name: e.target.value })}
                      placeholder="例如：服务分"
                    />
                    <p className="text-xs text-muted-foreground">
                      用于标识此计算字段的名称
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="field_data_type">数据类型</Label>
                  <Select
                    value={editingCustomField.field.data_type}
                    onValueChange={(value: 'number' | 'string' | 'percentage') =>
                      updateEditingCustomField({ data_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field_unit">单位</Label>
                  <Input
                    id="field_unit"
                    value={editingCustomField.field.unit}
                    onChange={(e) => updateEditingCustomField({ unit: e.target.value })}
                    placeholder="例如：%、个"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="field_description">描述</Label>
                  <Input
                    id="field_description"
                    value={editingCustomField.field.description}
                    onChange={(e) => updateEditingCustomField({ description: e.target.value })}
                    placeholder="字段的详细说明"
                  />
                </div>

                {/* 计算字段：公式输入 */}
                {editingCustomField.field.is_calculated && (
                  <div className="col-span-2">
                    <SimpleFormulaEditor
                      value={editingCustomField.field.formula}
                      onChange={(value) => {
                        // 自动提取公式中使用的字段作为源字段
                        const usedFields: string[] = [];
                        const availableFieldNames = localConfig.global_custom_fields
                          ?.filter(f => f.column_name !== editingCustomField.field?.column_name)
                          .map(f => f.column_name) || [];
                        
                        for (const fieldName of availableFieldNames) {
                          if (value.includes(fieldName)) {
                            usedFields.push(fieldName);
                          }
                        }
                        // 合并更新 formula 和 source_fields
                        updateEditingCustomField({ formula: value, source_fields: usedFields });
                      }}
                      availableFields={
                        localConfig.global_custom_fields
                          ?.filter(f => f.column_name !== editingCustomField.field?.column_name)
                          .map(f => ({
                            name: f.name,
                            column_name: f.column_name,
                            unit: f.unit,
                          })) || []
                      }
                      placeholder="点击字段和符号构建计算公式"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      注意：字段按列表顺序依次计算，请确保引用的字段排在前面，避免循环引用
                    </p>
                  </div>
                )}

                {!editingCustomField.field.is_calculated && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="field_is_required"
                      checked={editingCustomField.field.is_required}
                      onCheckedChange={(checked) =>
                        updateEditingCustomField({ is_required: checked })
                      }
                    />
                    <Label htmlFor="field_is_required">必需字段</Label>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomFieldDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveCustomField} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-1" />
              保存字段
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除指标确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ 确认删除指标</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个指标吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteIndicator}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除字段确认对话框 */}
      <AlertDialog open={showDeleteFieldDialog} onOpenChange={setShowDeleteFieldDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ 确认删除字段</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个自定义字段吗？使用此字段的指标可能需要重新配置。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCustomField}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑等级标准对话框 */}
      <Dialog open={showGradeStandardDialog} onOpenChange={setShowGradeStandardDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGradeStandard?.index === -1 ? '➕ 添加等级标准' : '✏️ 编辑等级标准'}
            </DialogTitle>
            <DialogDescription>配置等级标准的名称、单位和各等级的数值范围</DialogDescription>
          </DialogHeader>

          {editingGradeStandard && (
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade_std_name">标准名称 *</Label>
                  <Input
                    id="grade_std_name"
                    value={editingGradeStandard.standard.name}
                    onChange={(e) => updateEditingGradeStandard({ name: e.target.value })}
                    placeholder="例如：满意率标准"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade_std_unit">单位</Label>
                  <Input
                    id="grade_std_unit"
                    value={editingGradeStandard.standard.unit}
                    onChange={(e) => updateEditingGradeStandard({ unit: e.target.value })}
                    placeholder="例如：%、个、分"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="grade_std_description">描述</Label>
                  <Input
                    id="grade_std_description"
                    value={editingGradeStandard.standard.description}
                    onChange={(e) => updateEditingGradeStandard({ description: e.target.value })}
                    placeholder="标准的用途说明"
                  />
                </div>
              </div>

              {/* 评定模式选择 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">评定模式</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gradeMode"
                      checked={editingGradeStandard.standard.mode === 'grade'}
                      onChange={() => updateEditingGradeStandard({ mode: 'grade' })}
                      className="w-4 h-4"
                    />
                    <span>等级评定（只显示等级）</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gradeMode"
                      checked={editingGradeStandard.standard.mode === 'bonus'}
                      onChange={() => updateEditingGradeStandard({ mode: 'bonus' })}
                      className="w-4 h-4"
                    />
                    <span>奖金评定（显示等级和奖金）</span>
                  </label>
                </div>
              </div>

              {/* 等级配置 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">等级配置</h4>
                  <p className="text-xs text-blue-600">
                    区间格式 [最小值, 最大值]，包含边界值
                  </p>
                </div>
                {editingGradeStandard.standard.unit.includes('%') && (
                  <p className="text-xs text-muted-foreground">
                    百分比模式：直接输入 0-100 的数字（如输入 80 表示 80%）
                  </p>
                )}
                <div className="space-y-3">
                  {editingGradeStandard.standard.grades.map((grade, index) => {
                    const isPercentage = editingGradeStandard.standard.unit.includes('%');
                    const isBonusMode = editingGradeStandard.standard.mode === 'bonus';
                    return (
                      <div
                        key={grade.grade}
                        className="grid grid-cols-12 gap-3 items-start p-3 rounded-lg"
                        style={{ backgroundColor: `${GRADE_COLORS[grade.grade]}1A` }}  // 10% opacity
                      >
                        <div className="col-span-1 flex items-center justify-center pt-1">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: GRADE_COLORS[grade.grade] }}
                          >
                            {grade.grade}
                          </div>
                        </div>
                        <div className="col-span-4">
                          <Label className="text-xs mb-1 block">最小值{isPercentage ? '(%)' : ''}</Label>
                          <GradeInput
                            value={grade.min_value}
                            isPercentage={isPercentage}
                            onChange={(val) => updateEditingGradeStandardGrade(index, { min_value: val ?? 0 })}
                          />
                        </div>
                        <div className="col-span-4">
                          <Label className="text-xs mb-1 block">最大值{isPercentage ? '(%)' : ''}</Label>
                          <GradeInput
                            value={grade.max_value}
                            isPercentage={isPercentage}
                            allowNull
                            onChange={(val) => updateEditingGradeStandardGrade(index, { max_value: val })}
                          />
                        </div>
                        {isBonusMode && (
                          <div className="col-span-3">
                            <Label className="text-xs mb-1 block">奖金(元)</Label>
                            <Input
                              type="number"
                              value={grade.bonus}
                              onChange={(e) =>
                                updateEditingGradeStandardGrade(index, {
                                  bonus: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="h-8"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGradeStandardDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveGradeStandard} className="bg-yellow-600 hover:bg-yellow-700">
              <Save className="w-4 h-4 mr-1" />
              保存标准
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除等级标准确认对话框 */}
      <AlertDialog open={showDeleteGradeStandardDialog} onOpenChange={setShowDeleteGradeStandardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ 确认删除等级标准</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个等级标准吗？使用此标准的指标可能需要重新配置。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGradeStandard}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 保存成功提示 */}
      <Dialog open={showSaveSuccess} onOpenChange={setShowSaveSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <span>✅</span> 保存成功
            </DialogTitle>
            <DialogDescription>配置已成功保存！</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* 导入配置对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <span>📥</span> 导入配置
            </DialogTitle>
            <DialogDescription>
              上传之前导出的 JSON 配置文件，即可恢复配置
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">💡 使用说明：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>在原设备点击"导出配置"，下载 JSON 文件</li>
                <li>将 JSON 文件保存到微信、邮件或云盘</li>
                <li>在新设备打开本页面，点击"导入配置"</li>
                <li>选择 JSON 文件上传，即可恢复配置</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="import-config-file">选择配置文件</Label>
              <Input
                id="import-config-file"
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setImportConfigText(ev.target?.result as string);
                    toast.success('文件读取成功，点击确认导入');
                  };
                  reader.readAsText(file);
                }}
              />
            </div>
            
            {importConfigText && (
              <div className="space-y-2">
                <Label>文件内容预览</Label>
                <textarea
                  readOnly
                  value={importConfigText.substring(0, 500) + (importConfigText.length > 500 ? '...' : '')}
                  className="w-full h-32 p-3 text-xs font-mono border rounded-lg resize-none bg-gray-50"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportDialog(false);
                setImportConfigText('');
              }}
            >
              取消
            </Button>
            <Button 
              onClick={handleImportConfig}
              disabled={!importConfigText}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <span className="mr-1">📥</span> 确认导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 恢复默认配置确认对话框 */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>恢复默认配置</AlertDialogTitle>
            <AlertDialogDescription>
              确定要重置为默认配置吗？所有自定义修改将丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResetConfirm(false)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const defaultConfig = getDefaultConfig();
                setLocalConfig(defaultConfig);
                onReset();
                setShowResetConfirm(false);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              确定恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除基准配置确认对话框 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除基准配置</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除基准配置吗？删除后恢复默认将使用系统默认配置。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                localStorage.removeItem('kpi_user_default_config');
                onDeleteDefault?.();
                setShowDeleteConfirm(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 配置说明对话框 */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <HelpCircle className="w-5 h-5" />
              配置说明
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700 space-y-2">
            <p>本页面支持完全自定义KPI考核指标和数据字段：</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>自定义字段</strong>：定义从导入数据中提取的字段（列名、数据类型等）</li>
              <li><strong>考核指标</strong>：为每个维度配置考核指标和等级标准</li>
              <li><strong>设为基准配置</strong>：将当前配置设为基准，方便后续恢复</li>
              <li><strong>恢复基准配置</strong>：恢复到之前保存的基准配置</li>
              <li><strong>删除基准配置</strong>：删除已保存的基准配置</li>
              <li><strong>导出配置</strong>：下载 JSON 配置文件，换设备时备份使用</li>
              <li><strong>导入配置</strong>：上传 JSON 配置文件，恢复之前导出的配置</li>
            </ul>
            {userDefaultConfig && (
              <p className="text-green-600 mt-2">✅ 已设置基准配置</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
