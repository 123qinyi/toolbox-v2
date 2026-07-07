import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { HistoryRecord } from '@/components/tools/KpiTool';
import { FolderOpen, Trash2 } from 'lucide-react';
import { DataBackup } from '@/components/DataBackup';

interface HistoryRecordsProps {
  records: HistoryRecord[];
  onLoad: (record: HistoryRecord) => void;
  onDelete: (id: string) => void;
}

export function HistoryRecords({ records, onLoad, onDelete }: HistoryRecordsProps) {
  const handleLoad = useCallback((record: HistoryRecord) => {
    onLoad(record);
  }, [onLoad]);

  const handleDelete = useCallback((id: string) => {
    onDelete(id);
  }, [onDelete]);

  if (records.length === 0) {
    return (
      <div className="space-y-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
              <span>📜</span> 历史记录
            </h2>
            <span className="text-sm text-muted-foreground">
              共 0 条记录 (最多保存12条)
            </span>
          </div>
          <DataBackup storageKeys={['kpi_history_v2']} label="KPI历史记录" />
        </div>

        <div className="text-center py-16 text-muted-foreground bg-white rounded-lg border border-dashed">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-lg font-medium">暂无历史记录</p>
          <p className="text-sm mt-2">在数据处理页签处理数据后，记录将自动保存到这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <span>📜</span> 历史记录
          </h2>
          <span className="text-sm text-muted-foreground">
            共 {records.length} 条记录 (最多保存12条)
          </span>
        </div>
        <DataBackup storageKeys={['kpi_history_v2']} label="KPI历史记录" />
      </div>

      {/* 提示信息 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
        <span>💡</span>
        <span>点击"加载"按钮可直接跳转到数据处理页签查看完整数据</span>
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {records.map((record) => (
          <Card key={record.id} className="hover:shadow-sm transition-shadow border border-gray-200 h-[52px]">
            <CardContent className="p-0 px-3 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex-1 min-w-0">
                  {/* 日期范围 */}
                  <div className="font-medium text-gray-900 text-sm truncate leading-tight">
                    {record.name}
                  </div>
                  {/* 记录数和时间 */}
                  <div className="text-xs text-gray-500 leading-tight mt-0.5">
                    {record.processedData.length}条记录 · {record.created_at}
                  </div>
                </div>
                {/* 操作按钮 */}
                <div className="flex items-center gap-0.5 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleLoad(record)}
                    title="加载数据"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="删除记录"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除记录 "{record.name}" 吗？此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(record.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
