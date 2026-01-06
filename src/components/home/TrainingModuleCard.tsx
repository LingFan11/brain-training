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

export default function TrainingModuleCard({ module, index = 0 }: TrainingModuleCardProps) {
  return (
    <Link
      href={module.href}
      className="card flex items-center gap-4 hover:shadow-md transition-all duration-200 touch-manipulation active:scale-[0.98] animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center ${module.color} transition-transform duration-200 group-hover:scale-110`}
      >
        {module.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{module.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{module.description}</p>
      </div>
      <svg
        className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200"
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
