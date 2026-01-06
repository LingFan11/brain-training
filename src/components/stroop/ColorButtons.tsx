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
        };
      } else {
        return {
          backgroundColor: "#fee2e2",
          borderColor: "#ef4444",
          color: "#ef4444",
        };
      }
    }
    
    // 默认样式
    return {
      backgroundColor: "white",
      borderColor: baseColor,
      color: baseColor,
    };
  };

  return (
    <div className="w-full">
      <p className="text-sm text-gray-500 text-center mb-3">选择墨水颜色</p>
      <div className="grid grid-cols-2 gap-3">
        {CHINESE_COLORS.map((color) => {
          const style = getButtonStyle(color);
          return (
            <button
              key={color}
              onClick={() => onSelect(color)}
              disabled={disabled}
              className={`
                py-4 px-6 rounded-xl border-3 font-bold text-2xl
                transition-all duration-150 touch-manipulation
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
              `}
              style={{
                backgroundColor: style.backgroundColor,
                borderColor: style.borderColor,
                borderWidth: "3px",
                color: style.color,
                transform: style.transform,
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
