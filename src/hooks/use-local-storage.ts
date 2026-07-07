import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // 获取初始值
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // 设置值到localStorage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // 触发自定义事件，用于跨标签页同步
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // 监听其他标签页的变化
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        setStoredValue(readValue());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, readValue]);

  return [storedValue, setValue];
}

// 用于历史记录的专用hook
export function useHistoryStorage() {
  const [history, setHistory] = useLocalStorage<Array<{
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
  }>>('kpi_history', []);

  const addRecord = useCallback((record: {
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
  }) => {
    setHistory(prev => [...prev, record]);
  }, [setHistory]);

  const deleteRecord = useCallback((id: string) => {
    setHistory(prev => prev.filter(r => r.id !== id));
  }, [setHistory]);

  const getRecord = useCallback((id: string) => {
    return history.find(r => r.id === id);
  }, [history]);

  const getRecordNames = useCallback(() => {
    return history.map(r => ({ id: r.id, name: `${r.name} (${r.created_at})` }));
  }, [history]);

  return {
    history,
    addRecord,
    deleteRecord,
    getRecord,
    getRecordNames,
  };
}

// 用于配置存储的hook
export function useConfigStorage<T>(key: string, defaultConfig: T) {
  const [config, setConfig] = useLocalStorage<T>(key, defaultConfig);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, [setConfig, defaultConfig]);

  const updateConfig = useCallback((updates: Partial<T>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, [setConfig]);

  return {
    config,
    setConfig,
    resetConfig,
    updateConfig,
  };
}
