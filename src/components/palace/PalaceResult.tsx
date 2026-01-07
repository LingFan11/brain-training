"use client";

import { type PalaceResult as PalaceResultType } from "@/engines/palace";

interface PalaceResultProps {
  result: PalaceResultType;
  onRestart: () => void;
  onChangeDifficulty: () => void;
}

export default function PalaceResult({
  result,
  onRestart,
  onChangeDifficulty,
}: PalaceResultProps) {
  const getGrade = (accuracy: number) => {
    if (accuracy >= 0.9) return { text: "完美", color: "text-purple-600", bg: "bg-purple-100" };
    if (accuracy >= 0.7) return { text: "优秀", color: "text-green-600", bg: "bg-green-100" };
    if (accuracy >= 0.5) return { text: "良好", color: "text-blue-600", bg: "bg-blue-100" };
    return { text: "继续加油", color: "text-orange-600", bg: "bg-orange-100" };
  };

  const grade = getGrade(result.accuracy);

  return (
    <div className="space-y-4">
      {/* 主要结果 */}
      <div className="card text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${grade.bg} mb-4`}>
          <span className="text-2xl">🏛️</span>
          <span className={`font-bold ${grade.color}`}>{grade.text}</span>
        </div>
        
        <div className="text-5xl font-bold text-gray-800 mb-2">
          {result.score}
        </div>
        <p className="text-gray-500 text-sm">总分</p>
      </div>

      {/* 详细数据 */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-600 mb-3">训练详情</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">{result.correctCount}</p>
            <p className="text-xs text-gray-500">正确放置</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-red-500">{result.wrongCount + result.missedCount}</p>
            <p className="text-xs text-gray-500">错误/遗漏</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-purple-600">{Math.round(result.accuracy * 100)}%</p>
            <p className="text-xs text-gray-500">准确率</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-orange-500">{result.duration}s</p>
            <p className="text-xs text-gray-500">用时</p>
          </div>
        </div>
      </div>

      {/* 各房间结果 */}
      {result.roomResults.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-3">各房间表现</h3>
          <div className="space-y-2">
            {result.roomResults.map((room) => {
              const roomAccuracy = room.totalCount > 0 ? room.correctCount / room.totalCount : 0;
              return (
                <div key={room.roomId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{room.roomName}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${roomAccuracy * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {room.correctCount}/{room.totalCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
