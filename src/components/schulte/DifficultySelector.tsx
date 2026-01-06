"use client";

import { type GridSize } from "@/engines/schulte";

interface DifficultySelectorProps {
  selectedSize: GridSize;
  onSelect: (size: GridSize) => void;
  disabled?: boolean;
}

const GRID_OPTIONS: { size: GridSize; label: string; description: string }[] = [
  { size: 3, label: "3×3", description: "简单" },
  { size: 4, label: "4×4", description: "中等" },
  { size: 5, label: "5×5", description: "困难" },
  { size: 6, label: "6×6", description: "专家" },
];

export default function DifficultySelector({
  selectedSize,
  onSelect,
  disabled = false,
}: DifficultySelectorProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-gray-700 mb-2">选择难度</h3>
      <div className="grid grid-cols-4 gap-2">
        {GRID_OPTIONS.map(({ size, label, description }) => (
          <button
            key={size}
            onClick={() => onSelect(size)}
            disabled={disabled}
            className={`
              py-3 px-2 rounded-2xl transition-all duration-200
              touch-manipulation flex flex-col items-center justify-center
              ${
                selectedSize === size
                  ? "bg-indigo-500/80 text-white border border-indigo-400/50 shadow-lg shadow-indigo-500/30"
                  : "glass-strong text-gray-700 hover:bg-white/40"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <span className="font-bold text-lg">{label}</span>
            <span className={`text-xs mt-0.5 ${selectedSize === size ? "text-indigo-100" : ""}`}>{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
