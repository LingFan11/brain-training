"use client";

import { type CardState } from "@/engines/soundMatch";

interface SoundCardProps {
  id: string;
  state: CardState;
  isPlaying: boolean;
  onClick: () => void;
  disabled: boolean;
}

export default function SoundCard({
  state,
  isPlaying,
  onClick,
  disabled,
}: SoundCardProps) {
  const isHidden = state === "hidden";
  const isMatched = state === "matched";

  return (
    <button
      onClick={onClick}
      disabled={disabled || isMatched}
      className={`
        aspect-square rounded-2xl border-4 transition-all duration-300
        flex items-center justify-center
        ${isMatched 
          ? "bg-green-100 border-green-300 cursor-default" 
          : isHidden
          ? "bg-gradient-to-br from-purple-100 to-blue-100 border-purple-300 hover:border-purple-400 hover:scale-105 cursor-pointer active:scale-95"
          : "bg-white border-purple-500 shadow-lg"
        }
        ${isPlaying ? "animate-pulse ring-4 ring-purple-400" : ""}
        ${disabled && !isMatched ? "opacity-60 cursor-not-allowed" : ""}
      `}
    >
      {isHidden ? (
        <span className="text-4xl">❓</span>
      ) : isMatched ? (
        <span className="text-4xl">✅</span>
      ) : (
        <div className="flex flex-col items-center">
          <span className="text-3xl mb-1">🔊</span>
          {isPlaying && (
            <div className="flex gap-1">
              <span className="w-1 h-3 bg-purple-500 rounded animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-4 bg-purple-500 rounded animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-3 bg-purple-500 rounded animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      )}
    </button>
  );
}
