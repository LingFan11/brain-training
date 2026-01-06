"use client";

import { type BilateralResult } from "@/engines/bilateral";
import { AIFeedback } from "@/components/ai";
import type { TrainingRecord } from "@/lib/database.types";

interface BilateralResultProps {
  result: BilateralResult;
  onRestart: () => void;
  onChangeDifficulty: () => void;
  savedRecord?: TrainingRecord;
}

export default function BilateralResultDisplay({
  result,
  onRestart,
  onChangeDifficulty,
  savedRecord,
}: BilateralResultProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (mins > 0) {
      return `${mins}分${secs.toString().padStart(2, "0")}秒`;
    }
    return `${secs}秒`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.9) return "text-green-600";
    if (accuracy >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreRating = (score: number) => {
    if (score >= 200) return { text: "优秀", color: "text-green-600" };
    if (score >= 150) return { text: "良好", color: "text-blue-600" };
    if (score >= 100) return { text: "合格", color: "text-yellow-600" };
    return { text: "继续加油", color: "text-gray-600" };
  };

  const rating = getScoreRating(result.score);

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
          <span className="text-2xl font-bold text-purple-600">{result.score}</span>
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

        {/* 平均响应时间 */}
        <div className="flex justify-between items-center py-3 border-b border-gray-100">
          <span className="text-gray-600">平均响应</span>
          <span className="text-lg font-semibold text-gray-800">
            {result.avgTiming}ms
          </span>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{result.correctCount}</p>
            <p className="text-xs text-gray-500">正确</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{result.errorCount}</p>
            <p className="text-xs text-gray-500">错误</p>
          </div>
        </div>

        {/* 镜像/非镜像准确率 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xl font-bold text-purple-600">
              {Math.round(result.mirrorAccuracy * 100)}%
            </p>
            <p className="text-xs text-gray-500">镜像准确率</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">
              {Math.round(result.nonMirrorAccuracy * 100)}%
            </p>
            <p className="text-xs text-gray-500">非镜像准确率</p>
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
          onClick={onChangeDifficulty}
          className="btn-secondary w-full"
        >
          更换难度
        </button>
      </div>
    </div>
  );
}
