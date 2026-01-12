"use client";

import { useState, useEffect } from "react";
import { getRecords } from "@/services/storage";
import type { TrainingModuleType } from "@/lib/database.types";

interface LeaderboardProps {
  moduleType: TrainingModuleType;
  currentScore?: number;
  currentDuration?: number;
  currentDifficulty?: number;
}

interface LeaderboardEntry {
  rank: number;
  score: number;
  duration: number;
  accuracy: number;
  date: string;
  isCurrentSession: boolean;
}

export default function Leaderboard({
  moduleType,
  currentScore,
  currentDuration,
  currentDifficulty,
}: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "duration">("score");
  const [difficulty, setDifficulty] = useState<number | "all">("all");
  const [availableDifficulties, setAvailableDifficulties] = useState<number[]>([]);

  // 当有当前难度时，自动切换到该难度
  useEffect(() => {
    if (currentDifficulty !== undefined) {
      setDifficulty(currentDifficulty);
    }
  }, [currentDifficulty]);

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleType, sortBy, difficulty]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const records = await getRecords(moduleType, 500);
      
      // 提取所有可用的难度等级
      const difficulties = [...new Set(records.map(r => r.difficulty))].sort((a, b) => a - b);
      setAvailableDifficulties(difficulties);
      
      // 按难度筛选
      let filteredRecords = records;
      if (difficulty !== "all") {
        filteredRecords = records.filter(r => r.difficulty === difficulty);
      }
      
      // 根据排序方式排序
      const sorted = [...filteredRecords].sort((a, b) => {
        if (sortBy === "score") {
          return b.score - a.score;
        } else {
          return a.duration - b.duration;
        }
      });

      // 取前10名
      const top10 = sorted.slice(0, 10).map((record, index) => ({
        rank: index + 1,
        score: record.score,
        duration: record.duration,
        accuracy: record.accuracy,
        date: formatDate(record.created_at),
        isCurrentSession: false,
      }));

      // 如果有当前成绩，检查是否进入排行榜
      if (currentScore !== undefined && currentDuration !== undefined) {
        // 只有当难度匹配或显示全部时才显示当前成绩
        const shouldShowCurrent = difficulty === "all" || difficulty === currentDifficulty;
        
        if (shouldShowCurrent) {
          const currentEntry: LeaderboardEntry = {
            rank: 0,
            score: currentScore,
            duration: currentDuration,
            accuracy: 1,
            date: "刚刚",
            isCurrentSession: true,
          };

          // 计算当前成绩的排名
          let currentRank = 1;
          for (const entry of sorted) {
            if (sortBy === "score") {
              if (entry.score > currentScore) currentRank++;
            } else {
              if (entry.duration < currentDuration) currentRank++;
            }
          }
          currentEntry.rank = currentRank;

          // 如果当前成绩在前10名内，插入到正确位置
          if (currentRank <= 10) {
            const insertIndex = currentRank - 1;
            top10.splice(insertIndex, 0, currentEntry);
            // 重新计算排名
            top10.forEach((entry, index) => {
              if (!entry.isCurrentSession) {
                entry.rank = index + 1;
              }
            });
            // 保持只有10条
            if (top10.length > 10) {
              top10.pop();
            }
          }
        }
      }

      setEntries(top10);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "今天";
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays}天前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}秒`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}分${secs}秒`;
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-amber-500/20 text-amber-700 border-amber-400/30";
      case 2:
        return "bg-slate-400/20 text-slate-600 border-slate-400/30";
      case 3:
        return "bg-orange-500/20 text-orange-700 border-orange-400/30";
      default:
        return "glass text-gray-700";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🏅";
      case 2:
        return "🎖️";
      case 3:
        return "🔰";
      default:
        return rank.toString();
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
          <span className="ml-2 text-gray-600 text-sm">加载排行榜...</span>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-3">🎪 排行榜</h3>
        <p className="text-center text-gray-500 py-4 text-sm">暂无记录，快来创造第一个记录吧！</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">🎪 排行榜</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setSortBy("score")}
            className={`px-3 py-1 text-xs rounded-xl transition-all duration-200 ${
              sortBy === "score"
                ? "bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30"
                : "glass text-gray-600 hover:bg-white/30"
            }`}
            style={{
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            按分数
          </button>
          <button
            onClick={() => setSortBy("duration")}
            className={`px-3 py-1 text-xs rounded-xl transition-all duration-200 ${
              sortBy === "duration"
                ? "bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30"
                : "glass text-gray-600 hover:bg-white/30"
            }`}
            style={{
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            按用时
          </button>
        </div>
      </div>

      {/* 难度筛选 */}
      {availableDifficulties.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-3">
          <button
            onClick={() => setDifficulty("all")}
            className={`px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
              difficulty === "all"
                ? "bg-purple-500/80 text-white shadow-md"
                : "glass text-gray-600 hover:bg-white/30"
            }`}
          >
            全部
          </button>
          {availableDifficulties.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
                difficulty === d
                  ? "bg-purple-500/80 text-white shadow-md"
                  : "glass text-gray-600 hover:bg-white/30"
              }`}
            >
              难度{d}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={index}
            className={`flex items-center p-2 rounded-xl border transition-all ${
              entry.isCurrentSession
                ? "bg-indigo-500/20 border-indigo-400/40 ring-2 ring-indigo-400/30"
                : getRankStyle(entry.rank)
            }`}
            style={{
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <div className="w-8 text-center font-bold text-lg">
              {getRankIcon(entry.rank)}
            </div>
            <div className="flex-1 ml-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">
                  {entry.score}分
                  {entry.isCurrentSession && (
                    <span className="ml-1 text-xs text-indigo-600">(本次)</span>
                  )}
                </span>
                <span className="text-sm text-gray-600">
                  {formatDuration(entry.duration)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>准确率 {Math.round(entry.accuracy * 100)}%</span>
                <span>{entry.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
