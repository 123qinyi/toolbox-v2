import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Type, Repeat, FileText, Copy, Check, Eraser } from 'lucide-react';
import { useStaffContext } from '@/contexts/StaffContext';

export function TextTool() {
  const { staffList } = useStaffContext();
  const [activeTab, setActiveTab] = useState('format');
  const [formatInput, setFormatInput] = useState('');
  const [formatCopied, setFormatCopied] = useState(false);

  // 重复生成状态
  const [repeatInput, setRepeatInput] = useState('');
  const [totalCount, setTotalCount] = useState('');
  const [repeatCopied, setRepeatCopied] = useState(false);

  const formatOutput = useMemo(() => {
    if (!formatInput.trim()) return '';
    return formatInput
      .split('\n')
      .map((line) => line.replace(/\|/g, '\t'))
      .join('\n');
  }, [formatInput]);

  const handleFormatCopy = async () => {
    if (!formatOutput) return;
    try {
      await navigator.clipboard.writeText(formatOutput);
      setFormatCopied(true);
      setTimeout(() => setFormatCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = formatOutput;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setFormatCopied(true);
      setTimeout(() => setFormatCopied(false), 2000);
    }
  };

  const handleFormatClear = () => {
    setFormatInput('');
  };

  // 从人员管理导入姓名（剔除组长和已离职）
  const importStaff = (group: 'A组' | 'B组' | '全部') => {
    const filtered = staffList.filter(s =>
      s.type !== '组长' &&
      s.status !== '已离职' &&
      (group === '全部' || s.group === group)
    );
    const names = filtered.map(s => s.name).join('\n');
    setRepeatInput(names);
  };

  // 重复生成输出
  const repeatOutput = useMemo(() => {
    const people = repeatInput.split('\n').map(l => l.trim()).filter(Boolean);
    const total = parseInt(totalCount) || 0;
    if (people.length === 0 || total <= 0) return '';

    const base = Math.floor(total / people.length);
    const remainder = total % people.length;
    const lines: string[] = [];

    people.forEach((name, i) => {
      const count = base + (i < remainder ? 1 : 0);
      for (let j = 0; j < count; j++) {
        lines.push(name);
      }
    });

    return lines.join('\n');
  }, [repeatInput, totalCount]);

  const repeatOutputCount = useMemo(() => {
    if (!repeatOutput) return 0;
    return repeatOutput.split('\n').length;
  }, [repeatOutput]);

  const handleRepeatCopy = async () => {
    if (!repeatOutput) return;
    try {
      await navigator.clipboard.writeText(repeatOutput);
      setRepeatCopied(true);
      setTimeout(() => setRepeatCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = repeatOutput;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setRepeatCopied(true);
      setTimeout(() => setRepeatCopied(false), 2000);
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="format" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline">格式转化</span>
          </TabsTrigger>
          <TabsTrigger value="repeat" className="flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            <span className="hidden sm:inline">重复生成</span>
          </TabsTrigger>
          <TabsTrigger value="convert" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">文本转换</span>
          </TabsTrigger>
        </TabsList>

        {/* 格式转化 */}
        <TabsContent value="format" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">格式转化</CardTitle>
              <p className="text-sm text-gray-500">将 | 分隔的单列文本转化为 Tab 分隔的多列文本，可直接粘贴到 Excel</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 输入区 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">输入（| 分隔）</span>
                    <Button variant="ghost" size="sm" onClick={handleFormatClear} disabled={!formatInput}>
                      <Eraser className="w-4 h-4 mr-1" />
                      清空
                    </Button>
                  </div>
                  <textarea
                    className="w-full h-80 p-3 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="卢佳祺|张磊&#10;欧仁强&#10;汪立萍|张沈远|李瞳"
                    value={formatInput}
                    onChange={(e) => setFormatInput(e.target.value)}
                  />
                </div>

                {/* 输出区 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">输出（Tab 分隔，可粘贴到 Excel）</span>
                    <Button variant="ghost" size="sm" onClick={handleFormatCopy} disabled={!formatOutput}>
                      {formatCopied ? <Check className="w-4 h-4 mr-1 text-emerald-500" /> : <Copy className="w-4 h-4 mr-1" />}
                      {formatCopied ? '已复制' : '复制'}
                    </Button>
                  </div>
                  <textarea
                    className="w-full h-80 p-3 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm resize-none"
                    readOnly
                    value={formatOutput}
                    placeholder="转化结果将在此显示..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 重复生成 */}
        <TabsContent value="repeat" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">重复生成</CardTitle>
              <p className="text-sm text-gray-500">批量分配处理人：导入人员名单，输入总处理量，自动均匀分配</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 输入区 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">处理人名单</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => importStaff('A组')}>导入A组</Button>
                      <Button variant="outline" size="sm" onClick={() => importStaff('B组')}>导入B组</Button>
                      <Button variant="outline" size="sm" onClick={() => importStaff('全部')}>导入全部</Button>
                    </div>
                  </div>
                  <textarea
                    className="w-full h-72 p-3 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="点击上方按钮导入人员，或手动输入姓名（每行一个）"
                    value={repeatInput}
                    onChange={(e) => setRepeatInput(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">总处理量</label>
                    <input
                      type="number"
                      min="1"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入总处理数量"
                      value={totalCount}
                      onChange={(e) => setTotalCount(e.target.value)}
                    />
                  </div>
                </div>

                {/* 输出区 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      分配结果
                      {repeatOutputCount > 0 && (
                        <span className="ml-2 text-xs text-gray-400">（共 {repeatOutputCount} 条）</span>
                      )}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleRepeatCopy} disabled={!repeatOutput}>
                      {repeatCopied ? <Check className="w-4 h-4 mr-1 text-emerald-500" /> : <Copy className="w-4 h-4 mr-1" />}
                      {repeatCopied ? '已复制' : '复制'}
                    </Button>
                  </div>
                  <textarea
                    className="w-full h-80 p-3 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm resize-none"
                    readOnly
                    value={repeatOutput}
                    placeholder="输入名单和总处理量后，分配结果将在此显示..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 文本转换 */}
        <TabsContent value="convert" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">文本转换</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">功能开发中，请告知具体需求...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
