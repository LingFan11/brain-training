"use client";

interface SceneDifficultySelectorProps {
  selectedDifficulty: number;
  onSelect: (difficulty: number) => void;
}

const DIFFICULTY_LEVELS = [
  { value: 1, label: "入门", description: "3个元素，15秒记忆" },
  { value: 3, label: "简单", description: "4个元素，13秒记忆" },
  { value: 5, label: "中等", description: "6个元素，10秒记忆" },
  { value: 7, label: "困难", description: "8个元素，8秒记忆" },
  { value: 10, label: "专家", description: "10个元素，5秒记忆" },
];

export default function SceneDifficultySelector({
  selectedDifficulty,
  onSelect,
}: SceneDifficultySelectorProps) {
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-600 mb-3">选择难度</h3>
      <div className="space-y-2">
        {DIFFICULTY_LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => onSelect(level.value)}
            className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
              selectedDifficulty === level.value
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`font-medium ${
                  selectedDifficulty === level.value
                    ? "text-purple-700"
                    : "text-gray-700"
                }`}
              >
                {level.label}
              </span>
              <span className="text-xs text-gray-500">{level.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
