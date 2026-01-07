"use client";

import { type Room, type Anchor, type Placement, type PalaceItem } from "@/engines/palace";

interface PalaceRoomProps {
  room: Room;
  placements: Placement[];          // 显示的物品放置
  items: Map<string, PalaceItem>;   // itemId -> item 映射
  mode: "study" | "test";
  onAnchorClick?: (anchor: Anchor) => void;
  onAnchorDrop?: (anchor: Anchor, itemId: string) => void;
  selectedAnchorId?: string | null;
  highlightAnchors?: boolean;
}

export default function PalaceRoom({
  room,
  placements,
  items,
  mode,
  onAnchorClick,
  onAnchorDrop,
  selectedAnchorId,
  highlightAnchors = false,
}: PalaceRoomProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, anchor: Anchor) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    if (itemId && onAnchorDrop) {
      onAnchorDrop(anchor, itemId);
    }
  };

  const getItemForAnchor = (anchorId: string): PalaceItem | null => {
    const placement = placements.find(p => p.anchorId === anchorId);
    if (!placement) return null;
    return items.get(placement.itemId) || null;
  };

  return (
    <div className={`relative w-full aspect-[4/3] rounded-2xl bg-gradient-to-br ${room.bgColor} border-2 border-gray-200 overflow-hidden`}>
      {/* 房间名称 */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
        <span className="text-lg">{room.icon}</span>
        <span className="text-sm font-medium text-gray-700">{room.name}</span>
      </div>

      {/* 锚点 */}
      {room.anchors.map((anchor) => {
        const item = getItemForAnchor(anchor.id);
        const isSelected = selectedAnchorId === anchor.id;
        const showHighlight = highlightAnchors && mode === "test" && !item;

        return (
          <div
            key={anchor.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
              mode === "test" ? "cursor-pointer" : ""
            }`}
            style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
            onClick={() => mode === "test" && onAnchorClick?.(anchor)}
            onDragOver={mode === "test" ? handleDragOver : undefined}
            onDrop={mode === "test" ? (e) => handleDrop(e, anchor) : undefined}
          >
            {/* 锚点容器 */}
            <div
              className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-200 ${
                item
                  ? "bg-white shadow-md border-2 border-gray-200"
                  : mode === "test"
                  ? `border-2 border-dashed ${showHighlight ? "border-purple-400 bg-purple-50/50" : "border-gray-300 bg-white/50"} ${isSelected ? "border-purple-500 bg-purple-100/50 scale-110" : ""}`
                  : "bg-white/30"
              }`}
            >
              {item ? (
                // 显示物品
                <span className="text-2xl">{item.icon}</span>
              ) : (
                // 显示锚点图标
                <span className={`text-xl ${mode === "test" ? "opacity-40" : "opacity-60"}`}>
                  {anchor.icon}
                </span>
              )}
            </div>
            
            {/* 锚点名称 */}
            <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <span className={`text-xs ${item ? "text-gray-600" : "text-gray-400"}`}>
                {anchor.name}
              </span>
            </div>
          </div>
        );
      })}

      {/* 模式指示 */}
      {mode === "study" && (
        <div className="absolute bottom-3 right-3 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
          记忆中...
        </div>
      )}
    </div>
  );
}
