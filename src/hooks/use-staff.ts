import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { type StaffConfig, DEFAULT_STAFF, STORAGE_KEY_STAFF } from '@/types/staff';

export function useStaffList() {
  const [staffList, setStaffList] = useState<StaffConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_STAFF);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // 旧数据兼容：补全 status 字段
            const migrated = parsed.map((s: any) => ({
              ...s,
              status: s.status ?? '已转正',
            }));

            // 合并策略：默认列表中有但本地没有的人，自动补上（按 name 匹配）
            const existingNames = new Set(migrated.map((s: StaffConfig) => s.name));
            const missing = DEFAULT_STAFF.filter(d => !existingNames.has(d.name));
            if (missing.length > 0) {
              const merged = [...migrated, ...missing];
              localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(merged));
              return merged;
            }

            // 若有缺失 status 字段，静默写回
            if (parsed.some((s: any) => !s.status)) {
              localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(migrated));
            }
            return migrated;
          }
        } catch { /* fallback */ }
      }
    }
    return DEFAULT_STAFF;
  });

  const saveStaffList = useCallback((list: StaffConfig[]) => {
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(list));
    setStaffList(list);
  }, []);

  const addStaff = useCallback((staff: Omit<StaffConfig, 'id'>) => {
    const newStaff: StaffConfig = {
      id: Date.now().toString(),
      ...staff,
    };
    const newList = [...staffList, newStaff];
    saveStaffList(newList);
    toast.success('添加成功');
    return newList;
  }, [staffList, saveStaffList]);

  const updateStaff = useCallback((id: string, updates: Partial<Omit<StaffConfig, 'id'>>) => {
    const newList = staffList.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    saveStaffList(newList);
    toast.success('更新成功');
    return newList;
  }, [staffList, saveStaffList]);

  const deleteStaff = useCallback((id: string) => {
    const newList = staffList.filter(s => s.id !== id);
    saveStaffList(newList);
    toast.success('删除成功');
    return newList;
  }, [staffList, saveStaffList]);

  const getStaffByName = useCallback((name: string): StaffConfig | undefined => {
    return staffList.find(s => s.name === name);
  }, [staffList]);

  const resetToDefault = useCallback(() => {
    saveStaffList(DEFAULT_STAFF);
    toast.success('已恢复默认人员列表');
  }, [saveStaffList]);

  return {
    staffList,
    addStaff,
    updateStaff,
    deleteStaff,
    getStaffByName,
    resetToDefault,
  };
}
