// 全局人员配置类型

export interface StaffConfig {
  id: string;
  name: string;
  group: 'A组' | 'B组';
  type: '基础' | 'VIP' | '组长';
  status: '已转正' | '试用期' | '已离职';
}

// 默认人员列表（按排序规则排列：组别 → 类型(组长>VIP>基础) → 状态）
export const DEFAULT_STAFF: StaffConfig[] = [
  // A组 组长
  { id: '8', name: '裘崇伟', group: 'A组', type: '组长', status: '已转正' },
  // A组 VIP
  { id: '1', name: '张磊', group: 'A组', type: 'VIP', status: '已转正' },
  { id: '2', name: '冯宇杰', group: 'A组', type: 'VIP', status: '已转正' },
  { id: '3', name: '王杨', group: 'A组', type: 'VIP', status: '已转正' },
  // A组 基础
  { id: '4', name: '卢佳祺', group: 'A组', type: '基础', status: '已转正' },
  { id: '5', name: '董凡', group: 'A组', type: '基础', status: '试用期' },
  { id: '6', name: '杨戴丽', group: 'A组', type: '基础', status: '试用期' },
  { id: '7', name: '朱吴俊', group: 'A组', type: '基础', status: '试用期' },
  // B组 组长
  { id: '17', name: '孙泽沁', group: 'B组', type: '组长', status: '已转正' },
  // B组 VIP
  { id: '9', name: '沈建华', group: 'B组', type: 'VIP', status: '已转正' },
  { id: '10', name: '张沈远', group: 'B组', type: 'VIP', status: '已转正' },
  { id: '11', name: '刘若凡', group: 'B组', type: 'VIP', status: '已转正' },
  { id: '12', name: '朱涛', group: 'B组', type: 'VIP', status: '已转正' },
  // B组 基础
  { id: '13', name: '汪立萍', group: 'B组', type: '基础', status: '已转正' },
  { id: '14', name: '李瞳', group: 'B组', type: '基础', status: '已转正' },
  { id: '15', name: '廖嘉乐', group: 'B组', type: '基础', status: '已转正' },
  { id: '16', name: '欧仁强', group: 'B组', type: '基础', status: '试用期' },
  { id: '18', name: '朱欣烨', group: 'B组', type: '基础', status: '试用期' },
];

export const STAFF_VERSION = 2; // 递增此版本号可强制刷新所有用户的本地人员数据
export const STORAGE_KEY_STAFF = 'service_quality_staff';
export const STORAGE_KEY_STAFF_VERSION = 'service_quality_staff_version';
