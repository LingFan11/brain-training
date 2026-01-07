"use client";

import { type PalaceItem } from "@/engines/palace";

interface PalaceItemTrayProps {
  items: PalaceItem[];
  onItemSelect?: (item: PalaceItem) => void;
  selectedItemId?: string | null;
  disabled?: boolean;
}

export default function PalaceItemTray({
  items,
  onItemSelect,
  selectedItemId,
  disabled = false,
}: PalaceItemTrayProps) {
  const handleDragStart = (e: React.DragEvent, item: PalaceItem) => {
    if (disabled) return;
    e.dataTransfer.setData("itemId", item.id);
    e.dataTransfer.effectAllowed = "move";
  };

  if (items.length === 0) {
    return (
      <div className="card bg-gray-50 border-dashed border-2 border-gray-200">
        <p className="text-center text-gray-400 text-sm py-4">
          所有物品已放置完毕 ✓
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-600">待放置物品</h3>
        <span className="text-xs text-gray-400">{items.length} 个</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isSelected = selectedItemId === item.id;
          
          return (
            <div
              key={item.id}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => !disabled && onItemSelect?.(item)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all cursor-pointer select-none ${
                disabled
                  ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                  : isSelected
                  ? "border-purple-500 bg-purple-50 shadow-md scale-105"
                  : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50 active:scale-95"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-gray-400 mt-3 text-center">
        点击选择物品，再点击房间中的位置放置 · 或直接拖拽
      </p>
    </div>
  );
}
