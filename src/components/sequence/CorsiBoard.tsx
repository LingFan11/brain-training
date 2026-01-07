"use client";

import { type BlockPosition } from "@/engines/sequence";

interface CorsiBoardProps {
  blocks: BlockPosition[];
  highlightedBlock: number | null;
  userInput: number[];
  onBlockTap: (blockId: number) => void;
  disabled: boolean;
  showFeedback: boolean;
  isCorrect: boolean | null;
}

export default function CorsiBoard({
  blocks,
  highlightedBlock,
  userInput,
  onBlockTap,
  disabled,
  showFeedback,
  isCorrect,
}: CorsiBoardProps) {
  return (
    <div 
      className="relative w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl"
      style={{ paddingBottom: "100%" }}
    >
      <div className="absolute inset-0 p-4">
        {blocks.map((block) => {
          const isHighlighted = highlightedBlock === block.id;
          const inputIndex = userInput.indexOf(block.id);
          const isSelected = inputIndex !== -1;
          
          let blockClass = "absolute w-12 h-12 rounded-xl transition-all duration-200 ";
          blockClass += "flex items-center justify-center font-bold text-lg ";
          blockClass += "shadow-md cursor-pointer select-none ";
          
          if (isHighlighted) {
            blockClass += "bg-yellow-400 scale-110 shadow-yellow-400/50 shadow-lg ";
          } else if (showFeedback && isSelected) {
            blockClass += isCorrect 
              ? "bg-green-500 text-white " 
              : "bg-red-500 text-white ";
          } else if (isSelected) {
            blockClass += "bg-indigo-500 text-white ";
          } else {
            blockClass += "bg-white hover:bg-indigo-50 text-slate-600 ";
          }
          
          if (disabled && !isHighlighted) {
            blockClass += "opacity-70 cursor-not-allowed ";
          }

          return (
            <button
              key={block.id}
              className={blockClass}
              style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => !disabled && onBlockTap(block.id)}
              disabled={disabled}
            >
              {isSelected && !showFeedback && (
                <span className="text-sm">{inputIndex + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
