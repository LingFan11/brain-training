"use client";

interface ClassificationButtonsProps {
  onSelect: (matches: boolean) => void;
  disabled?: boolean;
  lastSelected?: boolean | null;
  lastCorrect?: boolean | null;
}

export default function ClassificationButtons({
  onSelect,
  disabled = false,
  lastSelected = null,
  lastCorrect = null,
}: ClassificationButtonsProps) {
  const getButtonStyle = (isYes: boolean) => {
    const baseColor = isYes ? "#22c55e" : "#ef4444";
    
    // 刚刚选择的按钮
    if (lastSelected === isYes && lastCorrect !== null) {
      if (lastCorrect) {
        return {
          backgroundColor: baseColor,
          borderColor: baseColor,
          color: "white",
          transform: "scale(0.95)",
        };
      } else {
        return {
          backgroundColor: "#fee2e2",
          borderColor: "#ef4444",
          color: "#ef4444",
        };
      }
    }
    
    // 默认样式
    return {
      backgroundColor: "white",
      borderColor: baseColor,
      color: baseColor,
    };
  };

  return (
    <div className="w-full">
      <p className="text-sm text-gray-500 text-center mb-3">这个图形符合规则吗？</p>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect(true)}
          disabled={disabled}
          className={`
            py-5 px-6 rounded-xl border-3 font-bold text-2xl
            transition-all duration-150 touch-manipulation
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
          `}
          style={{
            backgroundColor: getButtonStyle(true).backgroundColor,
            borderColor: getButtonStyle(true).borderColor,
            borderWidth: "3px",
            color: getButtonStyle(true).color,
            transform: getButtonStyle(true).transform,
          }}
        >
          ◈ 符合
        </button>
        <button
          onClick={() => onSelect(false)}
          disabled={disabled}
          className={`
            py-5 px-6 rounded-xl border-3 font-bold text-2xl
            transition-all duration-150 touch-manipulation
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
          `}
          style={{
            backgroundColor: getButtonStyle(false).backgroundColor,
            borderColor: getButtonStyle(false).borderColor,
            borderWidth: "3px",
            color: getButtonStyle(false).color,
            transform: getButtonStyle(false).transform,
          }}
        >
          ◇ 不符合
        </button>
      </div>
    </div>
  );
}
