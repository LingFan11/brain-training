"use client";

import { type AuditoryResult } from "@/engines/auditory";
import { AIFeedback } from "@/components/ai";
import type { TrainingRecord } from "@/lib/database.types";

interface AuditoryResultProps {
  result: AuditoryResult;
  onRestart: () => void;
  onChangeDifficulty: () => void;
  savedRecord?: TrainingRecord;
}

export default function AuditoryResultDisplay({
  result,
  onRestart,
  onChangeDifficulty,
  savedRecord,
}: AuditoryResultProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (mins > 0) {
      return `${mins}分${secs.toString().padStart(2, "0")}秒`;
    }
    return `${secs}秒`;
  };

  const getRateColor = (rate: number, isGoodHigh: boolean = true) => {
    if (isGoodHigh) {
      if (rate >= 0.8) return "text-green-600";
      if (rate >= 0.6) return "text-yellow-600";
      return "text-red-600";
    } else {
      // For false alarm rate, lower is better
      if (rate <= 0.2) return "text-green-600";
      if (rate <= 0.4) return "text-yellow-600";
      return "text-red-600";
    }
  };

  const getScoreRating = (score: number, totalTrials: number) => {
    const maxPossible = totalTrials * 15 + 100;
    const ratio = score / maxPossible;
    
    if (ratio >= 0.8) return { text: "优秀", color: "text-green-600" };
    if (ratio >= 0.6) return { text: "良好", color: "text-blue-600" };
    if (ratio >= 0.4) return { text: "合格", color: "text-yellow-600" };
    return { text: "继续加油", color: "text-gray-600" };
  };

  const getDPrimeRating = (dPrime: number) => {
    if (dPrime >= 2.5) return { text: "优秀", color: "text-green-600" };
    if (dPrime >= 1.5) return { text: "良好", color: "text-blue-600" };
    if (dPrime >= 0.5) return { text: "一般", color: "text-yellow-600" };
    return { text: "需提升", color: "text-red-600" };
  };

  const rating = getScoreRating(result.score, result.totalTrials);
  const dPrimeRating = getDPrimeRating(result.dPrime);

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
          <span className="text-2xl font-bold text-teal-600">{result.score}</span>
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
          <span className="text-gray-600">总准确率</span>
          <span className={`text-lg font-semibold ${getRateColor(result.accuracy)}`}>
            {Math.round(result.accuracy * 100)}%
          </span>
        </div>

        {/* d' 指标 */}
        <div className="flex justify-between items-center py-3 border-b border-gray-100">
          <span className="text-gray-600">辨别力指数 (d&apos;)</span>
          <div className="text-right">
            <span className="text-lg font-semibold text-gray-800">{result.dPrime}</span>
            <span className={`text-sm ml-2 ${dPrimeRating.color}`}>({dPrimeRating.text})</span>
          </div>
        </div>

        {/* 命中率和误报率 */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">命中率</p>
            <p className={`text-xl font-bold ${getRateColor(result.hitRate)}`}>
              {Math.round(result.hitRate * 100)}%
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">误报率</p>
            <p className={`text-xl font-bold ${getRateColor(result.falseAlarmRate, false)}`}>
              {Math.round(result.falseAlarmRate * 100)}%
            </p>
          </div>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">{result.hits}</p>
            <p className="text-xs text-gray-500">命中</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-red-600">{result.misses}</p>
            <p className="text-xs text-gray-500">漏报</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-orange-600">{result.falseAlarms}</p>
            <p className="text-xs text-gray-500">误报</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600">{result.correctRejections}</p>
            <p className="text-xs text-gray-500">正确拒绝</p>
          </div>
        </div>

        {/* 平均反应时间 */}
        {result.avgResponseTime > 0 && (
          <div className="flex justify-between items-center py-3 border-t border-gray-100">
            <span className="text-gray-600">平均反应时间</span>
            <span className="text-lg font-semibold text-gray-800">
              {result.avgResponseTime}ms
            </span>
          </div>
        )}
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
