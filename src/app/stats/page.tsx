"use client";

import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout";
import { AIRecommendation } from "@/components/ai";
import { getStats, getRecords, type TrainingStats } from "@/services/storage";
import type { TrainingRecord, TrainingModuleType } from "@/lib/database.types";

const MODULE_NAMES: Record<string, string> = {
  schulte: "舒尔特表",
  stroop: "Stroop训练",
  sequence: "序列记忆",
  auditory: "听觉注意",
  bilateral: "双侧协调",
  classification: "规则分类",
  scene: "情景记忆",
};

const MODULE_COLORS: Record<string, string> = {
  schulte: "bg-blue-500",
  stroop: "bg-red-500",
  sequence: "bg-indigo-500",
  auditory: "bg-teal-500",
  bilateral: "bg-purple-500",
  classification: "bg-orange-500",
  scene: "bg-pink-500",
};

const MODULE_LIGHT_COLORS: Record<string, string> = {
  schulte: "bg-blue-100",
  stroop: "bg-red-100",
  sequence: "bg-indigo-100",
  auditory: "bg-teal-100",
  bilateral: "bg-purple-100",
  classification: "bg-orange-100",
  scene: "bg-pink-100",
};

// 连续训练天数显示组件
function StreakDisplay({ streakDays }: { streakDays: number }) {
  const getStreakEmoji = (days: number) => {
    if (days >= 30) return "🏆";
    if (days >= 14) return "🔥";
    if (days >= 7) return "⭐";
    if (days >= 3) return "💪";
    return "🌱";
  };

  const getStreakMessage = (days: number) => {
    if (days >= 30) return "太棒了！坚持一个月！";
    if (days >= 14) return "两周连续训练！";
    if (days >= 7) return "一周连续训练！";
    if (days >= 3) return "保持势头！";
    if (days >= 1) return "继续加油！";
    return "开始你的训练之旅";
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getStreakEmoji(streakDays)}</span>
            <span className="text-3xl font-bold text-orange-600">{streakDays}</span>
            <span className="text-sm text-gray-600">天连续训练</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{getStreakMessage(streakDays)}</p>
        </div>
        <div className="flex gap-1">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-8 rounded-full ${
                i < Math.min(streakDays, 7) ? "bg-orange-400" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// 简单柱状图组件
function SimpleBarChart({ 
  data, 
  maxValue,
  color 
}: { 
  data: { label: string; value: number }[];
  maxValue: number;
  color: string;
}) {
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center">
          <div 
            className={`w-full ${color} rounded-t transition-all duration-300`}
            style={{ 
              height: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
              minHeight: item.value > 0 ? '4px' : '0'
            }}
          />
          <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// 模块详情卡片组件
function ModuleDetailCard({
  moduleType,
  moduleStats,
  records,
  isExpanded,
  onToggle,
}: {
  moduleType: string;
  moduleStats: { sessions: number; avgScore: number; avgAccuracy: number; bestScore: number; trend: string };
  records: TrainingRecord[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // 获取最近7次训练的分数用于图表
  const recentScores = records.slice(0, 7).reverse().map((r, i) => ({
    label: `${i + 1}`,
    value: r.score,
  }));

  const maxScore = Math.max(...records.map(r => r.score), 100);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* 模块头部 */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${MODULE_LIGHT_COLORS[moduleType]} flex items-center justify-center`}>
            <div className={`w-4 h-4 rounded-full ${MODULE_COLORS[moduleType]}`} />
          </div>
          <div className="text-left">
            <span className="font-medium text-gray-800">{MODULE_NAMES[moduleType]}</span>
            <p className="text-xs text-gray-500">{moduleStats.sessions} 次训练</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            moduleStats.trend === "improving" ? "bg-green-100 text-green-600" :
            moduleStats.trend === "declining" ? "bg-red-100 text-red-600" :
            "bg-gray-100 text-gray-600"
          }`}>
            {moduleStats.trend === "improving" ? "↑ 进步中" :
             moduleStats.trend === "declining" ? "↓ 需加强" : "→ 稳定"}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* 展开的详情 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* 统计数据 */}
          <div className="grid grid-cols-4 gap-2 py-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">{moduleStats.avgScore}</p>
              <p className="text-xs text-gray-500">平均分</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">{moduleStats.bestScore}</p>
              <p className="text-xs text-gray-500">最高分</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">
                {Math.round(moduleStats.avgAccuracy * 100)}%
              </p>
              <p className="text-xs text-gray-500">准确率</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">
                {records.length > 0 ? Math.round(records.reduce((sum, r) => sum + r.duration, 0) / records.length) : 0}s
              </p>
              <p className="text-xs text-gray-500">平均时长</p>
            </div>
          </div>

          {/* 分数趋势图 */}
          {recentScores.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">最近训练分数趋势</p>
              <SimpleBarChart 
                data={recentScores} 
                maxValue={maxScore}
                color={MODULE_COLORS[moduleType]}
              />
            </div>
          )}

          {/* 最近训练记录 */}
          <div>
            <p className="text-xs text-gray-500 mb-2">最近训练记录</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {records.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">
                      {new Date(record.created_at).toLocaleDateString("zh-CN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">难度 {record.difficulty}</span>
                    <span className="font-medium text-gray-800">{record.score} 分</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      record.accuracy >= 0.8 ? "bg-green-100 text-green-600" :
                      record.accuracy >= 0.6 ? "bg-yellow-100 text-yellow-600" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {Math.round(record.accuracy * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 总体统计卡片组件
function OverallStatsCard({ stats }: { stats: TrainingStats }) {
  // 计算各模块训练次数分布
  const moduleDistribution = Object.entries(stats.moduleStats)
    .filter(([, s]) => s.sessions > 0)
    .map(([type, s]) => ({
      label: MODULE_NAMES[type].slice(0, 2),
      value: s.sessions,
    }));

  const maxSessions = Math.max(...moduleDistribution.map(d => d.value), 1);

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-600 mb-4">总体统计</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-xl">
          <p className="text-2xl font-bold text-blue-600">{stats.totalSessions}</p>
          <p className="text-xs text-gray-500">总训练次数</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-xl">
          <p className="text-2xl font-bold text-green-600">
            {Object.values(stats.moduleStats).filter(s => s.sessions > 0).length}
          </p>
          <p className="text-xs text-gray-500">已训练模块</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-xl">
          <p className="text-2xl font-bold text-purple-600">
            {Math.round(stats.totalDuration / 60)}
          </p>
          <p className="text-xs text-gray-500">总时长(分钟)</p>
        </div>
      </div>

      {/* 模块训练分布 */}
      {moduleDistribution.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">模块训练分布</p>
          <SimpleBarChart 
            data={moduleDistribution} 
            maxValue={maxSessions}
            color="bg-blue-400"
          />
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, recordsData] = await Promise.all([
          getStats(),
          getRecords(),
        ]);
        setStats(statsData);
        setRecords(recordsData);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <PageLayout title="训练统计">
        <div className="space-y-4">
          <div className="card text-center py-8">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <PageLayout title="训练统计">
        <div className="space-y-4">
          <div className="card text-center py-8">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-500">暂无训练记录</p>
            <p className="text-sm text-gray-400 mt-1">完成训练后将在此显示统计数据</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const activeModules = Object.entries(stats.moduleStats).filter(
    ([, moduleStats]) => moduleStats.sessions > 0
  );

  // 按模块类型分组记录
  const recordsByModule = records.reduce((acc, record) => {
    const type = record.module_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(record);
    return acc;
  }, {} as Record<TrainingModuleType, TrainingRecord[]>);

  return (
    <PageLayout title="训练统计">
      <div className="space-y-4">
        {/* 连续训练天数 */}
        <StreakDisplay streakDays={stats.streakDays} />

        {/* 总体统计 */}
        <OverallStatsCard stats={stats} />

        {/* AI 建议 */}
        <AIRecommendation stats={stats} />

        {/* 各模块详细统计 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-600">模块详情</h3>
          {activeModules.map(([moduleType, moduleStats]) => (
            <ModuleDetailCard
              key={moduleType}
              moduleType={moduleType}
              moduleStats={moduleStats}
              records={recordsByModule[moduleType as TrainingModuleType] || []}
              isExpanded={expandedModule === moduleType}
              onToggle={() => setExpandedModule(
                expandedModule === moduleType ? null : moduleType
              )}
            />
          ))}
        </div>

        {/* 未训练模块提示 */}
        {activeModules.length < 7 && (
          <div className="card bg-gradient-to-r from-gray-50 to-slate-50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  还有 {7 - activeModules.length} 个模块等待探索
                </p>
                <p className="text-xs text-gray-500">
                  尝试更多训练类型可以全面提升认知能力
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
