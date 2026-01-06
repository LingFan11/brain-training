"use client";

import { type SchulteResult } from "@/engines/schulte";
import { AIFeedback } from "@/components/ai";
import type { TrainingRecord } from "@/lib/database.types";

interface SchulteResultProps {
  result: SchulteResult;
  onRestart: () => void;
  onChangeSize: () => void;
  savedRecord?: TrainingRecord;
}

export default function SchulteResultDisplay({
  result,
  onRestart,
  onChangeSize,
  savedRecord,
}: SchulteResultProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 100);
    
    if (mins > 0) {
      return `${mins}分${secs.toString().padStart(2, "0")}秒`;
    }
    return `${secs}.${ms.toString().padStart(2, "0")}秒`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.95) return "text-emerald-600";
    if (accuracy >= 0.8) return "text-amber-600";
    return "text-red-500";
  };

  const getScoreRating = (score: number, gridSize: number) => {
    const baseScore = gridSize * 100;
    const ratio = score / baseScore;
    
    if (ratio >= 1.5) return { text: "优秀", color: "text-emerald-600", bg: "bg-emerald-500/20" };
    if (ratio >= 1.2) return { text: "良好", color: "text-indigo-600", bg: "bg-indigo-500/20" };
    if (ratio >= 1.0) return { text: "合格", color: "text-amber-600", bg: "bg-amber-500/20" };
    return { text: "继续加油", color: "text-gray-600", bg: "bg-gray-500/20" };
  };

  const rating = getScoreRating(result.score, result.gridSize);

  return (
    <div className="card w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">训练完成！</h2>
        <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${rating.color} ${rating.bg}`}>
          {rating.text}
        </span>
      </div>

      <div className="space-y-4 mb-6">
        {/* 分数 */}
        <div className="flex justify-between items-center py-3 border-b border-white/20">
          <span className="text-gray-700">得分</span>
          <span className="text-2xl font-bold text-indigo-600">{result.score}</span>
        </div>

        {/* 用时 */}
        <div className="flex justify-between items-center py-3 border-b border-white/20">
          <span className="text-gray-700">用时</span>
          <span className="text-lg font-semibold text-gray-800">
            {formatTime(result.duration)}
          </span>
        </div>

        {/* 准确率 */}
        <div className="flex justify-between items-center py-3 border-b border-white/20">
          <span className="text-gray-700">准确率</span>
          <span className={`text-lg font-semibold ${getAccuracyColor(result.accuracy)}`}>
            {Math.round(result.accuracy * 100)}%
          </span>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div 
            className="text-center p-3 rounded-xl"
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <p className="text-2xl font-bold text-emerald-600">{result.correctCount}</p>
            <p className="text-xs text-gray-600">正确</p>
          </div>
          <div 
            className="text-center p-3 rounded-xl"
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <p className="text-2xl font-bold text-red-500">{result.errorCount}</p>
            <p className="text-xs text-gray-600">错误</p>
          </div>
          <div 
            className="text-center p-3 rounded-xl"
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <p className="text-2xl font-bold text-indigo-600">
              {result.avgTapTime > 0 ? `${(result.avgTapTime * 1000).toFixed(0)}ms` : "-"}
            </p>
            <p className="text-xs text-gray-600">平均反应</p>
          </div>
        </div>
      </div>

      {/* AI 反馈 */}
      {savedRecord && <AIFeedback record={savedRecord} />}

      {/* 操作按钮 */}
      <div className="space-y-3">
        <button
          onClick={onRestart}
          className="btn-primary w-full"
        >
          再来一次
        </button>
        <button
          onClick={onChangeSize}
          className="btn-secondary w-full"
        >
          更换难度
        </button>
      </div>
    </div>
  );
}
