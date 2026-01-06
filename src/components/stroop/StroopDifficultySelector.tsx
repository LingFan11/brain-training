"use client";

interface StroopDifficultySelectorProps {
  selectedDifficulty: number;
  onSelect: (difficulty: number) => void;
  disabled?: boolean;
}

const DIFFICULTY_OPTIONS = [
  { level: 1, label: "入门", description: "80%一致" },
  { level: 3, label: "简单", description: "60%一致" },
  { level: 5, label: "中等", description: "50%一致" },
  { level: 7, label: "困难", description: "35%一致" },
  { level: 10, label: "专家", description: "20%一致" },
];

export default function StroopDifficultySelector({
  selectedDifficulty,
  onSelect,
  disabled = false,
}: StroopDifficultySelectorProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-gray-700 mb-2">选择难度</h3>
      <div className="grid grid-cols-5 gap-2">
        {DIFFICULTY_OPTIONS.map(({ level, label, description }) => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            disabled={disabled}
            className={`
              py-3 px-1 rounded-2xl transition-all duration-200
              touch-manipulation flex flex-col items-center justify-center
              ${
                selectedDifficulty === level
                  ? "bg-violet-500/80 text-white border border-violet-400/50 shadow-lg shadow-violet-500/30"
                  : "glass-strong text-gray-700 hover:bg-white/40"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <span className="font-bold text-sm">{label}</span>
            <span className={`text-xs mt-0.5 ${selectedDifficulty === level ? "text-violet-100" : "opacity-75"}`}>{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
