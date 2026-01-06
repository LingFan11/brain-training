"use client";

interface SequenceControlsProps {
  onMatch: () => void;
  onNoMatch: () => void;
  disabled?: boolean;
  canRespond: boolean;
}

export default function SequenceControls({
  onMatch,
  onNoMatch,
  disabled = false,
  canRespond,
}: SequenceControlsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={onNoMatch}
        disabled={disabled || !canRespond}
        className={`
          py-6 px-4 rounded-2xl border-2 transition-all duration-200
          touch-manipulation flex flex-col items-center justify-center
          ${disabled || !canRespond
            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 active:scale-95"
          }
        `}
      >
        <svg
          className="w-8 h-8 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span className="font-semibold text-lg">不匹配</span>
        <span className="text-xs mt-1 opacity-75">与N步前不同</span>
      </button>
      
      <button
        onClick={onMatch}
        disabled={disabled || !canRespond}
        className={`
          py-6 px-4 rounded-2xl border-2 transition-all duration-200
          touch-manipulation flex flex-col items-center justify-center
          ${disabled || !canRespond
            ? "border-indigo-200 bg-indigo-50 text-indigo-300 cursor-not-allowed"
            : "border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95"
          }
        `}
      >
        <svg
          className="w-8 h-8 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="font-semibold text-lg">匹配</span>
        <span className="text-xs mt-1 opacity-75">与N步前相同</span>
      </button>
    </div>
  );
}
