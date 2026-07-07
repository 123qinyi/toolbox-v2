import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataImport } from '@/components/DataImport';
import { IndicatorConfig } from '@/components/IndicatorConfig';
import { HistoryRecords } from '@/components/HistoryRecords';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getDefaultConfig } from '@/lib/kpi-utils';
import type { KPIConfig, KPIRecord } from '@/types/kpi';
import {
  Upload,
  Settings,
  History,
} from 'lucide-react';

export interface HistoryRecord {
  id: string;
  name: string;
  date_range: string;
  created_at: string;
  kpiData: string;
  feedbackData: string;
  processedData: KPIRecord[];
}

interface ImportDataState {
  kpiData: string;
  feedbackData: string;
  processedData: KPIRecord[];
}

const MAX_HISTORY_RECORDS = 12;

export function KpiTool() {
  const [rawConfig, setConfig] = useLocalStorage<KPIConfig>('kpi_config', getDefaultConfig());

  const config: KPIConfig = {
    ...getDefaultConfig(),
    ...rawConfig,
    basic: {
      ...getDefaultConfig().basic,
      ...rawConfig.basic,
      custom_fields: rawConfig.basic?.custom_fields || [],
    },
    vip: {
      ...getDefaultConfig().vip,
      ...rawConfig.vip,
      custom_fields: rawConfig.vip?.custom_fields || [],
    },
    leader: {
      ...getDefaultConfig().leader,
      ...rawConfig.leader,
      custom_fields: rawConfig.leader?.custom_fields || [],
    },
    global_custom_fields: rawConfig.global_custom_fields || getDefaultConfig().global_custom_fields,
    grade_standards: rawConfig.grade_standards || getDefaultConfig().grade_standards,
    assessment_period: rawConfig.assessment_period || 'monthly',
  };

  const [activeTab, setActiveTab] = useState('import');
  const [userDefaultConfig, setUserDefaultConfig] = useLocalStorage<KPIConfig | null>('kpi_user_default_config', null);
  const [importDataState, setImportDataState] = useLocalStorage<ImportDataState>('kpi_import_state', {
    kpiData: '',
    feedbackData: '',
    processedData: [],
  });
  const [historyRecords, setHistoryRecords] = useLocalStorage<HistoryRecord[]>('kpi_history_v2', []);

  const handleSaveToHistory = useCallback((
    dateRange: string,
    kpiData: string,
    feedbackData: string,
    processedData: KPIRecord[]
  ) => {
    const newRecord: HistoryRecord = {
      id: Date.now().toString(),
      name: dateRange,
      date_range: dateRange,
      created_at: new Date().toLocaleString('zh-CN'),
      kpiData,
      feedbackData,
      processedData,
    };

    setHistoryRecords(prev => {
      const existingIndex = prev.findIndex(r => r.date_range === dateRange);
      let newRecords: HistoryRecord[];
      if (existingIndex >= 0) {
        newRecords = [...prev];
        newRecords[existingIndex] = newRecord;
      } else {
        newRecords = [newRecord, ...prev];
        if (newRecords.length > MAX_HISTORY_RECORDS) {
          newRecords = newRecords.slice(0, MAX_HISTORY_RECORDS);
        }
      }
      return newRecords;
    });
  }, [setHistoryRecords]);

  const handleDeleteHistory = useCallback((id: string) => {
    setHistoryRecords(prev => prev.filter(r => r.id !== id));
  }, [setHistoryRecords]);

  const handleLoadHistory = useCallback((record: HistoryRecord) => {
    setImportDataState({
      kpiData: record.kpiData,
      feedbackData: record.feedbackData,
      processedData: record.processedData,
    });
    setActiveTab('import');
  }, [setImportDataState]);

  const handleUpdateImportState = useCallback((updates: Partial<ImportDataState>) => {
    setImportDataState(prev => ({ ...prev, ...updates }));
  }, [setImportDataState]);

  const handleUpdateConfig = useCallback((newConfig: KPIConfig) => {
    setConfig(newConfig);
  }, [setConfig]);

  const handleSaveConfig = useCallback((newConfig: KPIConfig) => {
    setConfig(newConfig);
    setUserDefaultConfig(newConfig);
  }, [setConfig, setUserDefaultConfig]);

  const handleResetConfig = useCallback(() => {
    if (userDefaultConfig) {
      setConfig(userDefaultConfig);
    } else {
      setConfig(getDefaultConfig());
    }
  }, [setConfig, userDefaultConfig]);

  const handleDeleteDefault = useCallback(() => {
    setUserDefaultConfig(null);
  }, [setUserDefaultConfig]);

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">数据处理</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">指标配置</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">历史记录</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-0">
          <DataImport
            importState={importDataState}
            onUpdateImportState={handleUpdateImportState}
            customFields={config.global_custom_fields}
            config={config}
            onSaveToHistory={handleSaveToHistory}
          />
        </TabsContent>

        <TabsContent value="config" className="mt-0">
          <IndicatorConfig
            config={config}
            userDefaultConfig={userDefaultConfig}
            onSave={handleSaveConfig}
            onUpdate={handleUpdateConfig}
            onReset={handleResetConfig}
            onDeleteDefault={handleDeleteDefault}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <HistoryRecords
            records={historyRecords}
            onLoad={handleLoadHistory}
            onDelete={handleDeleteHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
