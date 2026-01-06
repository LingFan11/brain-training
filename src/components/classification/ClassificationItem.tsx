"use client";

import { type ClassificationItem as ClassificationItemType } from "@/engines/classification";

interface ClassificationItemProps {
  item: ClassificationItemType | null;
  showFeedback?: boolean;
  feedbackCorrect?: boolean | null;
}

// 颜色映射
const COLOR_MAP: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
};

// 大小映射（相对大小）
const SIZE_MAP: Record<string, number> = {
  small: 60,
  medium: 90,
  large: 120,
};

export default function ClassificationItemDisplay({
  item,
  showFeedback = false,
  feedbackCorrect = null,
}: ClassificationItemProps) {
  if (!item) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-gray-400 text-lg">准备开始...</span>
      </div>
    );
  }

  const color = COLOR_MAP[item.color];
  const size = SIZE_MAP[item.size];

  const renderShape = () => {
    switch (item.shape) {
      case "circle":
        return (
          <div
            className="rounded-full transition-all duration-200"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
            }}
          />
        );
      case "square":
        return (
          <div
            className="transition-all duration-200"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
            }}
          />
        );
      case "triangle":
        return (
          <div
            className="transition-all duration-200"
            style={{
              width: 0,
              height: 0,
              borderLeft: `${size / 2}px solid transparent`,
              borderRight: `${size / 2}px solid transparent`,
              borderBottom: `${size}px solid ${color}`,
            }}
          />
        );
    }
  };

  return (
    <div className="relative flex items-center justify-center h-48">
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
      
      {/* 形状显示 */}
      <div className="flex items-center justify-center">
        {renderShape()}
      </div>
    </div>
  );
}
