"use client";

import { type CorsiResult } from "@/engines/sequence";

interface SequenceResultProps {
  result: CorsiResult;
  onRestart: () => void;
  onChangeDifficulty: () => void;
}

export default function SequenceResult({
  result,
  onRestart,
  onChangeDifficulty,
}: SequenceResultProps) {
  const getSpanLevel = (span: number) => {
    if (span >= 7) return { label: "优秀", color: "text-green-600", emoji: "🎭" };
    if (span >= 5) return { label: "良好", color: "text-blue-600", emoji: "🪅" };
    if (span >= 4) return { label: "中等", color: "text-yellow-600", emoji: "🧩" };
    return { label: "继续努力", color: "text-gray-600", emoji: "🪁" };
  };

  const level = getSpanLevel(result.maxSpan);

  return (
    <div className="space-y-4">
      {/* 主要成绩 */}
      <div className="card text-center">
        <span className="text-4xl mb-2 block">{level.emoji}</span>
        <h2 className={`text-3xl font-bold ${level.color}`}>
          {result.score} 分
        </h2>
        <p className={`text-lg ${level.color}`}>{level.label}</p>
      </div>

      {/* 核心指标 */}
      <div className="card">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500">记忆跨度</p>
          <p className="text-4xl font-bold text-indigo-600">{result.maxSpan}</p>
          <p className="text-xs text-gray-400">
            {result.isReverse ? "倒序模式" : "正序模式"}
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800">{result.correctRounds}</p>
            <p className="text-xs text-gray-500">正确轮数</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800">{result.totalRounds}</p>
            <p className="text-xs text-gray-500">总轮数</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800">
              {Math.round(result.accuracy * 100)}%
            </p>
            <p className="text-xs text-gray-500">准确率</p>
          </div>
        </div>
      </div>

      {/* 详细数据 */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-600 mb-3">详细数据</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">平均响应时间</span>
            <span className="font-medium">{(result.avgResponseTime / 1000).toFixed(1)}秒</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">错误次数</span>
            <span className="font-medium">{result.errorCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">总用时</span>
            <span className="font-medium">{result.duration.toFixed(1)}秒</span>
          </div>
        </div>
      </div>

      {/* 参考标准 */}
      <div className="card bg-blue-50">
        <h3 className="text-sm font-medium text-blue-800 mb-2">🧿 参考标准</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <p>• 正常成人记忆跨度：5-7</p>
          <p>• 倒序通常比正序低1-2</p>
          <p>• 跨度7+属于优秀水平</p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-3">
        <button onClick={onRestart} className="btn-primary w-full">
          再来一次
        </button>
        <button onClick={onChangeDifficulty} className="btn-secondary w-full">
          更换难度
        </button>
      </div>
    </div>
  );
}
