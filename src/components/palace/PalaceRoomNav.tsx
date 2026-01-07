"use client";

import { type Room } from "@/engines/palace";

interface PalaceRoomNavProps {
  rooms: Room[];
  currentIndex: number;
  onRoomSelect?: (index: number) => void;
  mode: "study" | "test";
  completedRooms?: Set<number>;
}

export default function PalaceRoomNav({
  rooms,
  currentIndex,
  onRoomSelect,
  mode,
  completedRooms = new Set(),
}: PalaceRoomNavProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">
          {mode === "study" ? "记忆路线" : "放置进度"}
        </h3>
        <span className="text-xs text-gray-400">
          {currentIndex + 1} / {rooms.length}
        </span>
      </div>
      
      {/* 走廊连接线 */}
      <div className="relative flex items-center justify-between py-4">
        {/* 连接线 */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 rounded-full" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-purple-400 -translate-y-1/2 rounded-full transition-all duration-500"
          style={{ width: `${(currentIndex / Math.max(1, rooms.length - 1)) * 100}%` }}
        />
        
        {/* 房间节点 */}
        {rooms.map((room, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          const isCompleted = completedRooms.has(index);
          const canClick = mode === "test" && index <= currentIndex;
          
          return (
            <div
              key={room.id}
              className={`relative z-10 flex flex-col items-center ${canClick ? "cursor-pointer" : ""}`}
              onClick={() => canClick && onRoomSelect?.(index)}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? "bg-purple-500 text-white shadow-lg scale-110"
                    : isPast || isCompleted
                    ? "bg-purple-200 text-purple-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <span className="text-lg">{room.icon}</span>
              </div>
              <span
                className={`text-xs mt-1 ${
                  isCurrent ? "text-purple-600 font-medium" : "text-gray-400"
                }`}
              >
                {room.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
