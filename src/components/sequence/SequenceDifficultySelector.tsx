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
      <h3 className="text-sm font-medium text-gray-600 mb-2">选择难度</h3>
      <div className="grid grid-cols-5 gap-2">
        {DIFFICULTY_OPTIONS.map(({ level, label, description }) => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            disabled={disabled}
            className={`
              py-3 px-1 rounded-xl border-2 transition-all duration-200
              touch-manipulation flex flex-col items-center justify-center
              ${
                selectedDifficulty === level
                  ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span className="font-bold text-sm">{label}</span>
            <span className="text-xs mt-0.5 opacity-75">{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
