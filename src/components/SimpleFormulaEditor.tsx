import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';

interface SimpleFormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  availableFields: Array<{
    name: string;
    column_name: string;
    unit?: string;
  }>;
  placeholder?: string;
}

const OPERATORS = ['+', '-', '*', '/', '(', ')', '1', '10', '100'];

export function SimpleFormulaEditor({
  value,
  onChange,
  availableFields,
  placeholder = '输入计算公式，或点击字段和符号插入',
}: SimpleFormulaEditorProps) {
  // 内部状态用于输入时显示
  const [text, setText] = useState(value || '');

  // 当外部 value 变化时同步
  useEffect(() => {
    setText(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setText(newValue);
    onChange(newValue);
  };

  const insertText = (str: string) => {
    const newValue = text + str;
    setText(newValue);
    onChange(newValue);
  };

  const clearText = () => {
    setText('');
    onChange('');
  };

  return (
    <div className="space-y-3">
      {/* 公式输入框 */}
      <div className="space-y-1">
        <Label>计算公式</Label>
        <textarea
          value={text}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
        />
      </div>

      {/* 可用字段 */}
      {availableFields.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">点击插入字段：</Label>
          <div className="flex flex-wrap gap-1.5">
            {availableFields.map((field) => (
              <button
                key={field.column_name}
                type="button"
                onClick={() => insertText(field.column_name)}
                title={`${field.column_name}${field.unit ? ` (${field.unit})` : ''}`}
                className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
              >
                {field.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 运算符 */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-500">点击插入符号/数字：</Label>
        <div className="flex flex-wrap gap-1.5">
          {OPERATORS.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => insertText(op)}
              className="px-2.5 py-1 text-xs font-mono bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
            >
              {op}
            </button>
          ))}
          <button
            type="button"
            onClick={clearText}
            className="px-2 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      {/* 说明 */}
      <div className="text-xs text-gray-500 space-y-0.5">
        <p>支持的运算符：+ - * / ( )</p>
        <p>示例：满意度 * 0.6 + 响应速度 * 0.4</p>
      </div>
    </div>
  );
}
