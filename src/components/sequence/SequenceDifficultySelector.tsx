"use client";

interface SequenceDifficultySelectorProps {
  selectedDifficulty: number;
  onSelect: (difficulty: number) => void;
  disabled?: boolean;
}

const DIFFICULTY_OPTIONS = [
  { level: 1, label: "入门", description: "1-back" },
  { level: 3, label: "简单", description: "1-back" },
  { level: 5, label: "中等", description: "2-back" },
  { level: 7, label: "困难", description: "3-back" },
  { level: 10, label: "专家", description: "4-back" },
];

export default function SequenceDifficultySelector({
  selectedDifficulty,
  onSelect,
  disabled = false,
}: SequenceDifficultySelectorProps) {
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
            <span className="font-bold text-sm">{label}</span>
            <span className={`text-xs mt-0.5 ${selectedDifficulty === level ? "text-indigo-100" : "opacity-75"}`}>{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
