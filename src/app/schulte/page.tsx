"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { SchulteGrid, DifficultySelector, SchulteResult } from "@/components/schulte";
import { TrainingIntro, Leaderboard, useTimer } from "@/components/shared";
import { SchulteEngine, type GridSize, type SchulteResult as SchulteResultType, getDifficultyFromGridSize } from "@/engines/schulte";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "playing" | "result";

// 舒尔特方格训练介绍数据
const SCHULTE_INTRO = {
  title: "训练说明",
  description: "按照从小到大的顺序（1, 2, 3...）依次点击数字。尽可能快速准确地完成，训练你的视觉搜索能力和注意力集中能力。",
  benefits: [
    "培养注意力集中、分配、控制能力",
    "拓展视幅，加快视频处理速度",
    "提高视觉的稳定性、辨别力、定向搜索能力",
    "锻炼眼睛快速认读，达到一目十行的效果",
    "心理咨询师常用的注意力训练方法",
  ],
  tips: [
    "练习开始达不到标准是正常的，切莫急躁",
    "建议从4×4格开始练起，熟练后再增加难度",
    "练习时间越长，完成所需时间会越短",
    "每个字符用1秒为优良标准（如25格用25秒）",
    "可以尝试用眼睛的余光来搜索数字",
  ],
  referenceData: [
    {
      title: "5×5格参考标准（7-12岁）",
      items: [
        { label: "优秀", value: "26秒以内" },
        { label: "中等", value: "42秒左右" },
        { label: "需加强", value: "50秒以上" },
      ],
    },
    {
      title: "5×5格参考标准（13-17岁）",
      items: [
        { label: "优良", value: "16秒以内" },
        { label: "中等", value: "26秒左右" },
        { label: "需加强", value: "36秒以上" },
      ],
    },
    {
      title: "5×5格参考标准（18岁及以上）",
      items: [
        { label: "优秀", value: "8秒左右" },
        { label: "中等", value: "20秒左右" },
      ],
    },
    {
      title: "4×4格参考标准（儿童版）",
      items: [
        { label: "优秀", value: "16秒以内" },
        { label: "中等", value: "26秒左右" },
        { label: "需加强", value: "50秒以上" },
      ],
    },
  ],
};

export default function SchultePage() {
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<SchulteEngine | null>(null);
  const [grid, setGrid] = useState<number[][]>([]);
  const [currentTarget, setCurrentTarget] = useState(1);
  const [lastTappedNumber, setLastTappedNumber] = useState<number | null>(null);
  const [lastTapCorrect, setLastTapCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState<SchulteResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const timer = useTimer();

  // 初始化引擎
  const initializeEngine = useCallback((size: GridSize) => {
    const newEngine = new SchulteEngine({ gridSize: size });
    setEngine(newEngine);
    setGrid(newEngine.getGrid());
    setCurrentTarget(1);
    setLastTappedNumber(null);
    setLastTapCorrect(null);
    timer.reset();
  }, [timer]);

  // 开始游戏
  const startGame = useCallback(() => {
    initializeEngine(gridSize);
    setPhase("playing");
  }, [gridSize, initializeEngine]);

  // 处理点击
  const handleTap = useCallback(async (number: number) => {
    if (!engine || phase !== "playing") return;

    // 如果还没开始，先开始
    if (engine.getState().startTime === null) {
      engine.start();
      timer.start();
    }

    const isCorrect = engine.tap(number);
    setLastTappedNumber(number);
    setLastTapCorrect(isCorrect);

    // 更新当前目标
    setCurrentTarget(engine.getCurrentTarget());

    // 清除视觉反馈
    setTimeout(() => {
      setLastTappedNumber(null);
      setLastTapCorrect(null);
    }, 200);

    // 检查是否完成
    if (engine.isComplete()) {
      timer.stop();
      const gameResult = engine.calculateResult();
      setResult(gameResult);
      setPhase("result");

      // 保存记录
      setIsSaving(true);
      try {
        await saveRecord({
          moduleType: "schulte",
          score: gameResult.score,
          accuracy: gameResult.accuracy,
          duration: Math.round(gameResult.duration),
          difficulty: getDifficultyFromGridSize(gameResult.gridSize),
          details: {
            gridSize: gameResult.gridSize,
            correctCount: gameResult.correctCount,
            errorCount: gameResult.errorCount,
            avgTapTime: gameResult.avgTapTime,
          },
        });
      } catch (error) {
        console.error("Failed to save record:", error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [engine, phase, timer]);

  // 重新开始（相同难度）
  const handleRestart = useCallback(() => {
    initializeEngine(gridSize);
    setResult(null);
    setPhase("playing");
  }, [gridSize, initializeEngine]);

  // 更换难度
  const handleChangeSize = useCallback(() => {
    timer.reset();
    setResult(null);
    setPhase("setup");
  }, [timer]);

  // 处理难度选择
  const handleSizeSelect = useCallback((size: GridSize) => {
    setGridSize(size);
  }, []);

  // 格式化计时显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);

    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
    }
    return `${secs}.${ms}`;
  };

  return (
    <PageLayout showNav={false}>
      <div className="space-y-6">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">舒尔特方格</h1>
          <div className="w-12" />
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && (
          <div className="space-y-6">
            <TrainingIntro {...SCHULTE_INTRO} />

            <DifficultySelector
              selectedSize={gridSize}
              onSelect={handleSizeSelect}
            />

            {/* 预览网格 */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-3">预览</h3>
              <div className="opacity-50 pointer-events-none">
                <SchulteGrid
                  grid={Array(gridSize).fill(null).map((_, i) =>
                    Array(gridSize).fill(null).map((_, j) => i * gridSize + j + 1)
                  )}
                  currentTarget={1}
                  onTap={() => {}}
                  disabled
                />
              </div>
            </div>

            {/* 排行榜 */}
            <Leaderboard moduleType="schulte" />

            <button
              onClick={startGame}
              className="btn-primary w-full text-lg py-4"
            >
              开始训练
            </button>
          </div>
        )}

        {/* 游戏阶段 */}
        {phase === "playing" && (
          <div className="space-y-4">
            {/* 进度和计时 */}
            <div className="card">
              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <span className="text-sm text-gray-500">当前目标</span>
                  <p className="text-3xl font-bold text-blue-600">{currentTarget}</p>
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-500">用时</span>
                  <p className="text-2xl font-mono font-bold text-orange-500">
                    {formatTime(timer.time)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">进度</span>
                  <p className="text-lg font-semibold text-gray-800">
                    {currentTarget - 1} / {gridSize * gridSize}
                  </p>
                </div>
              </div>
              {/* 进度条 */}
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-150"
                  style={{ width: `${((currentTarget - 1) / (gridSize * gridSize)) * 100}%` }}
                />
              </div>
            </div>

            {/* 游戏网格 */}
            <SchulteGrid
              grid={grid}
              currentTarget={currentTarget}
              onTap={handleTap}
              lastTappedNumber={lastTappedNumber}
              lastTapCorrect={lastTapCorrect}
            />

            {/* 放弃按钮 */}
            <button
              onClick={handleChangeSize}
              className="btn-secondary w-full"
            >
              放弃本次训练
            </button>
          </div>
        )}

        {/* 结果阶段 */}
        {phase === "result" && result && (
          <div className="space-y-4">
            <SchulteResult
              result={result}
              onRestart={handleRestart}
              onChangeSize={handleChangeSize}
            />
            
            {/* 排行榜（显示当前成绩） */}
            <Leaderboard 
              moduleType="schulte" 
              currentScore={result.score}
              currentDuration={result.duration}
              currentDifficulty={getDifficultyFromGridSize(gridSize)}
            />
            
            {isSaving && (
              <p className="text-center text-sm text-gray-500">正在保存记录...</p>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
