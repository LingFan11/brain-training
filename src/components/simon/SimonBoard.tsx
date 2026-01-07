"use client";

import { type SimonSound, type SoundId, playTone } from "@/engines/simon";

interface SimonBoardProps {
  sounds: SimonSound[];
  activeSound: SoundId | null;
  onSoundClick: (soundId: SoundId) => void;
  disabled: boolean;
  mode: "watch" | "repeat";
}

export default function SimonBoard({
  sounds,
  activeSound,
  onSoundClick,
  disabled,
  mode,
}: SimonBoardProps) {
  // 根据声音数量决定布局
  const getGridClass = () => {
    switch (sounds.length) {
      case 3: return "grid-cols-3";
      case 4: return "grid-cols-2";
      case 5: return "grid-cols-3";
      case 6: return "grid-cols-3";
      default: return "grid-cols-2";
    }
  };

  // 颜色映射
  const colorMap: Record<string, { bg: string; active: string; border: string }> = {
    dog: { bg: "bg-red-100", active: "bg-red-500", border: "border-red-300" },
    cat: { bg: "bg-blue-100", active: "bg-blue-500", border: "border-blue-300" },
    bird: { bg: "bg-green-100", active: "bg-green-500", border: "border-green-300" },
    cow: { bg: "bg-yellow-100", active: "bg-yellow-500", border: "border-yellow-300" },
    frog: { bg: "bg-purple-100", active: "bg-purple-500", border: "border-purple-300" },
    lion: { bg: "bg-orange-100", active: "bg-orange-500", border: "border-orange-300" },
  };

  const handleClick = async (sound: SimonSound) => {
    if (disabled || mode === "watch") return;
    
    // 播放声音
    playTone(sound.freq, 200);
    onSoundClick(sound.id);
  };

  return (
    <div className={`grid ${getGridClass()} gap-4 max-w-sm mx-auto`}>
      {sounds.map((sound) => {
        const isActive = activeSound === sound.id;
        const colors = colorMap[sound.id] || { bg: "bg-gray-100", active: "bg-gray-500", border: "border-gray-300" };
        
        return (
          <button
            key={sound.id}
            onClick={() => handleClick(sound)}
            disabled={disabled || mode === "watch"}
            className={`
              aspect-square rounded-2xl border-4 transition-all duration-150
              flex flex-col items-center justify-center gap-2
              ${isActive 
                ? `${colors.active} text-white scale-95 shadow-lg` 
                : `${colors.bg} ${colors.border} hover:scale-105`
              }
              ${disabled || mode === "watch" ? "cursor-not-allowed opacity-70" : "cursor-pointer active:scale-90"}
            `}
          >
            <span className={`text-4xl ${isActive ? "animate-bounce" : ""}`}>
              {sound.icon}
            </span>
            <span className={`text-sm font-medium ${isActive ? "text-white" : "text-gray-600"}`}>
              {sound.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
