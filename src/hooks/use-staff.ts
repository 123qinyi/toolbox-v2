import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { type StaffConfig, DEFAULT_STAFF, STORAGE_KEY_STAFF, STAFF_VERSION, STORAGE_KEY_STAFF_VERSION } from '@/types/staff';

export function useStaffList() {
  const [staffList, setStaffList] = useState<StaffConfig[]>(() => {
    if (typeof window !== 'undefined') {
      // 版本号检查：版本不匹配时强制用最新默认数据覆盖
      const savedVersion = localStorage.getItem(STORAGE_KEY_STAFF_VERSION);
      const currentVersion = String(STAFF_VERSION);
      if (savedVersion !== currentVersion) {
        localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(DEFAULT_STAFF));
        localStorage.setItem(STORAGE_KEY_STAFF_VERSION, currentVersion);
        return DEFAULT_STAFF;
      }

      const saved = localStorage.getItem(STORAGE_KEY_STAFF);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // 旧数据兼容：补全 status 字段
          if (Array.isArray(parsed)) {
            const migrated = parsed.map((s: any) => ({
              ...s,
              status: s.status ?? '已转正',
            }));
            // 若有缺失字段，静默写回 localStorage
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
    localStorage.setItem(STORAGE_KEY_STAFF_VERSION, String(STAFF_VERSION));
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
