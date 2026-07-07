// KPI数据类型定义

export interface KPIRecord {
  日期范围?: string;
  客服类型: string;
  组别: string;
  姓名: string;
  有效会话量?: number;
  满意?: number;
  一般?: number;
  不满意?: number;
  满意率?: number;
  一般率?: number;
  不满意率?: number;
  投诉数?: number;
  有效反馈数?: number | string;
  反馈达成结果?: string;
  等级?: string;
}

export interface FeedbackRecord {
  组别: string;
  姓名: string;
  有效反馈数: number;
  对应达成结果: string;
}

export interface GradeThreshold {
  grade: string;
  min_value: number;
  max_value: number | null;
  bonus: number;
  description: string;
}

// 预设等级标准
export interface GradeStandard {
  id: string;
  name: string;           // 标准名称，如"满意率标准"、"问题数标准"
  unit: string;           // 单位，如"%"、"个"
  description: string;    // 说明
  mode: 'grade' | 'bonus'; // 评定模式：grade=等级评定，bonus=奖金评定
  grades: GradeThreshold[];
}

export interface ThresholdIndicator {
  enabled: boolean;
  field: string;        // 要比较的字段（自定义字段的column_name）
  condition: string;    // 条件：>=, <=, >, <, ==, !=
  value: number;        // 阈值
  description: string;  // 说明（已废弃，保留兼容）
  affected_by_period?: boolean; // 门槛是否受考核周期影响（默认true，与进阶独立）
}

export interface KPIIndicator {
  name: string;
  column_name: string;
  weight: number;
  unit: string;
  formula: string;
  description: string;
  threshold: ThresholdIndicator;
  grades: GradeThreshold[];
  is_higher_better: boolean;
  grade_standard_id?: string; // 使用的预设等级标准ID
  affected_by_period?: boolean; // 是否受考核周期影响（默认true）
}

// 自定义字段定义
export interface CustomField {
  id: string;
  name: string;           // 字段显示名称
  column_name: string;    // 数据列名（从导入数据中提取，或作为计算字段的标识）
  description: string;    // 字段描述
  unit: string;           // 单位
  data_type: 'number' | 'string' | 'percentage';  // 数据类型
  is_required: boolean;   // 是否必需
  is_calculated: boolean; // 是否为计算字段（通过公式计算得出）
  formula: string;        // 计算公式（当 is_calculated 为 true 时使用）
  source_fields: string[]; // 公式依赖的源字段列名
}

export interface DimensionConfig {
  name: string;
  description: string;
  indicators: KPIIndicator[];
  custom_fields: CustomField[];  // 该维度的自定义字段
}

export interface KPIConfig {
  version: string;
  basic: DimensionConfig;
  vip: DimensionConfig;
  leader: DimensionConfig;
  // 全局自定义字段（所有维度共用）
  global_custom_fields: CustomField[];
  // 预设等级标准
  grade_standards: GradeStandard[];
  // 考核周期设置
  assessment_period?: 'monthly' | 'quarterly';
}

export interface HistoryRecord {
  id: string;
  name: string;
  date_range: string;
  created_at: string;
  summary: {
    total_count: number;
    basic_count: number;
    vip_count: number;
    leader_count: number;
    grade_distribution: Record<string, number>;
  };
  data: Record<string, unknown[]>;
  // 新增：存储完整处理后的数据，用于复刻数据处理页面
  processedData: KPIRecord[];
  // 新增：存储原始KPI数据文本（可选，用于重新编辑）
  rawKpiData?: string;
  // 新增：存储原始反馈数据文本（可选）
  rawFeedbackData?: string;
}

export interface MemberData {
  姓名: string;
  name?: string;
  type: string;
  客服类型?: string;
  grade: string;
  等级?: string;
  有效会话量?: number;
  满意率?: number;
  有效反馈数?: number | string;
}

export interface ComparisonResult {
  record1: {
    name: string;
    date_range: string;
  };
  record2: {
    name: string;
    date_range: string;
  };
  common_count: number;
  comparisons: MemberComparison[];
  trend_stats: {
    up: number;
    down: number;
    same: number;
    total: number;
  };
  max_change: {
    name: string;
    grade_change: number;
    from: string;
    to: string;
  } | null;
}

export interface IndicatorChange {
  indicator_name: string;
  column_name: string;
  value1: number;
  value2: number;
  change: number;
  change_percent: number;
  unit: string;
  grade1: string;
  grade2: string;
  grade_change: number;
}

export interface MemberComparison {
  name: string;
  group: string;
  type: string;
  grade1: string;
  grade2: string;
  grade_change: number;
  trend: 'up' | 'down' | 'same';
  trend_text: string;
  trend_icon: string;
  drivers: Driver[];
  indicator_changes: IndicatorChange[];
  details1: MemberData;
  details2: MemberData;
}

export interface Driver {
  label: string;
  field: string;
  value1: number;
  value2: number;
  change: number;
  is_positive: boolean;
}

export const GRADE_COLORS: Record<string, string> = {
  S: '#FFD700',  // 亮金色 - 卓越
  A: '#2ECC71',  // 翠绿色 - 优秀
  B: '#3498DB',  // 天蓝色 - 良好
  C: '#9B59B6',  // 紫罗兰色 - 合格
  D: '#E74C3C',  // 正红色 - 待改进
};

export const GRADE_ICONS: Record<string, string> = {
  S: '🏆',
  A: '🥇',
  B: '🥈',
  C: '🥉',
  D: '📋',
};

export const TYPE_ICONS: Record<string, string> = {
  基础: '👤',
  VIP: '⭐',
  组长: '👑',
};

export const GRADE_ORDER = ['S', 'A', 'B', 'C', 'D'];

export const GRADE_SCORE: Record<string, number> = {
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  D: 1,
};
