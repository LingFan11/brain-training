"use client";

import { type Card } from "@/engines/soundMatch";
import SoundCard from "./SoundCard";

interface SoundMatchBoardProps {
  cards: Card[];
  playingCardId: string | null;
  onCardClick: (cardId: string) => void;
  disabled: boolean;
}

export default function SoundMatchBoard({
  cards,
  playingCardId,
  onCardClick,
  disabled,
}: SoundMatchBoardProps) {
  // 根据卡片数量决定列数
  const getGridCols = () => {
    const count = cards.length;
    if (count <= 8) return "grid-cols-4";
    if (count <= 12) return "grid-cols-4";
    if (count <= 16) return "grid-cols-4";
    return "grid-cols-5";
  };

  return (
    <div className={`grid ${getGridCols()} gap-3`}>
      {cards.map((card) => (
        <SoundCard
          key={card.id}
          id={card.id}
          state={card.state}
          isPlaying={playingCardId === card.id}
          onClick={() => onCardClick(card.id)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
