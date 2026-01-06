"use client";

import { useCallback } from "react";

interface SchulteGridProps {
  grid: number[][];
  currentTarget: number;
  onTap: (number: number) => void;
  disabled?: boolean;
  lastTappedNumber?: number | null;
  lastTapCorrect?: boolean | null;
}

export default function SchulteGrid({
  grid,
  currentTarget,
  onTap,
  disabled = false,
  lastTappedNumber = null,
  lastTapCorrect = null,
}: SchulteGridProps) {
  const gridSize = grid.length;
  
  const handleTap = useCallback(
    (number: number) => {
      if (!disabled) {
        onTap(number);
      }
    },
    [disabled, onTap]
  );

  const getCellStyle = (number: number) => {
    // 已完成的数字（小于当前目标）
    if (number < currentTarget) {
      return "bg-green-100 text-green-600 border-green-200";
    }
    
    // 刚刚点击的数字
    if (number === lastTappedNumber) {
      if (lastTapCorrect) {
        return "bg-green-500 text-white border-green-600 scale-95";
      } else {
        return "bg-red-500 text-white border-red-600 animate-shake";
      }
    }
    
    // 默认样式
    return "bg-white text-gray-800 border-gray-200 hover:bg-gray-50 active:bg-gray-100";
  };

  // 根据网格大小计算字体大小
  const getFontSize = () => {
    switch (gridSize) {
      case 3:
        return "text-3xl";
      case 4:
        return "text-2xl";
      case 5:
        return "text-xl";
      case 6:
        return "text-lg";
      default:
        return "text-xl";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className="grid gap-2 aspect-square"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((number, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleTap(number)}
              disabled={disabled || number < currentTarget}
              className={`
                aspect-square rounded-xl border-2 font-bold
                transition-all duration-150 touch-manipulation
                flex items-center justify-center
                ${getFontSize()}
                ${getCellStyle(number)}
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {number}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
