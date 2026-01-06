"use client";

import { type StroopTrial, COLOR_MAP } from "@/engines/stroop";

interface StroopWordProps {
  trial: StroopTrial | null;
  showFeedback?: boolean;
  feedbackCorrect?: boolean | null;
}

export default function StroopWord({
  trial,
  showFeedback = false,
  feedbackCorrect = null,
}: StroopWordProps) {
  if (!trial) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-lg">准备开始...</span>
      </div>
    );
  }

  const inkColor = COLOR_MAP[trial.inkColor];

  return (
    <div className="relative flex items-center justify-center h-32">
      {/* 反馈动画背景 */}
      {showFeedback && feedbackCorrect !== null && (
        <div
          className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
            feedbackCorrect
              ? "bg-green-100 opacity-50"
              : "bg-red-100 opacity-50"
          }`}
        />
      )}
      
      {/* 颜色词 */}
      <span
        className="text-6xl font-bold transition-all duration-150 select-none"
        style={{ color: inkColor }}
      >
        {trial.word}
      </span>
    </div>
  );
}
