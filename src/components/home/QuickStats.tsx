"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStats, TrainingStats } from "@/services/storage";

export default function QuickStats() {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex justify-around">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-12 bg-gray-200 rounded mx-auto mb-1" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="text-center py-2">
          <p className="text-gray-600 mb-2">开始你的第一次训练吧！</p>
          <p className="text-sm text-gray-500">选择下方任意模块开始</p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    return `${hours}小时${minutes % 60}分`;
  };

  return (
    <Link href="/stats" className="block">
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 hover:shadow-md transition-all duration-200 active:scale-[0.98]">
        <div className="flex justify-around items-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalSessions}
            </div>
            <div className="text-xs text-gray-500">训练次数</div>
          </div>
          <div className="w-px h-10 bg-blue-200" />
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.streakDays}
            </div>
            <div className="text-xs text-gray-500">连续天数</div>
          </div>
          <div className="w-px h-10 bg-blue-200" />
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatDuration(stats.totalDuration)}
            </div>
            <div className="text-xs text-gray-500">总时长</div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <span className="text-xs text-blue-500 flex items-center justify-center gap-1">
            查看详细统计
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
