"use client";

import { useState, useEffect } from "react";
import type { TrainingStats } from "@/services/storage";
import { generateRecommendation } from "@/services/ai";

interface AIRecommendationProps {
  stats: TrainingStats;
}

export default function AIRecommendation({ stats }: AIRecommendationProps) {
  const [recommendation, setRecommendation] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchRecommendation() {
      try {
        const result = await generateRecommendation(stats);
        if (mounted) {
          setRecommendation(result);
        }
      } catch (error) {
        console.error("Failed to get AI recommendation:", error);
        if (mounted) {
          setRecommendation("建议均衡训练各个模块，全面提升认知能力。");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchRecommendation();

    return () => {
      mounted = false;
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🪄</span>
          <span className="text-sm font-medium text-gray-600">AI 训练建议</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="animate-pulse flex space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
          <span className="text-sm text-gray-500">正在生成建议...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🪄</span>
        <span className="text-sm font-medium text-gray-600">AI 训练建议</span>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed">{recommendation}</p>
    </div>
  );
}
