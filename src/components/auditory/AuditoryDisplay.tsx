"use client";

import { type ChineseSound } from "@/engines/auditory";

interface AuditoryDisplayProps {
  currentSound: ChineseSound | null;
  targetSound: ChineseSound;
  isPlaying: boolean;
  showFeedback: boolean;
  feedbackType: "hit" | "miss" | "falseAlarm" | "correctRejection" | null;
}

export default function AuditoryDisplay({
  currentSound,
  targetSound,
  isPlaying,
  showFeedback,
  feedbackType,
}: AuditoryDisplayProps) {
  const getFeedbackMessage = () => {
    switch (feedbackType) {
      case "hit":
        return { text: "正确！", color: "text-green-600", bg: "bg-green-50" };
      case "miss":
        return { text: "漏报了目标", color: "text-red-600", bg: "bg-red-50" };
      case "falseAlarm":
        return { text: "误报", color: "text-orange-600", bg: "bg-orange-50" };
      case "correctRejection":
        return { text: "正确忽略", color: "text-blue-600", bg: "bg-blue-50" };
      default:
        return null;
    }
  };

  const feedback = getFeedbackMessage();

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* 目标提示 */}
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-500 mb-1">目标声音</p>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 border-2 border-teal-300">
          <span className="text-3xl font-bold text-teal-700">{targetSound}</span>
        </div>
      </div>

      {/* 当前声音显示 */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* 播放动画 */}
        {isPlaying && (
          <>
            <div className="absolute inset-0 rounded-full bg-teal-200 animate-ping opacity-30" />
            <div className="absolute inset-2 rounded-full bg-teal-300 animate-pulse opacity-50" />
          </>
        )}
        
        {/* 声音显示 */}
        <div 
          className={`
            relative z-10 w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-200
            ${isPlaying ? "bg-teal-500 scale-110" : "bg-gray-200"}
            ${showFeedback && feedback ? feedback.bg : ""}
          `}
        >
          {isPlaying && currentSound ? (
            <span className="text-4xl font-bold text-white">{currentSound}</span>
          ) : showFeedback && feedback ? (
            <span className={`text-lg font-bold ${feedback.color}`}>{feedback.text}</span>
          ) : (
            <svg 
              className="w-12 h-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
              />
            </svg>
          )}
        </div>
      </div>

      {/* 说明文字 */}
      <p className="mt-6 text-sm text-gray-500 text-center">
        听到目标声音 &quot;{targetSound}&quot; 时，请立即点击下方按钮
      </p>
    </div>
  );
}
