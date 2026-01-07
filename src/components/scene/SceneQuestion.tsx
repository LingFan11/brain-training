"use client";

import { type SceneTestQuestion } from "@/engines/scene";

interface SceneQuestionProps {
  question: SceneTestQuestion | null;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
  lastAnswer?: string | null;
  lastCorrect?: boolean | null;
  showFeedback?: boolean;
}

export default function SceneQuestion({
  question,
  onAnswer,
  disabled = false,
  lastAnswer = null,
  lastCorrect = null,
  showFeedback = false,
}: SceneQuestionProps) {
  if (!question) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <span className="text-gray-400 text-lg">准备开始测试...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 问题显示 */}
      <div className="card">
        <div className="flex items-center mb-3">
          <span className={`text-lg mr-2 ${question.type === 'item' ? 'text-blue-500' : 'text-green-500'}`}>
            {question.type === 'item' ? '🗃️' : '📌'}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
            {question.type === 'item' ? '物品记忆' : '位置记忆'}
          </span>
        </div>
        <p className="text-lg font-medium text-gray-800">{question.question}</p>
      </div>

      {/* 选项按钮 */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((option, index) => {
          const isSelected = lastAnswer === option;
          const isCorrectAnswer = option === question.correctAnswer;
          
          let buttonClass = "p-4 rounded-xl border-2 transition-all text-center font-medium ";
          
          if (showFeedback && isSelected) {
            if (lastCorrect) {
              buttonClass += "border-green-500 bg-green-50 text-green-700";
            } else {
              buttonClass += "border-red-500 bg-red-50 text-red-700";
            }
          } else if (showFeedback && isCorrectAnswer && !lastCorrect) {
            // 显示正确答案
            buttonClass += "border-green-500 bg-green-50 text-green-700";
          } else if (disabled) {
            buttonClass += "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed";
          } else {
            buttonClass += "border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50 active:scale-95";
          }

          return (
            <button
              key={index}
              onClick={() => !disabled && onAnswer(option)}
              disabled={disabled}
              className={buttonClass}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
