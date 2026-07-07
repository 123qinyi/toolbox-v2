import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface DataBackupProps {
  storageKeys: string[];
  label: string;
}

export function DataBackup({ storageKeys, label }: DataBackupProps) {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    const data: Record<string, unknown> = {};
    for (const key of storageKeys) {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          data[key] = JSON.parse(item);
        } catch {
          data[key] = item;
        }
      }
    }
    const json = JSON.stringify(data, null, 2);
    copyText(json);
    toast.success(`${label}已导出并复制`);
  };

  const handleImport = () => {
    if (!importText.trim()) {
      toast.error('请输入要导入的数据');
      return;
    }
    try {
      const data = JSON.parse(importText);
      for (const key of storageKeys) {
        if (data[key] !== undefined) {
          localStorage.setItem(key, typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]));
        }
      }
      toast.success(`${label}已导入，请刷新页面`);
      setImportText('');
      setShowImport(false);
    } catch {
      toast.error('数据格式错误');
    }
  };

  const copyText = (text: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-gray-500 hover:text-green-600 hover:bg-green-50 text-xs"
        onClick={handleExport}
        title={`导出${label}`}
      >
        <Download className="w-3.5 h-3.5 mr-1" />
        导出
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 text-xs"
        onClick={() => setShowImport(!showImport)}
        title={`导入${label}`}
      >
        <Upload className="w-3.5 h-3.5 mr-1" />
        导入
      </Button>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-lg shadow-lg p-4 w-[500px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-medium mb-2">导入{label}</div>
            <Textarea
              className="font-mono text-xs h-32 mb-2"
              placeholder={`粘贴之前导出的${label}数据...`}
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowImport(false)}>取消</Button>
              <Button size="sm" onClick={handleImport} className="bg-blue-600 hover:bg-blue-700">
                <Upload className="w-3.5 h-3.5 mr-1" />
                确认导入
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
