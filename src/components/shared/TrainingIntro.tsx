"use client";

import { useState } from "react";

interface TrainingIntroProps {
  title: string;
  description: string;
  benefits: string[];
  tips?: string[];
  referenceData?: {
    title: string;
    items: { label: string; value: string }[];
  }[];
}

export default function TrainingIntro({
  title,
  description,
  benefits,
  tips,
  referenceData,
}: TrainingIntroProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-indigo-600 text-sm hover:text-indigo-700 transition-colors font-medium"
        >
          {expanded ? "收起" : "详细介绍"}
        </button>
      </div>
      
      <p className="text-gray-700 text-sm leading-relaxed mb-3">{description}</p>

      {expanded && (
        <div className="space-y-4 mt-4 pt-4 border-t border-white/30">
          {/* 训练益处 */}
          <div>
            <h3 className="text-sm font-medium text-gray-800 mb-2">🎠 训练益处</h3>
            <ul className="space-y-1">
              {benefits.map((benefit, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="text-emerald-500 mr-2">◈</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* 参考数据 */}
          {referenceData && referenceData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-2">🧿 参考标准</h3>
              {referenceData.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">{section.title}</p>
                  <div 
                    className="rounded-xl p-3 space-y-1"
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  >
                    {section.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex justify-between text-xs">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium text-gray-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 训练技巧 */}
          {tips && tips.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-2">🪬 训练技巧</h3>
              <ul className="space-y-1">
                {tips.map((tip, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-amber-500 mr-2">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
