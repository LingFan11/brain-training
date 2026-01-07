"use client";

interface SimonStatusProps {
  round: number;
  sequenceLength: number;
  lives: number;
  maxLives: number;
  highestLength: number;
  phase: "watch" | "repeat" | "feedback";
  userInputLength: number;
}

export default function SimonStatus({
  round,
  sequenceLength,
  lives,
  maxLives,
  highestLength,
  phase,
  userInputLength,
}: SimonStatusProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        {/* 回合 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">回合</p>
          <p className="text-xl font-bold text-gray-800">{round}</p>
        </div>

        {/* 序列长度 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">序列</p>
          <p className="text-xl font-bold text-purple-600">{sequenceLength}</p>
        </div>

        {/* 最高记录 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">最高</p>
          <p className="text-xl font-bold text-green-600">{highestLength}</p>
        </div>

        {/* 生命 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">生命</p>
          <div className="flex gap-1 justify-center">
            {Array.from({ length: maxLives }).map((_, i) => (
              <span key={i} className={`text-lg ${i < lives ? "opacity-100" : "opacity-30"}`}>
                ❤️
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 进度条（用户输入阶段） */}
      {phase === "repeat" && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>输入进度</span>
            <span>{userInputLength} / {sequenceLength}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-200"
              style={{ width: `${(userInputLength / sequenceLength) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 状态提示 */}
      <div className={`mt-3 text-center py-2 rounded-lg ${
        phase === "watch" 
          ? "bg-blue-50 text-blue-700" 
          : phase === "repeat"
          ? "bg-green-50 text-green-700"
          : "bg-gray-50 text-gray-700"
      }`}>
        {phase === "watch" && (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-pulse">👀</span> 仔细听并记住顺序...
          </span>
        )}
        {phase === "repeat" && (
          <span className="flex items-center justify-center gap-2">
            <span>👆</span> 按顺序点击重复
          </span>
        )}
        {phase === "feedback" && (
          <span>等待下一回合...</span>
        )}
      </div>
    </div>
  );
}
