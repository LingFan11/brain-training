"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type BilateralPattern, type BilateralTarget } from "@/engines/bilateral";

interface BilateralDisplayProps {
  pattern: BilateralPattern | null;
  timeLimit: number;
  onTouch: (leftTouched: boolean, rightTouched: boolean) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  feedbackCorrect?: boolean | null;
}

interface TouchState {
  left: boolean;
  right: boolean;
}

export default function BilateralDisplay({
  pattern,
  timeLimit,
  onTouch,
  disabled = false,
  showFeedback = false,
  feedbackCorrect = null,
}: BilateralDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchState, setTouchState] = useState<TouchState>({ left: false, right: false });
  const [remainingTime, setRemainingTime] = useState(timeLimit);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // 重置计时器
  useEffect(() => {
    if (pattern && !disabled && !showFeedback) {
      setRemainingTime(timeLimit);
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          const remaining = Math.max(0, timeLimit - elapsed);
          setRemainingTime(remaining);
        }
      }, 50);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [pattern, timeLimit, disabled, showFeedback]);

  // 重置触摸状态
  useEffect(() => {
    if (pattern) {
      setTouchState({ left: false, right: false });
    }
  }, [pattern]);

  // 处理触摸开始
  const handleTouchStart = useCallback((side: "left" | "right") => {
    if (disabled || showFeedback) return;

    setTouchState(prev => {
      const newState = { ...prev, [side]: true };
      
      // 如果两边都被触摸，触发回调
      if (newState.left && newState.right) {
        setTimeout(() => {
          onTouch(true, true);
        }, 0);
      }
      
      return newState;
    });
  }, [disabled, showFeedback, onTouch]);

  // 处理触摸结束
  const handleTouchEnd = useCallback((side: "left" | "right") => {
    if (disabled || showFeedback) return;

    setTouchState(prev => ({ ...prev, [side]: false }));
  }, [disabled, showFeedback]);

  // 计算目标位置样式
  const getTargetStyle = (target: BilateralTarget, side: "left" | "right") => {
    // 将0-1的相对坐标转换为百分比
    // 左侧区域：0-50%，右侧区域：50-100%
    const baseX = side === "left" ? 0 : 50;
    const x = baseX + target.x * 50;
    const y = target.y * 100;

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)",
    };
  };

  // 获取目标颜色
  const getTargetColor = (side: "left" | "right") => {
    if (showFeedback) {
      if (feedbackCorrect === true) {
        return "bg-green-500 border-green-600";
      } else if (feedbackCorrect === false) {
        return "bg-red-500 border-red-600";
      }
    }
    
    if (touchState[side]) {
      return "bg-purple-600 border-purple-700 scale-110";
    }
    
    return side === "left" 
      ? "bg-blue-500 border-blue-600" 
      : "bg-orange-500 border-orange-600";
  };

  // 计算进度条颜色
  const getProgressColor = () => {
    const ratio = remainingTime / timeLimit;
    if (ratio > 0.5) return "bg-green-500";
    if (ratio > 0.25) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (!pattern) {
    return (
      <div className="w-full aspect-[2/1] bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-500">准备中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 时间进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-100 ${getProgressColor()}`}
          style={{ width: `${(remainingTime / timeLimit) * 100}%` }}
        />
      </div>

      {/* 双侧触摸区域 */}
      <div
        ref={containerRef}
        className="w-full aspect-[2/1] bg-gray-50 rounded-xl relative overflow-hidden border-2 border-gray-200"
      >
        {/* 中线 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300" />

        {/* 左侧标签 */}
        <div className="absolute top-2 left-4 text-xs text-gray-400 font-medium">
          左手
        </div>

        {/* 右侧标签 */}
        <div className="absolute top-2 right-4 text-xs text-gray-400 font-medium">
          右手
        </div>

        {/* 左侧目标 */}
        <button
          className={`
            absolute w-16 h-16 rounded-full border-4 
            transition-all duration-150 touch-manipulation
            flex items-center justify-center
            ${getTargetColor("left")}
            ${disabled ? "opacity-50" : ""}
          `}
          style={getTargetStyle(pattern.leftTarget, "left")}
          onTouchStart={() => handleTouchStart("left")}
          onTouchEnd={() => handleTouchEnd("left")}
          onMouseDown={() => handleTouchStart("left")}
          onMouseUp={() => handleTouchEnd("left")}
          onMouseLeave={() => handleTouchEnd("left")}
          disabled={disabled || showFeedback}
        >
          <span className="text-white font-bold text-lg">L</span>
        </button>

        {/* 右侧目标 */}
        <button
          className={`
            absolute w-16 h-16 rounded-full border-4 
            transition-all duration-150 touch-manipulation
            flex items-center justify-center
            ${getTargetColor("right")}
            ${disabled ? "opacity-50" : ""}
          `}
          style={getTargetStyle(pattern.rightTarget, "right")}
          onTouchStart={() => handleTouchStart("right")}
          onTouchEnd={() => handleTouchEnd("right")}
          onMouseDown={() => handleTouchStart("right")}
          onMouseUp={() => handleTouchEnd("right")}
          onMouseLeave={() => handleTouchEnd("right")}
          disabled={disabled || showFeedback}
        >
          <span className="text-white font-bold text-lg">R</span>
        </button>

        {/* 镜像指示 */}
        {pattern.isMirror && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
            <span className="text-xs text-purple-500 font-medium bg-purple-50 px-2 py-1 rounded">
              镜像模式
            </span>
          </div>
        )}
      </div>

      {/* 提示文字 */}
      <p className="text-center text-sm text-gray-500">
        同时触摸左右两个目标
      </p>
    </div>
  );
}
