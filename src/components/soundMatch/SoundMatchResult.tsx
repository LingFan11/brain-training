"use client";

import { type SoundMatchResult as SoundMatchResultType } from "@/engines/soundMatch";

interface SoundMatchResultProps {
  result: SoundMatchResultType;
  onRestart: () => void;
  onChangeDifficulty: () => void;
}

export default function SoundMatchResult({
  result,
  onRestart,
  onChangeDifficulty,
}: SoundMatchResultProps) {
  const getGrade = (accuracy: number, perfectMatches: number, pairCount: number) => {
    const perfectRatio = perfectMatches / pairCount;
    if (perfectRatio >= 0.8) return { text: "听觉大师", color: "text-purple-600", bg: "bg-purple-100", icon: "🎧" };
    if (accuracy >= 0.7) return { text: "优秀", color: "text-green-600", bg: "bg-green-100", icon: "🌟" };
    if (accuracy >= 0.5) return { text: "良好", color: "text-blue-600", bg: "bg-blue-100", icon: "👍" };
    return { text: "继续加油", color: "text-orange-600", bg: "bg-orange-100", icon: "💪" };
  };

  const grade = getGrade(result.accuracy, result.perfectMatches, result.pairCount);

  return (
    <div className="space-y-4">
      {/* 主要结果 */}
      <div className="card text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${grade.bg} mb-4`}>
          <span className="text-2xl">{grade.icon}</span>
          <span className={`font-bold ${grade.color}`}>{grade.text}</span>
        </div>
        
        <div className="text-5xl font-bold text-gray-800 mb-2">
          {result.score}
        </div>
        <p className="text-gray-500 text-sm">总分</p>
      </div>

      {/* 核心数据 */}
      <div className="card">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-3xl font-bold text-green-600">{result.matchedPairs}/{result.pairCount}</p>
            <p className="text-xs text-gray-500 mt-1">配对成功</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <p className="text-3xl font-bold text-purple-600">{result.perfectMatches}</p>
            <p className="text-xs text-gray-500 mt-1">一次配对</p>
          </div>
        </div>
      </div>

      {/* 详细数据 */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-600 mb-3">训练详情</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
            <span className="text-gray-500">尝试次数</span>
            <span className="font-medium">{result.attempts}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
            <span className="text-gray-500">准确率</span>
            <span className="font-medium">{Math.round(result.accuracy * 100)}%</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
            <span className="text-gray-500">用时</span>
            <span className="font-medium">{result.duration}s</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
            <span className="text-gray-500">效率</span>
            <span className="font-medium">
              {result.attempts > 0 ? (result.matchedPairs / result.attempts * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-3">
        <button onClick={onRestart} className="btn-primary w-full">
          再来一次
        </button>
        <button onClick={onChangeDifficulty} className="btn-secondary w-full">
          调整难度
        </button>
      </div>
    </div>
  );
}
