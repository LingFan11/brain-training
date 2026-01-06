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
    if (accuracy >= 0.95) return "text-green-600";
    if (accuracy >= 0.8) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreRating = (score: number, gridSize: number) => {
    const baseScore = gridSize * 100;
    const ratio = score / baseScore;
    
    if (ratio >= 1.5) return { text: "优秀", color: "text-green-600" };
    if (ratio >= 1.2) return { text: "良好", color: "text-blue-600" };
    if (ratio >= 1.0) return { text: "合格", color: "text-yellow-600" };
    return { text: "继续加油", color: "text-gray-600" };
  };

  const rating = getScoreRating(result.score, result.gridSize);

  return (
    <div className="card w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">训练完成！</h2>
        <p className={`text-lg font-medium ${rating.color}`}>{rating.text}</p>
      </div>

      <div className="space-y-4 mb-6">
        {/* 分数 */}
        <div className="flex justify-between items-center py-3 border-b border-gray-100">
          <span className="text-gray-600">得分</span>
          <span className="text-2xl font-bold text-blue-600">{result.score}</span>
        </div>

        {/* 用时 */}
        <div className="flex justify-between items-center py-3 border-b border-gray-100">
          <span className="text-gray-600">用时</span>
          <span className="text-lg font-semibold text-gray-800">
            {formatTime(result.duration)}
          </span>
        </div>

        {/* 准确率 */}
        <div className="flex justify-between items-center py-3 border-b border-gray-100">
          <span className="text-gray-600">准确率</span>
          <span className={`text-lg font-semibold ${getAccuracyColor(result.accuracy)}`}>
            {Math.round(result.accuracy * 100)}%
          </span>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{result.correctCount}</p>
            <p className="text-xs text-gray-500">正确</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{result.errorCount}</p>
            <p className="text-xs text-gray-500">错误</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {result.avgTapTime > 0 ? `${(result.avgTapTime * 1000).toFixed(0)}ms` : "-"}
            </p>
            <p className="text-xs text-gray-500">平均反应</p>
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
