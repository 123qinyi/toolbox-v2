import type { KPIRecord, FeedbackRecord, GradeThreshold, KPIConfig, HistoryRecord, MemberData, ComparisonResult, MemberComparison } from '@/types/kpi';
import { GRADE_SCORE } from '@/types/kpi';

// 解析KPI数据
export function parseKPIData(rawData: string): KPIRecord[] {
  const result: KPIRecord[] = [];
  const lines = rawData.split('\n').filter(line => line.trim());

  if (lines.length === 0) return result;

  const headerLine = lines[0].trim();
  const headers = splitLine(headerLine);

  const fieldMapping: Record<string, string[]> = {
    日期范围: ['日期范围', '日期', '时间范围'],
    客服类型: ['客服类型', '类型', '客服'],
    组别: ['组别', '组', '团队'],
    姓名: ['姓名', '名字', '客服姓名'],
    有效会话量: ['有效会话量', '会话量', '有效会话'],
    满意: ['满意', '满意数', '好评'],
    一般: ['一般', '一般数', '中评'],
    不满意: ['不满意', '不满意数', '差评'],
    满意率: ['满意率', '满意率%', '好评率'],
    一般率: ['一般率', '一般率%', '中评率'],
    不满意率: ['不满意率', '不满意率%', '差评率'],
    投诉数: ['投诉数', '邮箱工单投诉数', '邮箱&工单投诉数', '投诉', '投诉量'],
    政府投诉数: ['政府投诉数'],
  };

  const columnMapping: Record<string, number> = {};
  for (const [standardField, possibleNames] of Object.entries(fieldMapping)) {
    for (let idx = 0; idx < headers.length; idx++) {
      if (possibleNames.includes(headers[idx])) {
        columnMapping[standardField] = idx;
        break;
      }
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = splitLine(line);
    if (values.length < 4) continue;

    const record: Partial<KPIRecord> = {};
    for (const [field, colIdx] of Object.entries(columnMapping)) {
      if (colIdx < values.length) {
        const value = values[colIdx].trim();
        (record as Record<string, unknown>)[field] = convertValue(field, value);
      }
    }

    if (record.姓名) {
      result.push(record as KPIRecord);
    }
  }

  return result;
}

// 解析反馈数据
export function parseFeedbackData(rawData: string): FeedbackRecord[] {
  const result: FeedbackRecord[] = [];
  const lines = rawData.split('\n').filter(line => line.trim());

  if (lines.length === 0) return result;

  const headerLine = lines[0].trim();
  const headers = splitLine(headerLine);

  let aGroupIdx = -1;
  let bGroupIdx = -1;

  for (let idx = 0; idx < headers.length; idx++) {
    if (headers[idx].includes('A组')) {
      aGroupIdx = idx;
    } else if (headers[idx].includes('B组')) {
      bGroupIdx = idx;
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = splitLine(line);
    if (values.length < 3) continue;

    if (aGroupIdx >= 0 && aGroupIdx < values.length) {
      const name = values[aGroupIdx].trim();
      if (name && aGroupIdx + 2 < values.length) {
        result.push({
          组别: 'A组',
          姓名: name,
          有效反馈数: extractNumber(values[aGroupIdx + 1]) || 0,
          对应达成结果: values[aGroupIdx + 2].trim(),
        });
      }
    }

    if (bGroupIdx >= 0 && bGroupIdx < values.length) {
      const name = values[bGroupIdx].trim();
      if (name && bGroupIdx + 2 < values.length) {
        result.push({
          组别: 'B组',
          姓名: name,
          有效反馈数: extractNumber(values[bGroupIdx + 1]) || 0,
          对应达成结果: values[bGroupIdx + 2].trim(),
        });
      }
    }
  }

  return result;
}

// 分割行数据
function splitLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t');
  }
  return line.split(/\s{2,}/);
}

// 转换值
function convertValue(field: string, value: string): unknown {
  if (!value || value === '-') return null;

  const numericFields = ['有效会话量', '满意', '一般', '不满意', '投诉数', '有效反馈数'];
  if (numericFields.includes(field)) {
    return extractNumber(value);
  }

  const percentFields = ['满意率', '一般率', '不满意率'];
  if (percentFields.includes(field)) {
    return extractPercentage(value);
  }

  return value;
}

// 提取数字
function extractNumber(value: string): number | null {
  try {
    const cleaned = value.replace(/[^\d.-]/g, '');
    if (cleaned.includes('.')) {
      return parseFloat(cleaned);
    }
    return cleaned ? parseInt(cleaned, 10) : null;
  } catch {
    return null;
  }
}

// 提取百分比
function extractPercentage(value: string): number | null {
  try {
    const cleaned = value.replace('%', '').trim();
    return cleaned ? parseFloat(cleaned) / 100 : null;
  } catch {
    return null;
  }
}

// 合并反馈数据到KPI数据
export function mergeFeedbackData(kpiData: KPIRecord[], feedbackData: FeedbackRecord[]): KPIRecord[] {
  const feedbackLookup = new Map<string, FeedbackRecord>();
  
  for (const fb of feedbackData) {
    const key = `${fb.组别}-${fb.姓名}`;
    feedbackLookup.set(key, fb);
  }

  return kpiData.map(record => {
    const key = `${record.组别}-${record.姓名}`;
    const fb = feedbackLookup.get(key);
    if (fb) {
      return {
        ...record,
        有效反馈数: fb.有效反馈数,
        反馈达成结果: fb.对应达成结果,
      };
    }
    return record;
  });
}

// 根据满意率计算等级
export function calculateGrade(satisfactionRate: number): string {
  if (satisfactionRate >= 0.90) return 'S';
  if (satisfactionRate >= 0.85) return 'A';
  if (satisfactionRate >= 0.80) return 'B';
  if (satisfactionRate >= 0.70) return 'C';
  return 'D';
}

// 为KPI数据添加等级
// 根据指标配置的等级标准计算等级
export function calculateGradeFromConfig(value: number, grades: GradeThreshold[]): string {
  // 按min_value降序排序，优先匹配高等级
  const sortedGrades = [...grades].sort((a, b) => b.min_value - a.min_value);
  
  for (const grade of sortedGrades) {
    // 区间 [min_value, max_value] 都包含边界值
    if (value >= grade.min_value) {
      // 检查是否超过max_value（包含边界）
      if (grade.max_value === null || value <= grade.max_value) {
        return grade.grade;
      }
    }
  }
  
  // 默认返回最低等级
  return sortedGrades[sortedGrades.length - 1]?.grade || 'D';
}

// 为KPI数据添加等级（使用配置中的等级标准）
export function addGradesToData(data: KPIRecord[], config?: KPIConfig): KPIRecord[] {
  // 如果没有配置，使用默认等级计算
  if (!config) {
    return data.map(record => ({
      ...record,
      等级: calculateGrade(record.满意率 || 0),
    }));
  }

  return data.map(record => {
    const csType = record.客服类型 || '基础';
    let grade = 'D';

    // 根据客服类型获取对应的指标配置
    let dimension: 'basic' | 'vip' | 'leader' = 'basic';
    if (csType === 'VIP') dimension = 'vip';
    else if (csType === '组长') dimension = 'leader';

    const indicators = config[dimension].indicators;
    
    if (indicators.length > 0) {
      // 使用第一个指标的等级标准（通常是主要指标）
      const primaryIndicator = indicators[0];
      const columnName = primaryIndicator.column_name;
      const value = record[columnName as keyof KPIRecord] as number;
      
      if (value !== undefined && value !== null) {
        grade = calculateGradeFromConfig(value, primaryIndicator.grades);
      } else {
        // 如果找不到对应字段，使用满意率
        grade = calculateGradeFromConfig(record.满意率 || 0, primaryIndicator.grades);
      }
    } else {
      // 没有配置指标时使用默认等级
      grade = calculateGrade(record.满意率 || 0);
    }

    return {
      ...record,
      等级: grade,
    };
  });
}

// 计算数据汇总
export function calculateSummary(data: KPIRecord[]) {
  const summary = {
    total_records: data.length,
    groups: {} as Record<string, { count: number; names: string[] }>,
    types: {} as Record<string, number>,
    totals: {
      有效会话量: 0,
      满意: 0,
      一般: 0,
      不满意: 0,
      投诉数: 0,
    },
    avg_satisfaction_rate: 0,
  };

  for (const record of data) {
    const group = record.组别 || '未知';
    if (!summary.groups[group]) {
      summary.groups[group] = { count: 0, names: [] };
    }
    summary.groups[group].count++;
    if (record.姓名) {
      summary.groups[group].names.push(record.姓名);
    }

    const csType = record.客服类型 || '未知';
    summary.types[csType] = (summary.types[csType] || 0) + 1;

    for (const field of Object.keys(summary.totals)) {
      const value = record[field as keyof KPIRecord] as number | undefined;
      if (value !== undefined && value !== null) {
        summary.totals[field as keyof typeof summary.totals] += value;
      }
    }
  }

  const satisfactionRates = data
    .map(r => r.满意率)
    .filter((r): r is number => r !== undefined && r !== null);
  
  if (satisfactionRates.length > 0) {
    summary.avg_satisfaction_rate = satisfactionRates.reduce((a, b) => a + b, 0) / satisfactionRates.length;
  }

  return summary;
}

// 生成个人复盘文本
export function generateReportText(data: KPIRecord[], config: KPIConfig): string {
  if (!data || data.length === 0) return '';

  const lines: string[] = [];
  const periodText = config.assessment_period === 'quarterly' ? '本季度' : '本月';
  const multiplier = config.assessment_period === 'quarterly' ? 3 : 1;

  for (const record of data) {
    const csType = record.客服类型 || '基础';
    let dimension: 'basic' | 'vip' | 'leader' = 'basic';
    if (csType === 'VIP') dimension = 'vip';
    else if (csType === '组长') dimension = 'leader';

    const indicators = config[dimension].indicators;
    if (indicators.length === 0) continue;

    // 计算每个指标的等级和门槛
    const achievedIndicators: { name: string; grade: string; value: number; unit: string }[] = [];
    const thresholdResults: { name: string; field: string; passed: boolean; value: number }[] = [];

    for (const ind of indicators) {
      const value = record[ind.column_name as keyof KPIRecord] as number | undefined;
      if (value === undefined || value === null) continue;

      // 计算等级
      const gradeAffectedByPeriod = ind.affected_by_period !== false;
      const gradeMultiplier = gradeAffectedByPeriod ? multiplier : 1;
      const adjustedValue = value / gradeMultiplier;
      const sortedGrades = [...ind.grades].sort((a, b) => b.min_value - a.min_value);
      let grade = 'D';
      for (const g of sortedGrades) {
        if (adjustedValue >= g.min_value && (g.max_value === null || adjustedValue <= g.max_value)) {
          grade = g.grade;
          break;
        }
      }

      achievedIndicators.push({
        name: ind.name,
        grade,
        value: Number(value.toFixed(2)),
        unit: ind.unit,
      });

      // 门槛判断
      if (ind.threshold.enabled) {
        const thresholdValue = record[ind.threshold.field as keyof KPIRecord] as number | undefined;
        if (thresholdValue !== undefined) {
          const thresholdAffectedByPeriod = ind.threshold.affected_by_period !== false;
          const thresholdMultiplier = thresholdAffectedByPeriod ? multiplier : 1;
          const adjustedThresholdValue = thresholdValue / thresholdMultiplier;
          let passed = false;
          switch (ind.threshold.condition) {
            case '>=': passed = adjustedThresholdValue >= ind.threshold.value; break;
            case '<=': passed = adjustedThresholdValue <= ind.threshold.value; break;
            case '>': passed = adjustedThresholdValue > ind.threshold.value; break;
            case '<': passed = adjustedThresholdValue < ind.threshold.value; break;
            case '==': passed = adjustedThresholdValue === ind.threshold.value; break;
            case '!=': passed = adjustedThresholdValue !== ind.threshold.value; break;
          }
          thresholdResults.push({
            name: ind.name,
            field: ind.threshold.field,
            passed,
            value: thresholdValue,
          });
        }
      }
    }

    // 生成个人标题行
    const typeLabel = csType === '组长' ? '客服组长' : csType === 'VIP' ? 'VIP客服' : '基础客服';
    const achievedText = achievedIndicators.map(a => `${a.name} ${a.grade}`).join(' + ');
    lines.push(`${typeLabel}:${record.姓名}【进阶达成：${achievedText}】`);

    // 门槛指标
    let itemNo = 1;
    for (const tr of thresholdResults) {
      const status = tr.passed ? '已达成' : '未达成';
      lines.push(`${itemNo}. ${tr.name}【门槛指标：${status}】`);
      lines.push(`- ${periodText}${tr.field}数为${tr.value}`);
      itemNo++;
    }

    // 进阶指标
    for (const ai of achievedIndicators) {
      lines.push(`${itemNo}. ${ai.name}【${ai.grade}】`);
      lines.push(`- ${periodText}${ai.name}为${ai.value}${ai.unit}`);
      itemNo++;
    }

    lines.push(''); // 空行分隔
  }

  return lines.join('\n');
}

// 获取默认KPI配置
export function getDefaultConfig(): KPIConfig {
  return {
  "version": "2.1.0",
  "basic": {
    "name": "基础客服",
    "description": "基础客服人员的KPI考核指标",
    "indicators": [
      {
        "name": "问题接入数+投诉数（基础）",
        "column_name": "有效会话量",
        "weight": 50,
        "unit": "个",
        "formula": "",
        "description": "月度有效会话数量",
        "threshold": {
          "enabled": true,
          "condition": "==",
          "value": 0,
          "description": "最低处理200个问题",
          "field": "投诉数"
        },
        "grades": [
          {
            "grade": "S",
            "min_value": 1080,
            "max_value": null,
            "bonus": 0,
            "description": "卓越"
          },
          {
            "grade": "A",
            "min_value": 900,
            "max_value": 1079,
            "bonus": 0,
            "description": "优秀"
          },
          {
            "grade": "B",
            "min_value": 720,
            "max_value": 899,
            "bonus": 0,
            "description": "良好"
          },
          {
            "grade": "C",
            "min_value": 540,
            "max_value": 719,
            "bonus": 0,
            "description": "合格"
          },
          {
            "grade": "D",
            "min_value": 0,
            "max_value": 539,
            "bonus": 0,
            "description": "待改进"
          }
        ],
        "is_higher_better": true,
        "grade_standard_id": "grade_std_2"
      },
      {
        "name": "满意率+差评数(基础)",
        "column_name": "满意率",
        "weight": 50,
        "unit": "%",
        "formula": "",
        "description": "客户满意度百分比",
        "threshold": {
          "enabled": true,
          "condition": "<=",
          "value": 8,
          "description": "满意率需≥80%",
          "field": "不满意"
        },
        "grades": [
          {
            "grade": "S",
            "min_value": 45,
            "max_value": 100,
            "bonus": 0,
            "description": "卓越"
          },
          {
            "grade": "A",
            "min_value": 35,
            "max_value": 44.99,
            "bonus": 0,
            "description": "优秀"
          },
          {
            "grade": "B",
            "min_value": 25,
            "max_value": 34.99,
            "bonus": 0,
            "description": "良好"
          },
          {
            "grade": "C",
            "min_value": 15,
            "max_value": 24.99,
            "bonus": 0,
            "description": "合格"
          },
          {
            "grade": "D",
            "min_value": 0,
            "max_value": 14.99,
            "bonus": 0,
            "description": "待改进"
          }
        ],
        "is_higher_better": true,
        "affected_by_period": false,
        "grade_standard_id": "grade_std_1"
      },
      {
        "name": "有效反馈数",
        "column_name": "有效反馈数",
        "weight": 0,
        "unit": "个",
        "formula": "",
        "description": "有效反馈数量",
        "threshold": {
          "enabled": false,
          "field": "",
          "condition": ">=",
          "value": 0,
          "description": ""
        },
        "grades": [
          {
            "grade": "S",
            "min_value": 30,
            "max_value": null,
            "bonus": 200,
            "description": "卓越"
          },
          {
            "grade": "A",
            "min_value": 20,
            "max_value": 29.99,
            "bonus": 150,
            "description": "优秀"
          },
          {
            "grade": "B",
            "min_value": 10,
            "max_value": 19.99,
            "bonus": 100,
            "description": "良好"
          },
          {
            "grade": "C",
            "min_value": 5,
            "max_value": 9.99,
            "bonus": 50,
            "description": "合格"
          },
          {
            "grade": "D",
            "min_value": 0,
            "max_value": 4.99,
            "bonus": 0,
            "description": "待改进"
          }
        ],
        "is_higher_better": true,
        "grade_standard_id": "grade_std_1775393006276"
      }
    ],
    "custom_fields": []
  },
  "vip": {
    "name": "VIP客服",
    "description": "VIP客服人员的KPI考核指标",
    "indicators": [
      {
        "name": "问题接入数+投诉数(VIP)",
        "column_name": "有效会话量",
        "weight": 50,
        "unit": "个",
        "formula": "",
        "description": "月度有效会话数量",
        "threshold": {
          "enabled": true,
          "condition": "==",
          "value": 0,
          "description": "投诉数必须为0",
          "field": "投诉数"
        },
        "grades": [
          {
            "grade": "S",
            "min_value": 900,
            "max_value": null,
            "bonus": 0,
            "description": "卓越"
          },
          {
            "grade": "A",
            "min_value": 720,
            "max_value": 899,
            "bonus": 0,
            "description": "优秀"
          },
          {
            "grade": "B",
            "min_value": 540,
            "max_value": 719,
            "bonus": 0,
            "description": "良好"
          },
          {
            "grade": "C",
            "min_value": 360,
            "max_value": 539,
            "bonus": 0,
            "description": "合格"
          },
          {
            "grade": "D",
            "min_value": 0,
            "max_value": 359,
            "bonus": 0,
            "description": "待改进"
          }
        ],
        "is_higher_better": true,
        "grade_standard_id": "grade_std_1775391733993"
      },
      {
        "name": "满意率+差评数(VIP)",
        "column_name": "满意率",
        "weight": 50,
        "unit": "%",
        "formula": "满意率",
        "description": "客户满意率百分比",
        "threshold": {
          "enabled": true,
          "condition": "<=",
          "value": 8,
          "description": "差评数≤8",
          "field": "不满意"
        },
        "grades": [
          {
            "grade": "S",
            "min_value": 75,
            "max_value": 100,
            "bonus": 0,
            "description": "卓越"
          },
          {
            "grade": "A",
            "min_value": 65,
            "max_value": 74.99,
            "bonus": 0,
            "description": "优秀"
          },
          {
            "grade": "B",
            "min_value": 55,
            "max_value": 64.99,
            "bonus": 0,
            "description": "良好"
          },
          {
            "grade": "C",
            "min_value": 50,
            "max_value": 54.99,
            "bonus": 0,
            "description": "合格"
          },
          {
            "grade": "D",
            "min_value": 0,
            "max_value": 49.99,
            "bonus": 0,
            "description": "待改进"
          }
        ],
        "is_higher_better": true,
        "affected_by_period": false,
        "grade_standard_id": "grade_std_1775391654453"
      },
      {
        "name": "有效反馈数",
        "column_name": "有效反馈数",
        "weight": 0,
        "unit": "个",
        "formula": "",
        "description": "有效反馈数量",
        "threshold": {
          "enabled": false,
          "field": "",
          "condition": ">=",
          "value": 0,
          "description": ""
        },
        "grades": [
          {
            "grade": "S",
            "min_value": 30,
            "max_value": null,
            "bonus": 200,
            "description": "卓越"
          },
          {
            "grade": "A",
            "min_value": 20,
            "max_value": 29.99,
            "bonus": 150,
            "description": "优秀"
          },
          {
            "grade": "B",
            "min_value": 10,
            "max_value": 19.99,
            "bonus": 100,
            "description": "良好"
          },
          {
            "grade": "C",
            "min_value": 5,
            "max_value": 9.99,
            "bonus": 50,
            "description": "合格"
          },
          {
            "grade": "D",
            "min_value": 0,
            "max_value": 4.99,
            "bonus": 0,
            "description": "待改进"
          }
        ],
        "is_higher_better": true,
        "grade_standard_id": "grade_std_1775393006276"
      }
    ],
    "custom_fields": []
  },
  "leader": {
    "name": "组长",
    "description": "组长的KPI考核指标",
    "indicators": [
      {
        "name": "服务分",
        "column_name": "服务分",
        "weight": 0,
        "unit": "",
        "formula": "服务分",
        "description": "综合服务评分",
        "threshold": {
          "enabled": false,
          "field": "",
          "condition": ">=",
          "value": 0,
          "description": ""
        },
        "grades": [
          {
            "grade": "S",
            "min_value": 4.2,
            "max_value": null,
            "bonus": 0,
            "description": "卓越"
          },
          {
            "grade": "A",
            "min_value": 4,
            "max_value": 4.199,
            "bonus": 0,
            "description": "优秀"
          },
          {
            "grade": "B",
            "min_value": 3.9,
            "max_value": 3.999,
            "bonus": 0,
            "description": "良好"
          },
          {
            "grade": "C",
            "min_value": 3.8,
            "max_value": 3.899,
            "bonus": 0,
            "description": "合格"
          },
          {
            "grade": "D",
            "min_value": 0,
            "max_value": 3.799,
            "bonus": 0,
            "description": "待改进"
          }
        ],
        "is_higher_better": true,
        "grade_standard_id": "grade_std_3",
        "affected_by_period": false
      }
    ],
    "custom_fields": []
  },
  "global_custom_fields": [
      {
            "id": "field_1",
            "name": "日期范围",
            "column_name": "日期范围",
            "description": "数据统计的日期范围",
            "unit": "",
            "data_type": "string",
            "is_required": true,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_2",
            "name": "类型",
            "column_name": "客服类型",
            "description": "客服人员的类型（基础/VIP/组长）",
            "unit": "",
            "data_type": "string",
            "is_required": true,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_3",
            "name": "组别",
            "column_name": "组别",
            "description": "所属组别（A组/B组等）",
            "unit": "",
            "data_type": "string",
            "is_required": true,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_4",
            "name": "姓名",
            "column_name": "姓名",
            "description": "客服人员姓名",
            "unit": "",
            "data_type": "string",
            "is_required": true,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_5",
            "name": "问题数",
            "column_name": "有效会话量",
            "description": "月度有效会话数量",
            "unit": "个",
            "data_type": "number",
            "is_required": true,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_6",
            "name": "满意数",
            "column_name": "满意",
            "description": "满意评价数量",
            "unit": "个",
            "data_type": "number",
            "is_required": true,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_7",
            "name": "中评数",
            "column_name": "一般",
            "description": "一般评价数量",
            "unit": "个",
            "data_type": "number",
            "is_required": true,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_8",
            "name": "差评数",
            "column_name": "不满意",
            "description": "不满意评价数量",
            "unit": "个",
            "data_type": "number",
            "is_required": true,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_10",
            "name": "政府投诉数",
            "column_name": "政府投诉数",
            "description": "投诉前有咨询过客服的投诉数量",
            "unit": "个",
            "data_type": "number",
            "is_required": false,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_1778408422740",
            "name": "投诉数",
            "column_name": "投诉数",
            "description": "投诉数",
            "unit": "",
            "data_type": "number",
            "is_required": false,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_11",
            "name": "有效反馈数",
            "column_name": "有效反馈数",
            "description": "有效反馈数量",
            "unit": "个",
            "data_type": "number",
            "is_required": false,
            "is_calculated": false,
            "formula": "",
            "source_fields": []
      },
      {
            "id": "field_1775382631596",
            "name": "满意率",
            "column_name": "满意率",
            "description": "客户满意率百分比",
            "unit": "%",
            "data_type": "percentage",
            "is_required": false,
            "is_calculated": true,
            "formula": "满意/有效会话量*100",
            "source_fields": [
                  "有效会话量",
                  "满意"
            ]
      },
      {
            "id": "field_1778408439700",
            "name": "服务分分母",
            "column_name": "服务分分母",
            "description": "问题数+投诉数+政府投诉数",
            "unit": "",
            "data_type": "number",
            "is_required": false,
            "is_calculated": true,
            "formula": "有效会话量+政府投诉数+投诉数",
            "source_fields": [
                  "有效会话量",
                  "政府投诉数",
                  "投诉数"
            ]
      },
      {
            "id": "field_1775382712804",
            "name": "服务分",
            "column_name": "服务分",
            "description": "综合服务评分",
            "unit": "",
            "data_type": "number",
            "is_required": false,
            "is_calculated": true,
            "formula": "(满意*10+一般*1-不满意*10-投诉数*20-政府投诉数*100)/服务分分母",
            "source_fields": [
                  "满意",
                  "一般",
                  "不满意",
                  "投诉数",
                  "政府投诉数",
                  "服务分分母"
            ]
      }
],
  "assessment_period": "monthly",
  "grade_standards": [
    {
      "id": "grade_std_1",
      "name": "基础满意率标准",
      "unit": "%",
      "description": "适用于基础满意率等百分比指标",
      "mode": "grade",
      "grades": [
        {
          "grade": "S",
          "min_value": 45,
          "max_value": 100,
          "bonus": 0,
          "description": "卓越"
        },
        {
          "grade": "A",
          "min_value": 35,
          "max_value": 44.99,
          "bonus": 0,
          "description": "优秀"
        },
        {
          "grade": "B",
          "min_value": 25,
          "max_value": 34.99,
          "bonus": 0,
          "description": "良好"
        },
        {
          "grade": "C",
          "min_value": 15,
          "max_value": 24.99,
          "bonus": 0,
          "description": "合格"
        },
        {
          "grade": "D",
          "min_value": 0,
          "max_value": 14.99,
          "bonus": 0,
          "description": "待改进"
        }
      ]
    },
    {
      "id": "grade_std_2",
      "name": "基础问题数标准",
      "unit": "个",
      "description": "适用于基础问题接入数等数量指标",
      "mode": "grade",
      "grades": [
        {
          "grade": "S",
          "min_value": 1080,
          "max_value": null,
          "bonus": 0,
          "description": "卓越"
        },
        {
          "grade": "A",
          "min_value": 900,
          "max_value": 1079,
          "bonus": 0,
          "description": "优秀"
        },
        {
          "grade": "B",
          "min_value": 720,
          "max_value": 899,
          "bonus": 0,
          "description": "良好"
        },
        {
          "grade": "C",
          "min_value": 540,
          "max_value": 719,
          "bonus": 0,
          "description": "合格"
        },
        {
          "grade": "D",
          "min_value": 0,
          "max_value": 539,
          "bonus": 0,
          "description": "待改进"
        }
      ]
    },
    {
      "id": "grade_std_3",
      "name": "组长服务分标准",
      "unit": "分",
      "description": "适用于组长服务分等综合评分指标",
      "mode": "grade",
      "grades": [
        {
          "grade": "S",
          "min_value": 4.2,
          "max_value": null,
          "bonus": 0,
          "description": "卓越"
        },
        {
          "grade": "A",
          "min_value": 4,
          "max_value": 4.199,
          "bonus": 0,
          "description": "优秀"
        },
        {
          "grade": "B",
          "min_value": 3.9,
          "max_value": 3.999,
          "bonus": 0,
          "description": "良好"
        },
        {
          "grade": "C",
          "min_value": 3.8,
          "max_value": 3.899,
          "bonus": 0,
          "description": "合格"
        },
        {
          "grade": "D",
          "min_value": 0,
          "max_value": 3.799,
          "bonus": 0,
          "description": "待改进"
        }
      ]
    },
    {
      "id": "grade_std_1775391654453",
      "name": "VIP满意率标准",
      "unit": "%",
      "description": "适用于VIP满意率百分比指标",
      "mode": "grade",
      "grades": [
        {
          "grade": "S",
          "min_value": 75,
          "max_value": 100,
          "bonus": 0,
          "description": "卓越"
        },
        {
          "grade": "A",
          "min_value": 65,
          "max_value": 74.99,
          "bonus": 0,
          "description": "优秀"
        },
        {
          "grade": "B",
          "min_value": 55,
          "max_value": 64.99,
          "bonus": 0,
          "description": "良好"
        },
        {
          "grade": "C",
          "min_value": 50,
          "max_value": 54.99,
          "bonus": 0,
          "description": "合格"
        },
        {
          "grade": "D",
          "min_value": 0,
          "max_value": 49.99,
          "bonus": 0,
          "description": "待改进"
        }
      ]
    },
    {
      "id": "grade_std_1775391733993",
      "name": "VIP问题数标准",
      "unit": "",
      "description": "适用于VIP问题数指标",
      "mode": "grade",
      "grades": [
        {
          "grade": "S",
          "min_value": 900,
          "max_value": null,
          "bonus": 0,
          "description": "卓越"
        },
        {
          "grade": "A",
          "min_value": 720,
          "max_value": 899,
          "bonus": 0,
          "description": "优秀"
        },
        {
          "grade": "B",
          "min_value": 540,
          "max_value": 719,
          "bonus": 0,
          "description": "良好"
        },
        {
          "grade": "C",
          "min_value": 360,
          "max_value": 539,
          "bonus": 0,
          "description": "合格"
        },
        {
          "grade": "D",
          "min_value": 0,
          "max_value": 359,
          "bonus": 0,
          "description": "待改进"
        }
      ]
    },
    {
      "id": "grade_std_1775393006276",
      "name": "有效反馈",
      "unit": "",
      "description": "有效反馈数",
      "mode": "bonus",
      "grades": [
        {
          "grade": "S",
          "min_value": 30,
          "max_value": null,
          "bonus": 200,
          "description": "卓越"
        },
        {
          "grade": "A",
          "min_value": 20,
          "max_value": 29.99,
          "bonus": 150,
          "description": "优秀"
        },
        {
          "grade": "B",
          "min_value": 10,
          "max_value": 19.99,
          "bonus": 100,
          "description": "良好"
        },
        {
          "grade": "C",
          "min_value": 5,
          "max_value": 9.99,
          "bonus": 50,
          "description": "合格"
        },
        {
          "grade": "D",
          "min_value": 0,
          "max_value": 4.99,
          "bonus": 0,
          "description": "待改进"
        }
      ]
    }
  ]
};
}

// 计算公式
// 支持的运算符: + - * / ( )
// 字段名用中文列名，如：满意, 一般, 不满意, 有效会话量
export function calculateFormula(formula: string, record: Record<string, unknown>): number | null {
  if (!formula.trim()) return null;

  try {
    // 将公式中的字段名替换为实际值
    let expression = formula;
    
    // 提取所有可能的字段名（中文字符序列）
    const fieldNames = formula.match(/[\u4e00-\u9fa5]+/g) || [];
    
    // 按长度降序排序，避免短字段名替换长字段名的一部分（如"满意"替换"不满意"中的部分）
    const sortedFieldNames = [...fieldNames].sort((a, b) => b.length - a.length);
    
    for (const fieldName of sortedFieldNames) {
      const value = record[fieldName];
      // 如果字段缺失或为null，使用0作为默认值
      if (value === undefined || value === null) {
        expression = expression.replace(new RegExp(fieldName, 'g'), '0');
        continue;
      }
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numValue)) {
        expression = expression.replace(new RegExp(fieldName, 'g'), '0');
        continue;
      }
      expression = expression.replace(new RegExp(fieldName, 'g'), String(numValue));
    }

    // 安全计算表达式
    // 只允许数字、运算符和括号
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return null;
    }

    // 使用 Function 安全计算
    const result = new Function('return ' + expression)();
    
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch (error) {
    console.error('Formula calculation error:', error);
    return null;
  }
}

// 为记录计算所有计算字段（支持字段间互相引用，自动拓扑排序）
export function calculateCustomFields(
  record: Record<string, unknown>,
  customFields: Array<{ column_name: string; is_calculated: boolean; formula: string }>
): Record<string, unknown> {
  const result = { ...record };
  
  // 1. 收集所有计算字段
  const calcFields = customFields.filter(f => f.is_calculated && f.formula);
  if (calcFields.length === 0) return result;

  // 2. 构建依赖图：每个字段依赖哪些其他字段
  const dependencies = new Map<string, string[]>();
  const allColumnNames = new Set(customFields.map(f => f.column_name));
  
  for (const field of calcFields) {
    const deps: string[] = [];
    const fieldNames = field.formula.match(/[\u4e00-\u9fa5]+/g) || [];
    const sorted = [...fieldNames].sort((a, b) => b.length - a.length);
    for (const name of sorted) {
      if (allColumnNames.has(name) && name !== field.column_name) {
        deps.push(name);
      }
    }
    dependencies.set(field.column_name, deps);
  }

  // 3. Kahn算法拓扑排序
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  
  for (const field of calcFields) {
    inDegree.set(field.column_name, 0);
    adj.set(field.column_name, []);
  }
  
  for (const [col, deps] of dependencies) {
    for (const dep of deps) {
      if (adj.has(dep)) {
        adj.get(dep)!.push(col);
        inDegree.set(col, (inDegree.get(col) || 0) + 1);
      }
    }
  }
  
  const queue: string[] = [];
  for (const [col, deg] of inDegree) {
    if (deg === 0) queue.push(col);
  }
  
  const order: string[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    order.push(cur);
    for (const next of adj.get(cur) || []) {
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }
  
  // 4. 按拓扑排序后的顺序计算
  for (const colName of order) {
    const field = calcFields.find(f => f.column_name === colName);
    if (field) {
      const calculatedValue = calculateFormula(field.formula, result);
      if (calculatedValue !== null) {
        result[field.column_name] = Math.round(calculatedValue * 100) / 100;
      }
    }
  }
  
  return result;
}

// 构建人员映射表
export function buildMemberMap(data: Record<string, unknown[]>): Map<string, MemberData> {
  const memberMap = new Map<string, MemberData>();
  
  for (const [groupName, members] of Object.entries(data)) {
    for (const member of members as MemberData[]) {
      const name = member.姓名 || member.name || '';
      if (name) {
        memberMap.set(name, { ...member, _group: groupName } as MemberData);
      }
    }
  }
  
  return memberMap;
}

// 要对比的指标字段配置
const COMPARE_INDICATORS = [
  { column_name: '有效会话量', name: '问题数', unit: '个' },
  { column_name: '满意率', name: '满意率', unit: '%' },
  { column_name: '服务分', name: '服务分', unit: '分' },
  { column_name: '有效反馈数', name: '有效反馈', unit: '个' },
];

// 根据值和等级标准计算等级
function calculateIndicatorGrade(value: number, grades: GradeThreshold[], periodMultiplier: number = 1): string {
  const adjustedValue = value / periodMultiplier;
  const sortedGrades = [...grades].sort((a, b) => b.min_value - a.min_value);
  for (const g of sortedGrades) {
    if (adjustedValue >= g.min_value && (g.max_value === null || adjustedValue <= g.max_value)) {
      return g.grade;
    }
  }
  return 'D';
}

// 检查门槛是否达成（带周期系数）
function checkThresholdWithMultiplier(
  record: MemberData, 
  threshold: { enabled: boolean; field: string; condition: string; value: number },
  multiplier: number = 1
): boolean {
  if (!threshold.enabled) return true;
  
  const thresholdValue = (record as unknown as Record<string, unknown>)[threshold.field] as number;
  if (thresholdValue === undefined) return true;
  
  // 门槛标准乘以周期系数（月度×1，季度×3）
  const adjustedThresholdValue = threshold.value * multiplier;
  
  switch (threshold.condition) {
    case '>=': return thresholdValue >= adjustedThresholdValue;
    case '<=': return thresholdValue <= adjustedThresholdValue;
    case '>': return thresholdValue > adjustedThresholdValue;
    case '<': return thresholdValue < adjustedThresholdValue;
    case '==': return thresholdValue === adjustedThresholdValue;
    case '!=': return thresholdValue !== adjustedThresholdValue;
    default: return true;
  }
}

// 对比两个成员
export function compareMember(
  name: string, 
  member1: MemberData, 
  member2: MemberData,
  config?: KPIConfig
): MemberComparison {
  const grade1 = member1.grade || member1.等级 || 'D';
  const grade2 = member2.grade || member2.等级 || 'D';

  const gradeChange = (GRADE_SCORE[grade2] || 1) - (GRADE_SCORE[grade1] || 1);

  let trend: 'up' | 'down' | 'same';
  let trendText: string;
  let trendIcon: string;

  if (gradeChange > 0) {
    trend = 'up';
    trendText = '📈 上升';
    trendIcon = '⬆️';
  } else if (gradeChange < 0) {
    trend = 'down';
    trendText = '📉 下降';
    trendIcon = '⬇️';
  } else {
    trend = 'same';
    trendText = '➡️ 持平';
    trendIcon = '➡️';
  }

  // 获取成员维度
  const memberType = member2.type || member2.客服类型 || '基础';
  let dimension: 'basic' | 'vip' | 'leader' = 'basic';
  if (memberType === 'VIP') dimension = 'vip';
  else if (memberType === '组长') dimension = 'leader';
  
  const indicators = config?.[dimension]?.indicators || [];
  const indicatorMap = new Map(indicators.map(ind => [ind.column_name, ind]));

  // 计算各指标变化
  const indicatorChanges: import('@/types/kpi').IndicatorChange[] = [];
  for (const indicator of COMPARE_INDICATORS) {
    const value1 = (member1 as unknown as Record<string, unknown>)[indicator.column_name] as number;
    const value2 = (member2 as unknown as Record<string, unknown>)[indicator.column_name] as number;
    
    if (value1 !== undefined && value2 !== undefined) {
      const change = value2 - value1;
      const changePercent = value1 !== 0 ? (change / value1) * 100 : 0;
      
      // 计算每个指标的等级
      const indConfig = indicatorMap.get(indicator.column_name);
      let indGrade1 = 'D';
      let indGrade2 = 'D';
      
      if (indConfig) {
        // 门槛默认受考核周期影响（与进阶独立控制）
        const thresholdAffectedByPeriod = indConfig.threshold.affected_by_period !== false;
        const thresholdMultiplier = (config?.assessment_period === 'quarterly' && thresholdAffectedByPeriod) ? 3 : 1;
        
        // 进阶受 affected_by_period 开关控制
        const gradeAffectedByPeriod = indConfig.affected_by_period !== false;
        const gradeMultiplier = (config?.assessment_period === 'quarterly' && gradeAffectedByPeriod) ? 3 : 1;
        
        // 判断门槛是否达成
        const thresholdPass1 = !indConfig.threshold.enabled || checkThresholdWithMultiplier(member1, indConfig.threshold, thresholdMultiplier);
        const thresholdPass2 = !indConfig.threshold.enabled || checkThresholdWithMultiplier(member2, indConfig.threshold, thresholdMultiplier);
        
        // 门槛达成才计算等级，否则强制为D
        indGrade1 = thresholdPass1 ? calculateIndicatorGrade(value1, indConfig.grades, gradeMultiplier) : 'D';
        indGrade2 = thresholdPass2 ? calculateIndicatorGrade(value2, indConfig.grades, gradeMultiplier) : 'D';
      }
      
      const indGradeChange = (GRADE_SCORE[indGrade2] || 1) - (GRADE_SCORE[indGrade1] || 1);
      
      indicatorChanges.push({
        indicator_name: indicator.name,
        column_name: indicator.column_name,
        value1,
        value2,
        change,
        change_percent: changePercent,
        unit: indicator.unit,
        grade1: indGrade1,
        grade2: indGrade2,
        grade_change: indGradeChange,
      });
    }
  }

  return {
    name,
    group: (member2 as unknown as Record<string, string>)._group || '',
    type: member2.type || member2.客服类型 || '',
    grade1,
    grade2,
    grade_change: gradeChange,
    trend,
    trend_text: trendText,
    trend_icon: trendIcon,
    drivers: [],
    indicator_changes: indicatorChanges,
    details1: member1,
    details2: member2,
  };
}

// 对比两个历史记录
export function compareRecords(record1: HistoryRecord, record2: HistoryRecord, config?: KPIConfig): ComparisonResult {
  const data1 = record1.data;
  const data2 = record2.data;

  const members1 = buildMemberMap(data1);
  const members2 = buildMemberMap(data2);

  const commonNames = new Set<string>();
  for (const name of members1.keys()) {
    if (members2.has(name)) {
      commonNames.add(name);
    }
  }

  const comparisons: MemberComparison[] = [];
  for (const name of Array.from(commonNames).sort()) {
    const member1 = members1.get(name)!;
    const member2 = members2.get(name)!;
    comparisons.push(compareMember(name, member1, member2, config));
  }

  const trendStats = {
    up: comparisons.filter(c => c.trend === 'up').length,
    down: comparisons.filter(c => c.trend === 'down').length,
    same: comparisons.filter(c => c.trend === 'same').length,
    total: comparisons.length,
  };

  const sortedComparisons = [...comparisons].sort((a, b) => 
    Math.abs(b.grade_change) - Math.abs(a.grade_change)
  );

  const maxChange = sortedComparisons.length > 0 && sortedComparisons[0].grade_change !== 0
    ? {
        name: sortedComparisons[0].name,
        grade_change: sortedComparisons[0].grade_change,
        from: sortedComparisons[0].grade1,
        to: sortedComparisons[0].grade2,
      }
    : null;

  return {
    record1: {
      name: record1.name,
      date_range: record1.date_range,
    },
    record2: {
      name: record2.name,
      date_range: record2.date_range,
    },
    common_count: commonNames.size,
    comparisons,
    trend_stats: trendStats,
    max_change: maxChange,
  };
}

// 生成表格复制文本（tab分隔，可直接粘贴到Excel）
export function generateTableText(data: KPIRecord[], config: KPIConfig): string {
  if (!data || data.length === 0) return '';

  const getFieldDisplayName = (columnName: string): string => {
    const field = config.global_custom_fields?.find(f => f.column_name === columnName);
    return field?.name || columnName;
  };

  // 收集所有不重复指标（与表格表头一致）
  const allIndicators: { column_name: string; hasThreshold: boolean; thresholdField: string; hasBonus: boolean }[] = [];
  const seenNames = new Set<string>();
  (['basic', 'vip', 'leader'] as const).forEach(dim => {
    config[dim].indicators.forEach(ind => {
      if (!seenNames.has(ind.column_name)) {
        seenNames.add(ind.column_name);
        allIndicators.push({ column_name: ind.column_name, hasThreshold: false, thresholdField: '', hasBonus: false });
      }
    });
  });

  // 计算每个指标是否有门槛、是否有奖金
  allIndicators.forEach(indInfo => {
    (['basic', 'vip', 'leader'] as const).forEach(dim => {
      const dimInd = config[dim].indicators.find(i => i.column_name === indInfo.column_name);
      if (dimInd?.threshold.enabled) {
        indInfo.hasThreshold = true;
        indInfo.thresholdField = dimInd.threshold.field;
      }
      if (dimInd?.grades.some(g => (g.bonus || 0) > 0)) {
        indInfo.hasBonus = true;
      }
    });
  });

  // 生成单行表头
  const headers: string[] = ['姓名', '组别', '类型'];
  allIndicators.forEach(indInfo => {
    if (indInfo.hasThreshold) {
      headers.push(`${getFieldDisplayName(indInfo.thresholdField)}(门槛)`);
    }
    headers.push(`${getFieldDisplayName(indInfo.column_name)}(进阶)`);
    headers.push('等级');
    if (indInfo.hasBonus) {
      headers.push('奖金');
    }
  });

  const rows: string[] = [headers.join('\t')];

  // 生成数据行
  data.forEach(record => {
    const csType = record.客服类型 || '基础';
    let dimension: 'basic' | 'vip' | 'leader' = 'basic';
    if (csType === 'VIP') dimension = 'vip';
    else if (csType === '组长') dimension = 'leader';
    const indicators = config[dimension].indicators;
    const recordIndicatorMap = new Map(indicators.map(ind => [ind.column_name, ind]));

    const cells: string[] = [record.姓名, record.组别, record.客服类型];

    allIndicators.forEach(indInfo => {
      const ind = recordIndicatorMap.get(indInfo.column_name);
      const value = record[indInfo.column_name as keyof KPIRecord] as number;

      // 门槛值
      if (indInfo.hasThreshold) {
        if (ind?.threshold.enabled) {
          const thresholdValue = record[ind.threshold.field as keyof KPIRecord] as number;
          cells.push(thresholdValue !== undefined ? String(thresholdValue) : '-');
        } else {
          cells.push('-');
        }
      }

      // 进阶值
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
      cells.push(displayValue);

      // 等级和奖金
      if (ind) {
        let indicatorGrade = 'D';
        let bonusAmount = 0;

        // 门槛判断
        let thresholdPass = true;
        if (ind.threshold.enabled) {
          const thresholdValue = record[ind.threshold.field as keyof KPIRecord] as number;
          if (thresholdValue !== undefined) {
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

        if (!thresholdPass) {
          indicatorGrade = 'D';
        } else if (value !== undefined) {
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

        cells.push(indicatorGrade);
        if (indInfo.hasBonus) {
          cells.push(bonusAmount > 0 ? `+${bonusAmount}元` : '-');
        }
      } else {
        cells.push('-');
        if (indInfo.hasBonus) {
          cells.push('-');
        }
      }
    });

    rows.push(cells.join('\t'));
  });

  return rows.join('\n');
}

// 计算历史记录概要
export function calculateHistorySummary(data: Record<string, unknown[]>) {
  let totalCount = 0;
  let basicCount = 0;
  let vipCount = 0;
  let leaderCount = 0;
  const gradeDistribution: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };

  for (const members of Object.values(data)) {
    for (const member of members as MemberData[]) {
      totalCount++;

      const memberType = member.type || member.客服类型 || '';
      if (memberType === '基础') basicCount++;
      else if (memberType === 'VIP') vipCount++;
      else if (memberType === '组长') leaderCount++;

      const grade = member.grade || member.等级 || 'D';
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    }
  }

  return {
    total_count: totalCount,
    basic_count: basicCount,
    vip_count: vipCount,
    leader_count: leaderCount,
    grade_distribution: gradeDistribution,
  };
}
