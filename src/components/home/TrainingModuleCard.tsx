"use client";

import Link from "next/link";

export interface TrainingModule {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

interface TrainingModuleCardProps {
  module: TrainingModule;
  index?: number;
}

// 液态玻璃颜色映射
const glassColorMap: Record<string, string> = {
  "bg-blue-100 text-blue-600": "from-blue-500/20 to-blue-600/10 text-blue-600",
  "bg-purple-100 text-purple-600": "from-purple-500/20 to-purple-600/10 text-purple-600",
  "bg-green-100 text-green-600": "from-green-500/20 to-green-600/10 text-green-600",
  "bg-yellow-100 text-yellow-600": "from-yellow-500/20 to-yellow-600/10 text-yellow-600",
  "bg-red-100 text-red-600": "from-red-500/20 to-red-600/10 text-red-600",
  "bg-indigo-100 text-indigo-600": "from-indigo-500/20 to-indigo-600/10 text-indigo-600",
  "bg-teal-100 text-teal-600": "from-teal-500/20 to-teal-600/10 text-teal-600",
};

export default function TrainingModuleCard({ module, index = 0 }: TrainingModuleCardProps) {
  const glassColor = glassColorMap[module.color] || module.color;
  
  return (
    <Link
      href={module.href}
      className="card flex items-center gap-4 hover:bg-white/30 transition-all duration-300 touch-manipulation active:scale-[0.98] animate-fade-in-up group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${glassColor} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        {module.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 truncate">{module.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{module.description}</p>
      </div>
      <svg
        className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </Link>
  );
}
