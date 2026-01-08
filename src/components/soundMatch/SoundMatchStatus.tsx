"use client";

interface SoundMatchStatusProps {
  matchedPairs: number;
  totalPairs: number;
  attempts: number;
  timeLeft: number | null;  // null表示无时间限制
}

export default function SoundMatchStatus({
  matchedPairs,
  totalPairs,
  attempts,
  timeLeft,
}: SoundMatchStatusProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        {/* 配对进度 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">配对</p>
          <p className="text-xl font-bold text-purple-600">
            {matchedPairs}/{totalPairs}
          </p>
        </div>

        {/* 尝试次数 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">尝试</p>
          <p className="text-xl font-bold text-gray-700">{attempts}</p>
        </div>

        {/* 时间 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {timeLeft !== null ? "剩余时间" : "用时"}
          </p>
          <p className={`text-xl font-bold ${
            timeLeft !== null && timeLeft < 30 ? "text-red-500" : "text-orange-500"
          }`}>
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </p>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(matchedPairs / totalPairs) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
