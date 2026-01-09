"use client";

import { useState, useEffect, useRef } from "react";

interface TimerProps {
  isRunning: boolean;
  onTimeUpdate?: (time: number) => void;
  className?: string;
}

export default function Timer({ isRunning, onTimeUpdate, className = "" }: TimerProps) {
  const [time, setTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - time * 1000;
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
        setTime(elapsed);
        onTimeUpdate?.(elapsed);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onTimeUpdate]);

  // 重置计时器
  useEffect(() => {
    if (!isRunning && time === 0) {
      startTimeRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);

    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
    }
    return `${secs}.${ms}秒`;
  };

  return (
    <div className={`text-center ${className}`}>
      <span className="text-sm text-gray-500">用时</span>
      <p className="text-2xl font-mono font-bold text-blue-600">{formatTime(time)}</p>
    </div>
  );
}

// 导出重置函数的hook
export function useTimer() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const start = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now();
      setIsRunning(true);
    }
  };

  const stop = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const reset = () => {
    stop();
    setTime(0);
    startTimeRef.current = null;
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
        setTime(elapsed);
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  return { time, isRunning, start, stop, reset };
}
