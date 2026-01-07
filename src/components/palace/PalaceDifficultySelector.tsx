"use client";

import { getPalaceConfigFromDifficulty } from "@/engines/palace";

interface PalaceDifficultySelectorProps {
  selectedDifficulty: number;
  onSelect: (difficulty: number) => void;
}

export default function PalaceDifficultySelector({
  selectedDifficulty,
  onSelect,
}: PalaceDifficultySelectorProps) {
  const difficulties = [
    { level: 1, label: "入门", desc: "1房间·2物品" },
    { level: 3, label: "简单", desc: "1房间·3物品" },
    { level: 5, label: "中等", desc: "2房间·4物品" },
    { level: 7, label: "困难", desc: "3房间·5物品" },
    { level: 9, label: "专家", desc: "4房间·5物品" },
  ];

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
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-purple-300"
              }`}
            >
              <div className={`text-lg font-bold ${isSelected ? "text-purple-600" : "text-gray-700"}`}>
                {d.level}
              </div>
              <div className={`text-xs ${isSelected ? "text-purple-500" : "text-gray-500"}`}>
                {d.label}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* 配置预览 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-xl">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {(() => {
            const config = getPalaceConfigFromDifficulty(selectedDifficulty);
            return (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">房间数</span>
                  <span className="font-medium">{config.roomCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">每房间物品</span>
                  <span className="font-medium">{config.itemsPerRoom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">记忆时间</span>
                  <span className="font-medium">{config.studyTimePerRoom}秒/房间</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">干扰物品</span>
                  <span className="font-medium">{config.distractorCount}个</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
