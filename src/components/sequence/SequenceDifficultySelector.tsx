"use client";

import { getSequenceConfigFromDifficulty } from "@/engines/sequence";

interface SequenceDifficultySelectorProps {
  selectedDifficulty: number;
  onSelect: (difficulty: number) => void;
}

export default function SequenceDifficultySelector({
  selectedDifficulty,
  onSelect,
}: SequenceDifficultySelectorProps) {
  const difficulties = [
    { level: 1, label: "入门", desc: "2格起步" },
    { level: 3, label: "简单", desc: "2格起步" },
    { level: 5, label: "中等", desc: "3格起步" },
    { level: 7, label: "困难", desc: "3格倒序" },
    { level: 9, label: "专家", desc: "4格倒序" },
  ];

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-600 mb-3">选择难度</h3>
      <div className="grid grid-cols-5 gap-2">
        {difficulties.map(({ level, label }) => {
          const isSelected = selectedDifficulty === level;
          const config = getSequenceConfigFromDifficulty(level);
          
          return (
            <button
              key={level}
              onClick={() => onSelect(level)}
              className={`p-3 rounded-xl text-center transition-all ${
                isSelected
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="text-sm font-semibold">{label}</div>
              <div className={`text-xs mt-1 ${isSelected ? "text-indigo-100" : "text-gray-500"}`}>
                {config.isReverse ? "倒序" : "正序"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
