"use client";

import { getSimonConfigFromDifficulty } from "@/engines/simon";

interface SimonDifficultySelectorProps {
  selectedDifficulty: number;
  onSelect: (difficulty: number) => void;
}

export default function SimonDifficultySelector({
  selectedDifficulty,
  onSelect,
}: SimonDifficultySelectorProps) {
  const difficulties = [
    { level: 1, label: "入门" },
    { level: 3, label: "简单" },
    { level: 5, label: "中等" },
    { level: 7, label: "困难" },
    { level: 9, label: "专家" },
  ];

  const config = getSimonConfigFromDifficulty(selectedDifficulty);

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-600 mb-3">选择难度</h3>
      <div className="grid grid-cols-5 gap-2">
        {difficulties.map((d) => {
          const isSelected = selectedDifficulty === d.level;
          return (
            <button
              key={d.level}
              onClick={() => onSelect(d.level)}
              className={`p-3 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300"
              }`}
            >
              <div className={`text-lg font-bold ${isSelected ? "text-teal-600" : "text-gray-700"}`}>
                {d.level}
              </div>
              <div className={`text-xs ${isSelected ? "text-teal-500" : "text-gray-500"}`}>
                {d.label}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* 配置预览 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-xl">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">声音数量</span>
            <span className="font-medium">{config.soundCount}个</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">起始长度</span>
            <span className="font-medium">{config.startLength}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">播放速度</span>
            <span className="font-medium">{config.playSpeed}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">生命数</span>
            <span className="font-medium">{config.lives}❤️</span>
          </div>
        </div>
      </div>
    </div>
  );
}
