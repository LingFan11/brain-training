"use client";

import { type SceneElement, ELEMENT_NAME_MAP } from "@/engines/scene";

interface SceneDisplayProps {
  elements: SceneElement[];
  showElements: boolean;
  highlightedElementId?: string | null;
}

// 元素图标映射（使用 emoji 作为简单实现）
const ELEMENT_ICON_MAP: Record<string, string> = {
  apple: "🍎",
  banana: "🍌",
  book: "📖",
  cup: "☕",
  key: "🔑",
  phone: "📱",
  clock: "⏰",
  lamp: "💡",
  chair: "🪑",
  ball: "⚽",
  hat: "🎩",
  shoe: "👟",
  pen: "🖊️",
  flower: "🌸",
  star: "⭐",
  heart: "❤️",
};

export default function SceneDisplay({
  elements,
  showElements,
  highlightedElementId = null,
}: SceneDisplayProps) {
  return (
    <div className="card">
      <div 
        className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl overflow-hidden"
        style={{ height: "320px" }}
      >
        {/* 场景背景网格 */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-6 grid-rows-6 h-full">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="border border-gray-400" />
            ))}
          </div>
        </div>

        {/* 场景元素 */}
        {showElements && elements.map((element) => {
          const icon = ELEMENT_ICON_MAP[element.type] || "❓";
          const isHighlighted = highlightedElementId === element.id;
          
          return (
            <div
              key={element.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                isHighlighted ? "scale-125 z-10" : ""
              }`}
              style={{
                left: `${element.position.x * 100}%`,
                top: `${element.position.y * 100}%`,
              }}
            >
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md ${
                  isHighlighted ? "ring-4 ring-purple-400" : ""
                }`}
              >
                <span className="text-2xl">{icon}</span>
              </div>
            </div>
          );
        })}

        {/* 空场景提示 */}
        {!showElements && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl mb-2 block">🧠</span>
              <p className="text-gray-500 text-sm">回忆场景中的物品...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
