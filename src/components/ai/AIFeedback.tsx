"use client";

import { useState, useEffect } from "react";
import type { TrainingRecord } from "@/lib/database.types";
import { generateFeedback } from "@/services/ai";

interface AIFeedbackProps {
  record: TrainingRecord;
}

export default function AIFeedback({ record }: AIFeedbackProps) {
  const [feedback, setFeedback] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchFeedback() {
      try {
        const result = await generateFeedback(record);
        if (mounted) {
          setFeedback(result);
        }
      } catch (error) {
        console.error("Failed to get AI feedback:", error);
        if (mounted) {
          setFeedback("继续加油，每次训练都是进步的机会！");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchFeedback();

    return () => {
      mounted = false;
    };
  }, [record]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🤖</span>
          <span className="text-sm font-medium text-gray-600">AI 助手</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="animate-pulse flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
          <span className="text-sm text-gray-500">正在分析...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🤖</span>
        <span className="text-sm font-medium text-gray-600">AI 助手</span>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed">{feedback}</p>
    </div>
  );
}
