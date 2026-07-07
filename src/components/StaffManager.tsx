import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Users, UserCheck, Clock, Star, Layers, Copy, Crown, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStaffContext } from '@/contexts/StaffContext';
import type { StaffConfig } from '@/types/staff';

interface StaffManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ========== 统计数据类型 ==========
interface StaffStats {
  total: number;
  aCount: number;
  bCount: number;
  vipCount: number;
  basicCount: number;
  leaderCount: number;
  regularCount: number;
  trialCount: number;
  resignedCount: number;
  avip: number;    // A组VIP
  abasic: number;  // A组基础
  aleader: number; // A组组长
  bvip: number;    // B组VIP
  bbasic: number;  // B组基础
  bleader: number; // B组组长
}

export function StaffManager({ open, onOpenChange }: StaffManagerProps) {
  const { staffList, addStaff, updateStaff, deleteStaff, resetToDefault } = useStaffContext();
  const [editingStaff, setEditingStaff] = useState<StaffConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    group: 'A组' as 'A组' | 'B组',
    type: '基础' as '基础' | 'VIP' | '组长',
    status: '已转正' as '已转正' | '试用期' | '已离职',
  });

  // 统计总览
  const stats = useMemo((): StaffStats => {
    let a = 0, b = 0, vip = 0, basic = 0, leader = 0, reg = 0, trial = 0, resigned = 0;
    let avip = 0, abasic = 0, aleader = 0, bvip = 0, bbasic = 0, bleader = 0;
    staffList.forEach(s => {
      if (s.status === '已离职') {
        resigned++;
        return;
      }
      if (s.group === 'A组') {
        a++;
        if (s.type === 'VIP') avip++;
        else if (s.type === '组长') aleader++;
        else abasic++;
      } else {
        b++;
        if (s.type === 'VIP') bvip++;
        else if (s.type === '组长') bleader++;
        else bbasic++;
      }
      if (s.type === 'VIP') vip++;
      else if (s.type === '组长') leader++;
      else basic++;
      if (s.status === '已转正') reg++;
      else if (s.status === '试用期') trial++;
    });
    return { total: a + b, aCount: a, bCount: b, vipCount: vip, basicCount: basic, leaderCount: leader, regularCount: reg, trialCount: trial, resignedCount: resigned, avip, abasic, aleader, bvip, bbasic, bleader };
  }, [staffList]);

  const handleAdd = useCallback(() => {
    setEditingStaff(null);
    setStaffForm({ name: '', group: 'A组', type: '基础', status: '已转正' });
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((staff: StaffConfig) => {
    setEditingStaff(staff);
    setStaffForm({ name: staff.name, group: staff.group, type: staff.type, status: staff.status });
    setIsFormOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!staffForm.name.trim()) return;
    if (editingStaff) {
      updateStaff(editingStaff.id, staffForm);
    } else {
      addStaff(staffForm);
    }
    setIsFormOpen(false);
  }, [editingStaff, staffForm, addStaff, updateStaff]);

  const handleDelete = useCallback((id: string) => {
    deleteStaff(id);
  }, [deleteStaff]);

  // 排序后的人员列表
  const sortedStaffList = useMemo(() => {
    const groupOrder: Record<string, number> = { 'A组': 0, 'B组': 1 };
    const typeOrder: Record<string, number> = { '组长': 0, 'VIP': 1, '基础': 2 };
    const statusOrder: Record<string, number> = { '已转正': 0, '试用期': 1, '已离职': 2 };
    return [...staffList].sort((a, b) => {
      if (a.group !== b.group) return groupOrder[a.group] - groupOrder[b.group];
      if (a.type !== b.type) return typeOrder[a.type] - typeOrder[b.type];
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [staffList]);

  // 复制人员列表到剪贴板（使用排序后的列表）
  const handleCopy = useCallback(() => {
    const header = '姓名,组别,类型,状态';
    const rows = sortedStaffList.map(s => `${s.name},${s.group},${s.type},${s.status}`);
    const text = [header, ...rows].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`已复制 ${sortedStaffList.length} 条人员信息`);
    }).catch(() => {
      toast.error('复制失败，请手动复制');
    });
  }, [sortedStaffList]);

  // ========== 组别Badge样式 ==========
  const GroupBadge = ({ group }: { group: string }) =>
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
      group === 'A组'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    }`}>{group}</span>;

  // ========== 类型Badge样式 ==========
  const TypeBadge = ({ type }: { type: string }) =>
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
      type === '组长'
        ? 'bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700'
        : type === 'VIP'
        ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
    }`}>{type}</span>;

  // ========== 状态Badge样式 ==========
  const StatusBadge = ({ status }: { status: string }) => {
    if (status === '已转正')
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium gap-1 bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-950/60 dark:text-teal-300"><UserCheck className="w-3 h-3" />已转正</span>;
    if (status === '已离职')
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium gap-1 bg-slate-100 text-slate-500 border border-dashed border-slate-400 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600"><Ban className="w-3 h-3" />已离职</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium gap-1 bg-amber-50 text-amber-600 border border-dashed border-amber-400 dark:bg-amber-950/40 dark:text-amber-400"><Clock className="w-3 h-3" />试用期</span>;
  };

  return (
    <>
      {/* 人员管理主弹窗 */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[960px] max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              客服人员管理
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            {/* 操作栏 */}
            <div className="flex justify-between items-center shrink-0">
              <p className="text-sm text-muted-foreground">管理人员基础信息，用于关联报表数据</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}><Copy className="w-4 h-4 mr-1" />复制</Button>
                <Button variant="outline" size="sm" onClick={resetToDefault}>恢复默认</Button>
                <Button size="sm" onClick={handleAdd}><Plus className="w-4 h-4 mr-1" />添加人员</Button>
              </div>
            </div>

            {/* 总览统计面板 */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="shrink-0"
            >
              {/* 核心指标行 */}
              <div className="grid grid-cols-6 gap-2 mb-2">
                {[
                  { label: '总人数', value: stats.total, icon: Users, color: 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/60' },
                  { label: '已转正', value: stats.regularCount, icon: UserCheck, color: 'text-teal-600 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/60' },
                  { label: '试用期', value: stats.trialCount, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60' },
                  { label: '组长', value: stats.leaderCount, icon: Crown, color: 'text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-950/60' },
                  { label: 'VIP', value: stats.vipCount, icon: Star, color: 'text-amber-500 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60' },
                  { label: '基础', value: stats.basicCount, icon: Layers, color: 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800' },
                ].map(item => (
                  <div key={item.label} className={`rounded-lg p-2.5 flex items-center gap-2.5 ${item.color}`}>
                    <item.icon className="w-4 h-4 shrink-0 opacity-70" />
                    <div>
                      <div className="text-lg font-bold leading-tight tabular-nums">{item.value}</div>
                      <div className="text-[11px] opacity-75">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 组别×类型交叉统计（紧凑矩阵） */}
              <table className="w-full rounded-lg bg-muted/30 text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">组别</th>
                    <th className="px-2 py-1.5 text-center font-semibold"><span className="inline-flex items-center justify-center gap-1"><Crown className="w-3 h-3 text-purple-500" />组长</span></th>
                    <th className="px-2 py-1.5 text-center font-semibold"><span className="inline-flex items-center justify-center gap-1"><Star className="w-3 h-3 text-amber-500" />VIP</span></th>
                    <th className="px-2 py-1.5 text-center font-semibold"><span className="inline-flex items-center justify-center gap-1"><Layers className="w-3 h-3 text-slate-400" />基础</span></th>
                    <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">小计</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { label: 'A组', color: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', leader: stats.aleader, vip: stats.avip, basic: stats.abasic, sub: stats.aCount },
                    { label: 'B组', color: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', leader: stats.bleader, vip: stats.bvip, basic: stats.bbasic, sub: stats.bCount },
                  ] as const).map(row => (
                    <tr key={row.label} className="border-b border-muted-foreground/10 last:border-0">
                      <td className={`px-3 py-2 font-semibold ${row.color} whitespace-nowrap`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${row.dot} mr-1.5 align-middle`} />
                        {row.label}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-purple-600 dark:text-purple-400 tabular-nums">{row.leader}</td>
                      <td className={`px-2 py-2 text-center font-bold ${row.color} tabular-nums`}>{row.vip}</td>
                      <td className={`px-2 py-2 text-center ${row.color.replace('700', '500')} tabular-nums opacity-80`}>{row.basic}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{row.sub}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            {/* 人员列表表格 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border overflow-hidden flex-1 min-h-0 flex flex-col"
            >
              <div className="overflow-y-auto flex-1 min-h-0">
                <table className="w-full">
                  <thead className="bg-card sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-sm font-medium w-[72px]">姓名</th>
                      <th className="px-4 py-2.5 text-center text-sm font-medium w-[56px]">组别</th>
                      <th className="px-4 py-2.5 text-center text-sm font-medium w-[64px]">类型</th>
                      <th className="px-4 py-2.5 text-center text-sm font-medium w-[76px]">状态</th>
                      <th className="px-4 py-2.5 text-center text-sm font-medium w-[80px]">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sortedStaffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-semibold">{staff.name}</td>
                        <td className="px-4 py-2.5 text-center"><GroupBadge group={staff.group} /></td>
                        <td className="px-4 py-2.5 text-center"><TypeBadge type={staff.type} /></td>
                        <td className="px-4 py-2.5 text-center"><StatusBadge status={staff.status} /></td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(staff)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(staff.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {staffList.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无人员数据</p>
                  <p className="text-sm mt-1">点击"添加人员"开始录入</p>
                </div>
              )}
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 人员编辑对话框 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStaff ? '编辑人员' : '添加人员'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">姓名</label>
              <Input
                value={staffForm.name}
                onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入姓名"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">组别</label>
                <Select
                  value={staffForm.group}
                  onValueChange={(v) => setStaffForm(prev => ({ ...prev, group: v as 'A组' | 'B组' }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A组">A组</SelectItem>
                    <SelectItem value="B组">B组</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">类型</label>
                <Select
                  value={staffForm.type}
                  onValueChange={(v) => setStaffForm(prev => ({ ...prev, type: v as '基础' | 'VIP' | '组长' }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="基础">基础</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="组长">组长</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">状态</label>
                <Select
                  value={staffForm.status}
                  onValueChange={(v) => setStaffForm(prev => ({ ...prev, status: v as '已转正' | '试用期' | '已离职' }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="已转正">已转正</SelectItem>
                    <SelectItem value="试用期">试用期</SelectItem>
                    <SelectItem value="已离职">已离职</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editingStaff ? '更新' : '添加'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
