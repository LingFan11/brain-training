"use client";

import { CHINESE_COLORS, COLOR_MAP, type ChineseColor } from "@/engines/stroop";

interface ColorButtonsProps {
  onSelect: (color: ChineseColor) => void;
  disabled?: boolean;
  lastSelected?: ChineseColor | null;
  lastCorrect?: boolean | null;
}

export default function ColorButtons({
  onSelect,
  disabled = false,
  lastSelected = null,
  lastCorrect = null,
}: ColorButtonsProps) {
  const getButtonStyle = (color: ChineseColor) => {
    const baseColor = COLOR_MAP[color];
    
    // 刚刚选择的按钮
    if (color === lastSelected && lastCorrect !== null) {
      if (lastCorrect) {
        return {
          backgroundColor: baseColor,
          borderColor: baseColor,
          color: "white",
          transform: "scale(0.95)",
          boxShadow: `0 8px 32px ${baseColor}40`,
        };
      } else {
        return {
          backgroundColor: "rgba(254, 226, 226, 0.8)",
          borderColor: "#ef4444",
          color: "#ef4444",
          boxShadow: "0 8px 32px rgba(239, 68, 68, 0.3)",
        };
      }
    }
    
    // 默认样式 - 液态玻璃
    return {
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      borderColor: baseColor,
      color: baseColor,
      backdropFilter: "blur(12px)",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
    };
  };

  return (
    <div className="w-full">
      <p className="text-sm text-gray-600 text-center mb-3">选择墨水颜色</p>
      <div className="grid grid-cols-2 gap-3">
        {CHINESE_COLORS.map((color) => {
          const style = getButtonStyle(color);
          return (
            <button
              key={color}
              onClick={() => onSelect(color)}
              disabled={disabled}
              className={`
                py-4 px-6 rounded-2xl border-2 font-bold text-2xl
                transition-all duration-200 touch-manipulation
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02] active:scale-95"}
              `}
              style={{
                backgroundColor: style.backgroundColor,
                borderColor: style.borderColor,
                borderWidth: "2px",
                color: style.color,
                transform: style.transform,
                backdropFilter: style.backdropFilter,
                WebkitBackdropFilter: style.backdropFilter,
                boxShadow: style.boxShadow,
              }}
            >
              {color}
            </button>
          );
        })}
      </div>
    </div>
  );
}
