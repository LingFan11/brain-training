"use client";

import { type SceneResult as SceneResultType } from "@/engines/scene";
import { AIFeedback } from "@/components/ai";
import type { TrainingRecord } from "@/lib/database.types";

interface SceneResultProps {
  result: SceneResultType;
  onRestart: () => void;
  onChangeDifficulty: () => void;
  savedRecord?: TrainingRecord;
}

export default function SceneResult({
  result,
  onRestart,
  onChangeDifficulty,
  savedRecord,
}: SceneResultProps) {
  const getScoreLevel = (accuracy: number) => {
    if (accuracy >= 0.9) return { label: "优秀", color: "text-green-600", emoji: "🎭" };
    if (accuracy >= 0.7) return { label: "良好", color: "text-blue-600", emoji: "🪅" };
    if (accuracy >= 0.5) return { label: "及格", color: "text-yellow-600", emoji: "🧩" };
    return { label: "继续努力", color: "text-gray-600", emoji: "🪁" };
  };

  const scoreLevel = getScoreLevel(result.accuracy);

  return (
    <div className="space-y-4">
      {/* 总分卡片 */}
      <div className="card text-center">
        <span className="text-4xl mb-2 block">{scoreLevel.emoji}</span>
        <h2 className={`text-3xl font-bold ${scoreLevel.color}`}>
          {result.score} 分
        </h2>
        <p className={`text-lg ${scoreLevel.color}`}>{scoreLevel.label}</p>
      </div>

      {/* 详细统计 */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-600 mb-4">训练统计</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(result.accuracy * 100)}%
            </p>
            <p className="text-xs text-gray-500">总准确率</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {result.duration.toFixed(1)}s
            </p>
            <p className="text-xs text-gray-500">总用时</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {result.correctCount}/{result.questionCount}
            </p>
            <p className="text-xs text-gray-500">正确/总题数</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">
              {result.elementCount}
            </p>
            <p className="text-xs text-gray-500">场景元素数</p>
          </div>
        </div>
      </div>

      {/* 分类准确率 */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-600 mb-4">分类准确率</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">🗃️ 物品记忆</span>
              <span className="font-medium text-blue-600">
                {Math.round(result.itemAccuracy * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${result.itemAccuracy * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">📌 位置记忆</span>
              <span className="font-medium text-green-600">
                {Math.round(result.spatialAccuracy * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${result.spatialAccuracy * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 学习时间 */}
      <div className="card">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">实际学习时间</span>
          <span className="font-semibold text-purple-600">
            {result.studyTime.toFixed(1)} 秒
          </span>
        </div>
      </div>

      {/* AI 反馈 */}
      {savedRecord && <AIFeedback record={savedRecord} />}

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
