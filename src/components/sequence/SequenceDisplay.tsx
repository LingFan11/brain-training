"use client";

import { type SequenceItem, type StimulusType } from "@/engines/sequence";

interface SequenceDisplayProps {
  item: SequenceItem | null;
  stimulusType: StimulusType;
  showFeedback?: boolean;
  feedbackType?: "hit" | "miss" | "falseAlarm" | "correctRejection" | null;
  nBack: number;
}

export default function SequenceDisplay({
  item,
  stimulusType,
  showFeedback = false,
  feedbackType = null,
  nBack,
}: SequenceDisplayProps) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <span className="text-gray-400 text-lg">准备开始...</span>
        <span className="text-gray-300 text-sm mt-2">
          {nBack}-back 任务
        </span>
      </div>
    );
  }

  // 根据刺激类型决定显示方式
  const renderStimulus = () => {
    if (stimulusType === "position") {
      // 位置类型：显示3x3网格
      const position = parseInt(item.stimulus) - 1;
      return (
        <div className="grid grid-cols-3 gap-2 w-36 h-36">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`
                rounded-lg transition-all duration-200
                ${i === position 
                  ? "bg-indigo-500 scale-110" 
                  : "bg-gray-200"
                }
              `}
            />
          ))}
        </div>
      );
    }

    // 数字或字母类型：显示大字符
    return (
      <span className="text-8xl font-bold text-indigo-600 select-none">
        {item.stimulus}
      </span>
    );
  };

  const getFeedbackStyle = () => {
    if (!showFeedback || !feedbackType) return "";
    
    switch (feedbackType) {
      case "hit":
      case "correctRejection":
        return "bg-green-100";
      case "miss":
      case "falseAlarm":
        return "bg-red-100";
      default:
        return "";
    }
  };

  const getFeedbackText = () => {
    if (!showFeedback || !feedbackType) return null;
    
    switch (feedbackType) {
      case "hit":
        return { text: "正确！", color: "text-green-600" };
      case "correctRejection":
        return { text: "正确！", color: "text-green-600" };
      case "miss":
        return { text: "漏报", color: "text-red-600" };
      case "falseAlarm":
        return { text: "误报", color: "text-red-600" };
      default:
        return null;
    }
  };

  const feedback = getFeedbackText();

  return (
    <div className={`relative flex flex-col items-center justify-center h-48 rounded-2xl transition-all duration-300 ${getFeedbackStyle()}`}>
      {renderStimulus()}
      
      {/* 反馈文字 */}
      {feedback && (
        <div className={`absolute bottom-2 ${feedback.color} font-semibold text-lg`}>
          {feedback.text}
        </div>
      )}
      
      {/* N-back 提示 */}
      <div className="absolute top-2 right-2 text-xs text-gray-400">
        {nBack}-back
      </div>
    </div>
  );
}
