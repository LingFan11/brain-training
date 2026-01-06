"use client";

interface ResponseButtonProps {
  onRespond: () => void;
  disabled: boolean;
  isPressed: boolean;
}

export default function ResponseButton({
  onRespond,
  disabled,
  isPressed,
}: ResponseButtonProps) {
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onRespond}
        disabled={disabled}
        className={`
          w-40 h-40 rounded-full
          flex items-center justify-center
          text-white text-xl font-bold
          transition-all duration-150
          touch-manipulation
          ${disabled 
            ? "bg-gray-300 cursor-not-allowed" 
            : isPressed
              ? "bg-teal-700 scale-95"
              : "bg-teal-500 hover:bg-teal-600 active:bg-teal-700 active:scale-95"
          }
          shadow-lg
        `}
      >
        <div className="flex flex-col items-center">
          <svg 
            className="w-12 h-12 mb-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          </svg>
          <span>听到了！</span>
        </div>
      </button>
      <p className="mt-4 text-sm text-gray-500">
        听到目标声音时点击
      </p>
    </div>
  );
}
