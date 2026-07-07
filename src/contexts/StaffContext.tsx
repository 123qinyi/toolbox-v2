import { createContext, useContext, type ReactNode } from 'react';
import { useStaffList } from '@/hooks/use-staff';

// StaffContext 类型：useStaffList 的返回值
type StaffContextValue = ReturnType<typeof useStaffList>;

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
  const staffValue = useStaffList();
  return (
    <StaffContext.Provider value={staffValue}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaffContext(): StaffContextValue {
  const ctx = useContext(StaffContext);
  if (!ctx) {
    throw new Error('useStaffContext must be used within StaffProvider');
  }
  return ctx;
}
