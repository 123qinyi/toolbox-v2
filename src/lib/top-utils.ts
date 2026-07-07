// ============================================================
// TOP数据分析工具 - 核心数据处理逻辑
// 从Python脚本翻译而来
// ============================================================

export interface TopRawRecord {
  会话开始时间: string;
  一级分类: string;
  二级分类: string;
  三级分类: string;
  四级分类: string;
  五级分类: string;
  备注内容: string;
  分流客服组: string;
  项目渠道: string;
  满意度: string;
  情绪分层?: string;
}

export interface TopConvertedRecord {
  分组: string;
  项目渠道: string;
  一级分类: string;
  二级分类: string;
  三级分类: string;
  四级分类: string;
  五级分类: string;
  数量: number;
  满意度: string;
  情绪分层: string;
  备注内容: string;
}

export interface ProblemData {
  project: string;
  desc: string;
  count: number;
  country: string;
  channels: string[];
  category: string;
  satisfaction: { 满意: number; 一般: number; 不满意: number; 未评价: number };
  emotion_l3: { count: number; total: number };
}

export interface CategoryData {
  total: number;
  problems: ProblemData[];
  satisfaction: { 满意: number; 一般: number; 不满意: number; 未评价: number };
  emotion_l3: { count: number; total: number };
}

export type ProcessedData = Record<string, CategoryData>;

export type DisplayMode = 'topN' | 'all' | 'top5Bad';

export interface TopSettings {
  displayMode: DisplayMode;
  topN: number;
  groupFilter: '全部' | '基础' | 'VIP';
  satisfactionFilter: '全部' | '未评价' | '评价' | '满意' | '一般' | '不满意';
  showProjectChannel: boolean;
  showEmotionL3: boolean;
  hideProjectChannel: boolean;
  categoryMergeRules: CategoryMergeRule[];  // 自定义分类合并规则（替代旧的3个硬编码开关）
  includeKeywords: string;
  excludeKeywords: string;
  enableIncludeKeywords: boolean;
  enableExcludeKeywords: boolean;
  categoryOrder: string[];
  customDisplay: CustomDisplayConfig;
}

export interface CustomDisplayConfig {
  selectedIndicators: string[];
  displayPosition: 'none' | 'category' | 'subcategory' | 'both';
  indicatorOrder: string[];
}

// ============================================================
// 自定义分类合并规则
// ============================================================

export type ClassificationLevel = '二级' | '三级' | '四级' | '五级';
export type MatchMode = '精确' | '包含';

export interface CategoryMergeRule {
  id: string;
  name: string;
  matchLevel: ClassificationLevel;   // 在哪一级匹配
  matchValues: string;               // 匹配值，逗号分隔支持多个
  matchMode: MatchMode;              // 精确匹配 or 包含匹配
  targetLevel: ClassificationLevel;  // 统计到哪一级
  enabled: boolean;
}

export const ALL_INDICATORS = [
  '参评率', '参评数', '未评率', '未评数', '满意率', '满意数', '中评率', '中评数', '差评率', '差评数',
];

export const DEFAULT_CATEGORY_ORDER = ['咨询答疑', '问题反馈', '违规举报', '建议与意见'];

// 预设分类合并规则（从旧硬编码逻辑迁移 + 周年庆活动合并）
export const DEFAULT_MERGE_RULES: CategoryMergeRule[] = [
  {
    id: 'preset-item-exchange',
    name: '置换剔五级',
    matchLevel: '四级',
    matchValues: '道具置换',
    matchMode: '包含',
    targetLevel: '四级',
    enabled: true,
  },
  {
    id: 'preset-cheating',
    name: '开挂剔四级',
    matchLevel: '三级',
    matchValues: 'PVP玩法开挂,PVE玩法开挂',
    matchMode: '精确',
    targetLevel: '三级',
    enabled: true,
  },
  {
    id: 'preset-channel-stop',
    name: '停运剔四级',
    matchLevel: '三级',
    matchValues: '渠道停运咨询如何安置',
    matchMode: '精确',
    targetLevel: '三级',
    enabled: true,
  },
  {
    id: 'preset-anniversary-activity',
    name: '周年活动剔五级',
    matchLevel: '四级',
    matchValues: '周年庆活动内容咨询',
    matchMode: '精确',
    targetLevel: '四级',
    enabled: true,
  },
];

export const DEFAULT_SETTINGS: TopSettings = {
  displayMode: 'topN',
  topN: 5,
  groupFilter: '全部',
  satisfactionFilter: '全部',
  showProjectChannel: true,
  showEmotionL3: false,
  hideProjectChannel: false,
  categoryMergeRules: DEFAULT_MERGE_RULES.map(r => ({ ...r })),
  includeKeywords: '',
  excludeKeywords: '',
  enableIncludeKeywords: false,
  enableExcludeKeywords: false,
  categoryOrder: [...DEFAULT_CATEGORY_ORDER],
  customDisplay: {
    selectedIndicators: [],
    displayPosition: 'none',
    indicatorOrder: [...ALL_INDICATORS],
  },
};

// ============================================================
// 1. 数据转换
// ============================================================

export function parseRawInput(input: string): TopRawRecord[] {
  const lines = input.split('\n');
  if (lines.length < 2) return [];

  // 解析表头
  const headers = lines[0].split('\t').map(h => h.trim());
  const expectedColCount = headers.length;

  // 合并因字段值中包含换行符而被错误分割的行
  const mergedLines: string[] = [];
  let currentLine = '';
  for (let i = 1; i < lines.length; i++) {
    if (currentLine) {
      currentLine += '\n' + lines[i];
    } else {
      currentLine = lines[i];
    }
    // 检查当前合并后的行是否有足够的字段
    const tabCount = (currentLine.match(/\t/g) || []).length;
    if (tabCount >= expectedColCount - 1) {
      mergedLines.push(currentLine);
      currentLine = '';
    }
  }
  // 处理最后可能遗留的行
  if (currentLine.trim()) {
    mergedLines.push(currentLine);
  }

  const records: TopRawRecord[] = [];
  for (const line of mergedLines) {
    const values = line.split('\t');
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx]?.trim() || '';
    });

    if (record['一级分类']) {
      records.push({
        会话开始时间: record['会话开始时间'] || '',
        一级分类: record['一级分类'] || '',
        二级分类: record['二级分类'] || '',
        三级分类: record['三级分类'] || '',
        四级分类: record['四级分类'] || '',
        五级分类: record['五级分类'] || '',
        备注内容: record['备注内容'] || '',
        分流客服组: record['分流客服组'] || '',
        项目渠道: record['项目渠道'] || '',
        满意度: record['满意度'] || '未评价',
        情绪分层: record['情绪分层'] || '',
      });
    }
  }

  return records;
}

export function convertData(rawRecords: TopRawRecord[]): TopConvertedRecord[] {
  return rawRecords.map(r => {
    // 添加分组
    const group = String(r.分流客服组).includes('VIP组') ? 'VIP' : '基础';

    // 处理分类替换逻辑
    let 三级分类 = String(r.三级分类);
    let 四级分类 = String(r.四级分类);
    let 五级分类 = String(r.五级分类);
    const 备注内容 = String(r.备注内容);

    if (三级分类.includes('__') && 备注内容 !== '--') 三级分类 = 备注内容;
    if (四级分类.includes('__') && 备注内容 !== '--') 四级分类 = 备注内容;
    if (五级分类.includes('__') && 备注内容 !== '--') 五级分类 = 备注内容;
    if (五级分类 === '--' && 备注内容 !== '--') 五级分类 = 备注内容;

    // 处理情绪分层
    let emotion = String(r.情绪分层 || '').trim().toUpperCase();
    if (!['L1', 'L2', 'L3'].includes(emotion)) emotion = '';

    return {
      分组: group,
      项目渠道: String(r.项目渠道),
      一级分类: String(r.一级分类),
      二级分类: String(r.二级分类),
      三级分类,
      四级分类,
      五级分类,
      数量: 1,
      满意度: String(r.满意度 || '未评价'),
      情绪分层: emotion,
      备注内容,
    };
  });
}

// ============================================================
// 2. 数据处理
// ============================================================

function getLevelValue(row: TopConvertedRecord, level: ClassificationLevel): string {
  switch (level) {
    case '二级': return row.二级分类;
    case '三级': return row.三级分类;
    case '四级': return row.四级分类;
    case '五级': return row.五级分类;
  }
}

function isInvalidLevelValue(val: string): boolean {
  return !val || val === '--' || val === 'nan' || val === '';
}

function getProblemDescription(
  row: TopConvertedRecord,
  settings: TopSettings,
): string {
  const level2 = row.二级分类;
  const level3 = row.三级分类;
  const level4 = row.四级分类;
  const level5 = row.五级分类;

  // 遍历自定义合并规则（按顺序匹配，第一条命中即生效）
  const rules = settings.categoryMergeRules;
  if (rules && rules.length > 0) {
    for (const rule of rules) {
      if (!rule.enabled) continue;

      const matchValue = getLevelValue(row, rule.matchLevel);
      if (isInvalidLevelValue(matchValue)) continue;

      const values = rule.matchValues.split(/[,，]/).map(v => v.trim()).filter(v => v);
      if (values.length === 0) continue;

      let matched: boolean;
      if (rule.matchMode === '精确') {
        matched = values.includes(matchValue);
      } else {
        matched = values.some(v => matchValue.includes(v));
      }

      if (matched) {
        const targetValue = getLevelValue(row, rule.targetLevel);
        if (!isInvalidLevelValue(targetValue)) {
          return targetValue;
        }
        // 目标级别为空则跳出，走默认逻辑
        break;
      }
    }
  }

  // 默认优先级：五级→四级→三级→二级
  if (!isInvalidLevelValue(level5)) return level5;
  if (!isInvalidLevelValue(level4)) return level4;
  if (!isInvalidLevelValue(level3)) return level3;
  if (!isInvalidLevelValue(level2)) return level2;

  return '其他问题';
}

function parseKeywords(keywordsStr: string): string[] {
  if (!keywordsStr || !keywordsStr.trim()) return [];
  return keywordsStr
    .split(/[,，\s]+/)
    .map(k => k.trim())
    .filter(k => k);
}

function checkKeywordsFilter(row: TopConvertedRecord, settings: TopSettings): boolean {
  const includeKeywords = parseKeywords(settings.includeKeywords);
  const excludeKeywords = parseKeywords(settings.excludeKeywords);

  const content = [row.一级分类, row.二级分类, row.三级分类, row.四级分类, row.五级分类].join(' ');

  // 包含关键词检查
  if (settings.enableIncludeKeywords && includeKeywords.length > 0) {
    const hasInclude = includeKeywords.some(k => content.includes(k));
    if (!hasInclude) return false;
  }

  // 排除关键词检查
  if (settings.enableExcludeKeywords && excludeKeywords.length > 0) {
    for (const keyword of excludeKeywords) {
      if (content.includes(keyword)) return false;
    }
  }

  return true;
}

export function processData(
  convertedRecords: TopConvertedRecord[],
  settings: TopSettings,
): ProcessedData | null {
  if (!convertedRecords || convertedRecords.length === 0) return null;

  let df = [...convertedRecords];

  // 分组筛选
  if (settings.groupFilter === '基础') df = df.filter(r => r.分组 === '基础');
  else if (settings.groupFilter === 'VIP') df = df.filter(r => r.分组 === 'VIP');

  // 满意度筛选
  if (settings.satisfactionFilter === '未评价') df = df.filter(r => r.满意度 === '未评价');
  else if (settings.satisfactionFilter === '满意') df = df.filter(r => r.满意度 === '满意');
  else if (settings.satisfactionFilter === '一般') df = df.filter(r => r.满意度 === '一般');
  else if (settings.satisfactionFilter === '不满意') df = df.filter(r => r.满意度 === '不满意');
  else if (settings.satisfactionFilter === '评价') df = df.filter(r => ['满意', '一般', '不满意'].includes(r.满意度));

  // 关键词筛选
  df = df.filter(r => checkKeywordsFilter(r, settings));

  if (df.length === 0) return null;

  // 合并数据：分类 → 问题描述 → 国家 → 数量
  const mergedData: Record<string, Record<string, Record<string, number>>> = {};

  for (const row of df) {
    const category = row.一级分类;
    if (!category || category === '' || category === 'nan' || category === '--') continue;

    const problemDesc = getProblemDescription(row, settings);
    const count = row.数量;
    const projectChannel = row.项目渠道;
    const country = projectChannel.includes('/') ? projectChannel.split('/')[0] : projectChannel;

    if (!mergedData[category]) mergedData[category] = {};
    if (!mergedData[category][problemDesc]) mergedData[category][problemDesc] = {};
    mergedData[category][problemDesc][country] = (mergedData[category][problemDesc][country] || 0) + count;
  }

  // 构建结果
  const result: ProcessedData = {};

  for (const [category, problems] of Object.entries(mergedData)) {
    let totalCount = 0;
    const problemList: ProblemData[] = [];

    for (const [problemDesc, countries] of Object.entries(problems)) {
      for (const [country, countVal] of Object.entries(countries)) {
        totalCount += countVal;

        // 收集渠道
        const channels: string[] = [];
        for (const row of df) {
          if (
            row.一级分类 === category &&
            getProblemDescription(row, settings) === problemDesc &&
            row.项目渠道.startsWith(country)
          ) {
            channels.push(row.项目渠道);
          }
        }
        const uniqueChannels = [...new Set(channels)].sort();

        // 优化渠道显示
        const optimizedChannels = uniqueChannels.map(ch => {
          if (ch.startsWith(country + '/')) return ch.slice(country.length + 1);
          return ch;
        });

        const countryChannels = country + '/' + optimizedChannels.join('/');

        problemList.push({
          project: countryChannels,
          desc: problemDesc,
          count: countVal,
          country,
          channels: uniqueChannels,
          category,
          satisfaction: { 满意: 0, 一般: 0, 不满意: 0, 未评价: 0 },
          emotion_l3: { count: 0, total: 0 },
        });
      }
    }

    // 按数量降序排序
    problemList.sort((a, b) => b.count - a.count);

    result[category] = {
      total: totalCount,
      problems: problemList,
      satisfaction: { 满意: 0, 一般: 0, 不满意: 0, 未评价: 0 },
      emotion_l3: { count: 0, total: 0 },
    };
  }

  return result;
}

// ============================================================
// 3. 满意度计算
// ============================================================

export function calculateSatisfaction(
  processedData: ProcessedData | null,
  convertedRecords: TopConvertedRecord[],
  settings: TopSettings,
): ProcessedData | null {
  if (!processedData || !convertedRecords || convertedRecords.length === 0) return null;

  let df = [...convertedRecords];

  // 分组筛选
  if (settings.groupFilter === '基础') df = df.filter(r => r.分组 === '基础');
  else if (settings.groupFilter === 'VIP') df = df.filter(r => r.分组 === 'VIP');

  // 满意度筛选
  if (settings.satisfactionFilter === '未评价') df = df.filter(r => r.满意度 === '未评价');
  else if (settings.satisfactionFilter === '满意') df = df.filter(r => r.满意度 === '满意');
  else if (settings.satisfactionFilter === '一般') df = df.filter(r => r.满意度 === '一般');
  else if (settings.satisfactionFilter === '不满意') df = df.filter(r => r.满意度 === '不满意');
  else if (settings.satisfactionFilter === '评价') df = df.filter(r => ['满意', '一般', '不满意'].includes(r.满意度));

  // 关键词筛选
  df = df.filter(r => checkKeywordsFilter(r, settings));

  if (df.length === 0) return processedData;

  const result: ProcessedData = JSON.parse(JSON.stringify(processedData));

  // 初始化
  for (const data of Object.values(result)) {
    data.satisfaction = { 满意: 0, 一般: 0, 不满意: 0, 未评价: 0 };
    data.emotion_l3 = { count: 0, total: 0 };
    for (const problem of data.problems) {
      problem.satisfaction = { 满意: 0, 一般: 0, 不满意: 0, 未评价: 0 };
      problem.emotion_l3 = { count: 0, total: 0 };
    }
  }

  // 第一遍：统计一级分类满意度
  for (const row of df) {
    const category = row.一级分类;
    if (!category || category === '' || category === 'nan' || category === '--') continue;

    const satisfaction = row.满意度 || '未评价';
    if (result[category] && ['满意', '一般', '不满意', '未评价'].includes(satisfaction)) {
      result[category].satisfaction[satisfaction as keyof typeof result[string]['satisfaction']] += row.数量;
      result[category].emotion_l3.total += row.数量;
      if (row.情绪分层 === 'L3') result[category].emotion_l3.count += row.数量;
    }
  }

  // 第二遍：统计子分类满意度
  for (const row of df) {
    const category = row.一级分类;
    if (!category || category === '' || category === 'nan' || category === '--') continue;
    if (!result[category]) continue;

    const satisfaction = row.满意度 || '未评价';
    const problemDesc = getProblemDescription(row, settings);
    const projectChannel = row.项目渠道;

    for (const problem of result[category].problems) {
      if (
        problem.channels.includes(projectChannel) &&
        problem.desc === problemDesc
      ) {
        if (['满意', '一般', '不满意', '未评价'].includes(satisfaction)) {
          problem.satisfaction[satisfaction as keyof typeof problem.satisfaction] += row.数量;
          problem.emotion_l3.total += row.数量;
          if (row.情绪分层 === 'L3') problem.emotion_l3.count += row.数量;
        }
        break;
      }
    }
  }

  return result;
}

// ============================================================
// 4. 构建输出文本
// ============================================================

function getCategoryCountLabel(category: string): string {
  const labels: Record<string, string> = {
    咨询答疑: '咨询人数',
    问题反馈: '反馈人数',
    建议与意见: '建议人数',
    违规举报: '举报人数',
  };
  return labels[category] || '反馈人数';
}

function getCategoryOrder(category: string, order: string[]): number {
  const idx = order.indexOf(category);
  return idx >= 0 ? idx : 999;
}

function getProblemsToShow(data: CategoryData, settings: TopSettings): ProblemData[] {
  const problems = data.problems;
  if (settings.displayMode === 'topN') {
    return problems.slice(0, settings.topN);
  } else if (settings.displayMode === 'all') {
    return problems;
  } else {
    // top5Bad
    const top5 = problems.slice(0, 5);
    const remaining = problems.slice(5);
    const badRemaining = remaining.filter(p => p.satisfaction.不满意 > 0);
    return [...top5, ...badRemaining];
  }
}

function buildCategoryLine(category: string, data: CategoryData, settings: TopSettings): string {
  const total = data.total;
  const sat = data.satisfaction.满意;
  const gen = data.satisfaction.一般;
  const unsat = data.satisfaction.不满意;
  const uneval = data.satisfaction.未评价;

  const satRate = total > 0 ? (sat / total) * 100 : 0;
  const genRate = total > 0 ? (gen / total) * 100 : 0;
  const unsatRate = total > 0 ? (unsat / total) * 100 : 0;
  const unevalRate = total > 0 ? (uneval / total) * 100 : 0;
  const evaluationCount = sat + gen + unsat;
  const evaluationRate = total > 0 ? (evaluationCount / total) * 100 : 0;

  const countLabel = getCategoryCountLabel(category);

  // L3情绪信息
  let l3Info = '';
  if (settings.showEmotionL3 && data.emotion_l3.total > 0) {
    const l3Rate = (data.emotion_l3.count / data.emotion_l3.total) * 100;
    l3Info = `[L3：${data.emotion_l3.count}，占比${l3Rate.toFixed(1)}%]`;
  }

  let line = `【${category}】-${countLabel}:${total}`;
  if (l3Info) line += ` ${l3Info}`;

  // 添加自定义指标
  const { selectedIndicators, displayPosition } = settings.customDisplay;
  const showOnCategory = displayPosition === 'category' || displayPosition === 'both';

  if (showOnCategory && selectedIndicators.length > 0) {
    const parts: string[] = [];
    for (const ind of selectedIndicators) {
      if (ind === '参评率') parts.push(`参评率：${evaluationRate.toFixed(1)}%`);
      else if (ind === '参评数') parts.push(`参评数：${evaluationCount}`);
      else if (ind === '未评率') parts.push(`未评率：${unevalRate.toFixed(1)}%`);
      else if (ind === '未评数') parts.push(`未评数：${uneval}`);
      else if (ind === '满意率') parts.push(`满意率：${satRate.toFixed(1)}%`);
      else if (ind === '满意数') parts.push(`满意数：${sat}`);
      else if (ind === '中评率') parts.push(`中评率：${genRate.toFixed(1)}%`);
      else if (ind === '中评数') parts.push(`中评数：${gen}`);
      else if (ind === '差评率') parts.push(`差评率：${unsatRate.toFixed(1)}%`);
      else if (ind === '差评数') parts.push(`差评数：${unsat}`);
    }
    if (parts.length > 0) line += '，' + parts.join('，');
  }

  return line;
}

function buildProblemLine(problem: ProblemData, settings: TopSettings): string {
  const pTotal = problem.count;
  const pSat = problem.satisfaction.满意;
  const pGen = problem.satisfaction.一般;
  const pUnsat = problem.satisfaction.不满意;
  const pUneval = problem.satisfaction.未评价;

  const pEvalCount = pSat + pGen + pUnsat;
  const pEvalRate = pTotal > 0 ? (pEvalCount / pTotal) * 100 : 0;
  const pSatRate = pTotal > 0 ? (pSat / pTotal) * 100 : 0;

  const subCountLabel = getCategoryCountLabel(problem.category);

  // L3情绪信息
  let l3Info = '';
  if (settings.showEmotionL3 && problem.emotion_l3.total > 0) {
    const l3Rate = (problem.emotion_l3.count / problem.emotion_l3.total) * 100;
    l3Info = `[L3：${problem.emotion_l3.count}，占比${l3Rate.toFixed(1)}%]`;
  }

  let line: string;
  if (settings.hideProjectChannel) {
    // 项目渠道隐藏：不显示项目和渠道
    line = `${problem.desc}-${subCountLabel}:${pTotal}`;
  } else if (settings.showProjectChannel) {
    line = `${problem.project}-${problem.desc}-${subCountLabel}:${pTotal}`;
  } else {
    line = `${problem.desc}-${subCountLabel}:${pTotal}`;
  }

  if (l3Info) line += ` ${l3Info}`;

  // 添加自定义指标
  const { selectedIndicators, displayPosition } = settings.customDisplay;
  const showOnSubcategory = displayPosition === 'subcategory' || displayPosition === 'both';

  if (showOnSubcategory && selectedIndicators.length > 0) {
    const parts: string[] = [];
    for (const ind of selectedIndicators) {
      if (ind === '参评率') parts.push(`参评率：${pEvalRate.toFixed(1)}%`);
      else if (ind === '参评数') parts.push(`参评数：${pEvalCount}`);
      else if (ind === '未评率') parts.push(`未评率：${(pTotal > 0 ? (pUneval / pTotal) * 100 : 0).toFixed(1)}%`);
      else if (ind === '未评数') parts.push(`未评数：${pUneval}`);
      else if (ind === '满意率') parts.push(`满意率：${pSatRate.toFixed(1)}%`);
      else if (ind === '满意数') parts.push(`满意数：${pSat}`);
      else if (ind === '中评率') parts.push(`中评率：${(pTotal > 0 ? (pGen / pTotal) * 100 : 0).toFixed(1)}%`);
      else if (ind === '中评数') parts.push(`中评数：${pGen}`);
      else if (ind === '差评率') parts.push(`差评率：${(pTotal > 0 ? (pUnsat / pTotal) * 100 : 0).toFixed(1)}%`);
      else if (ind === '差评数') parts.push(`差评数：${pUnsat}`);
    }
    if (parts.length > 0) line += '，' + parts.join('，');
  }

  return line;
}

export function buildSatisfactionOutput(
  processedData: ProcessedData,
  settings: TopSettings,
): string {
  const lines: string[] = [];

  // 分析模式信息
  let modeText: string;
  if (settings.displayMode === 'topN') modeText = `TOP${settings.topN}`;
  else if (settings.displayMode === 'all') modeText = '全量';
  else modeText = 'TOP5+差评';

  const satText = settings.satisfactionFilter !== '全部' ? ` | 满意度:${settings.satisfactionFilter}` : '';
  lines.push(`【分析模式】${modeText} | ${settings.groupFilter}${satText}`);

  // 特殊处理设置
  const specialSettings: string[] = [];
  if (settings.categoryMergeRules) {
    for (const rule of settings.categoryMergeRules) {
      if (rule.enabled) {
        specialSettings.push(rule.name);
      }
    }
  }
  if (settings.showEmotionL3) specialSettings.push('显示L3情绪占比');
  if (settings.enableIncludeKeywords || settings.enableExcludeKeywords) {
    if (settings.enableIncludeKeywords && settings.includeKeywords)
      specialSettings.push(`包含:${settings.includeKeywords}`);
    if (settings.enableExcludeKeywords && settings.excludeKeywords)
      specialSettings.push(`剔除:${settings.excludeKeywords}`);
  }
  if (specialSettings.length > 0) {
    lines.push('【特殊处理】' + specialSettings.join(' | '));
  }
  lines.push('');

  // 按分类顺序排序
  const sortedCategories = Object.entries(processedData).sort((a, b) => {
    const orderA = getCategoryOrder(a[0], settings.categoryOrder);
    const orderB = getCategoryOrder(b[0], settings.categoryOrder);
    return orderA - orderB;
  });

  for (const [category, data] of sortedCategories) {
    const categoryLine = buildCategoryLine(category, data, settings);
    if (categoryLine) lines.push(categoryLine);

    const problemsToShow = getProblemsToShow(data, settings);
    for (const problem of problemsToShow) {
      const problemLine = buildProblemLine(problem, settings);
      if (problemLine) lines.push(problemLine);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================
// 5. 情绪分层计算
// ============================================================

export interface EmotionStats {
  rows: [string, number, number, number, number][]; // [标签, 满意, 一般, 不满意, 未评价]
}

export function calculateEmotionDistribution(
  convertedRecords: TopConvertedRecord[],
  groupFilter: string,
  emotionLevel: string,
  satisfactionFilter: string = '全部',
): EmotionStats | null {
  if (!convertedRecords || convertedRecords.length === 0) return null;

  let df = [...convertedRecords];

  // 分组筛选
  if (groupFilter === '基础') df = df.filter(r => r.分组 === '基础');
  else if (groupFilter === 'VIP') df = df.filter(r => r.分组 === 'VIP');

  // 满意度筛选
  if (satisfactionFilter === '未评价') df = df.filter(r => r.满意度 === '未评价');
  else if (satisfactionFilter === '满意') df = df.filter(r => r.满意度 === '满意');
  else if (satisfactionFilter === '一般') df = df.filter(r => r.满意度 === '一般');
  else if (satisfactionFilter === '不满意') df = df.filter(r => r.满意度 === '不满意');
  else if (satisfactionFilter === '评价') df = df.filter(r => ['满意', '一般', '不满意'].includes(r.满意度));
  else if (groupFilter === '综合') {
    // 综合 = 全部
  }

  if (df.length === 0) return null;

  const satisfactions = ['满意', '一般', '不满意', '未评价'];

  // 总数量行
  const totalRow: [string, number, number, number, number] = [`${groupFilter}总数量`, 0, 0, 0, 0];
  for (let i = 0; i < satisfactions.length; i++) {
    totalRow[i + 1] = df.filter(r => r.满意度 === satisfactions[i]).length;
  }

  // 当前情绪等级数量行
  const emotionRow: [string, number, number, number, number] = [`${emotionLevel}数量`, 0, 0, 0, 0];
  for (let i = 0; i < satisfactions.length; i++) {
    const satDf = df.filter(r => r.满意度 === satisfactions[i]);
    emotionRow[i + 1] = satDf.filter(r => r.情绪分层 === emotionLevel).length;
  }

  // 情绪等级占比行
  const rateRow: [string, number, number, number, number] = [`${emotionLevel}占比`, 0, 0, 0, 0];
  for (let i = 0; i < satisfactions.length; i++) {
    const satDf = df.filter(r => r.满意度 === satisfactions[i]);
    const totalCount = satDf.length;
    const emotionCount = satDf.filter(r => r.情绪分层 === emotionLevel).length;
    rateRow[i + 1] = totalCount > 0 ? parseFloat(((emotionCount / totalCount) * 100).toFixed(2)) : 0;
  }

  return { rows: [totalRow, emotionRow, rateRow] };
}

// ============================================================
// 6. 复制为表格
// ============================================================

// ============================================================
// 7. L3情绪分层固定表格输出（不受筛选器影响）
// ============================================================

export function buildEmotionL3Table(
  convertedRecords: TopConvertedRecord[],
): string {
  if (!convertedRecords || convertedRecords.length === 0) return '';

  const groups = ['综合', 'VIP', '基础'];
  const lines: string[] = [];

  // 表头
  lines.push('情绪等级占比\t满意\t中评\t差评\t未评价');

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    // 组之间加空行
    if (gi > 0) lines.push('');

    // 筛选数据
    let df = [...convertedRecords];
    if (group === '基础') df = df.filter(r => r.分组 === '基础');
    else if (group === 'VIP') df = df.filter(r => r.分组 === 'VIP');
    // 综合 = 全部，不筛选

    const satisfactions = ['满意', '一般', '不满意', '未评价'];

    // 总数量行
    const totalRow: number[] = [];
    for (const sat of satisfactions) {
      totalRow.push(df.filter(r => r.满意度 === sat).length);
    }

    // L3数量行
    const l3Row: number[] = [];
    for (const sat of satisfactions) {
      l3Row.push(df.filter(r => r.满意度 === sat && r.情绪分层 === 'L3').length);
    }

    // L3占比行（百分比数值，如 3.25 表示 3.25%）
    const rateRow: number[] = [];
    for (let i = 0; i < satisfactions.length; i++) {
      const totalCount = totalRow[i];
      const l3Count = l3Row[i];
      rateRow.push(totalCount > 0 ? parseFloat(((l3Count / totalCount) * 100).toFixed(2)) : 0);
    }

    // 输出该组的3行
    lines.push(`${group}总数量\t${totalRow.join('\t')}`);
    lines.push(`L3数量\t${l3Row.join('\t')}`);
    lines.push(`L3占比\t${rateRow.map(v => v.toFixed(2) + '%').join('\t')}`);
  }

  return lines.join('\n');
}

export function buildTableOutput(
  processedData: ProcessedData,
  settings: TopSettings,
): string {
  const lines: string[] = [];
  const categoryOrder = settings.categoryOrder;

  // 表头行（纯文本，无【】，可直接粘贴到Excel/表格）
  lines.push('一级分类\t项目\t渠道\t问题描述\t咨询人数\t参评率\t满意率\t差评数');

  for (const category of categoryOrder) {
    if (!(category in processedData)) continue;
    const data = processedData[category];
    const total = data.total;
    const sat = data.satisfaction.满意;
    const gen = data.satisfaction.一般;
    const unsat = data.satisfaction.不满意;
    const evaluationCount = sat + gen + unsat;
    const evaluationRate = total > 0 ? (evaluationCount / total) * 100 : 0;
    const satRate = total > 0 ? (sat / total) * 100 : 0;

    // 分类标题行：一级分类=分类名 项目=- 渠道=- 问题描述=-
    lines.push(`${category}\t-\t-\t-\t${total}\t${evaluationRate.toFixed(2)}%\t${satRate.toFixed(2)}%\t${unsat}`);

    // 子分类行（受显示模式控制，与结果分析一致）
    const problemsToShow = getProblemsToShow(data, settings);
    for (let idx = 0; idx < problemsToShow.length; idx++) {
      const problem = problemsToShow[idx];
      // project 格式如 "国1/安卓全渠道/安卓联运/官方平台" 或 "国2/安卓全渠道/官方平台"
      const firstSlashIdx = problem.project.indexOf('/');
      const project = firstSlashIdx >= 0 ? problem.project.substring(0, firstSlashIdx) : problem.project;
      const channel = firstSlashIdx >= 0 ? problem.project.substring(firstSlashIdx + 1) : '';
      
      const pSat = problem.satisfaction.满意;
      const pGen = problem.satisfaction.一般;
      const pUnsat = problem.satisfaction.不满意;
      const pEvalCount = pSat + pGen + pUnsat;
      const pEvalRate = problem.count > 0 ? (pEvalCount / problem.count) * 100 : 0;
      const pSatRate = problem.count > 0 ? (pSat / problem.count) * 100 : 0;

      // 一级分类用序号 1,2,3...
      lines.push(
        `${idx + 1}\t${project}\t${channel}\t${problem.desc}\t${problem.count}\t${pEvalRate.toFixed(2)}%\t${pSatRate.toFixed(2)}%\t${pUnsat}`,
      );
    }
  }

  return lines.join('\n');
}
