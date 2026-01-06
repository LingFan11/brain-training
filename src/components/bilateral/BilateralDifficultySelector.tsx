"use client";

interface BilateralDifficultySelectorProps {
  selectedDifficulty: number;
  onSelect: (difficulty: number) => void;
  disabled?: boolean;
}

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "入门", description: "3秒响应" },
  { value: 3, label: "简单", description: "2.5秒响应" },
  { value: 5, label: "中等", description: "2秒响应" },
  { value: 7, label: "困难", description: "1.5秒响应" },
  { value: 10, label: "专家", description: "1秒响应" },
];

export default function BilateralDifficultySelector({
  selectedDifficulty,
  onSelect,
  disabled = false,
}: BilateralDifficultySelectorProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-gray-600 mb-2">选择难度</h3>
      <div className="grid grid-cols-5 gap-2">
        {DIFFICULTY_OPTIONS.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            disabled={disabled}
            className={`
              py-3 px-2 rounded-xl border-2 transition-all duration-200
              touch-manipulation flex flex-col items-center justify-center
              ${
                selectedDifficulty === value
                  ? "border-purple-500 bg-purple-50 text-purple-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span className="font-bold text-sm">{label}</span>
            <span className="text-xs mt-0.5 whitespace-nowrap">{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
