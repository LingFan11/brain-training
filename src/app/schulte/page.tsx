"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { SchulteGrid, DifficultySelector, SchulteResult } from "@/components/schulte";
import { SchulteEngine, type GridSize, type SchulteResult as SchulteResultType, getDifficultyFromGridSize } from "@/engines/schulte";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "playing" | "result";

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

  // 初始化引擎
  const initializeEngine = useCallback((size: GridSize) => {
    const newEngine = new SchulteEngine({ gridSize: size });
    setEngine(newEngine);
    setGrid(newEngine.getGrid());
    setCurrentTarget(1);
    setLastTappedNumber(null);
    setLastTapCorrect(null);
  }, []);

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
  }, [engine, phase]);

  // 重新开始（相同难度）
  const handleRestart = useCallback(() => {
    initializeEngine(gridSize);
    setResult(null);
    setPhase("playing");
  }, [gridSize, initializeEngine]);

  // 更换难度
  const handleChangeSize = useCallback(() => {
    setResult(null);
    setPhase("setup");
  }, []);

  // 处理难度选择
  const handleSizeSelect = useCallback((size: GridSize) => {
    setGridSize(size);
  }, []);

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
          <h1 className="text-lg font-semibold text-gray-900">舒尔特表</h1>
          <div className="w-12" /> {/* 占位，保持标题居中 */}
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">训练说明</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                按照从小到大的顺序（1, 2, 3...）依次点击数字。
                尽可能快速准确地完成，训练你的视觉搜索能力和注意力集中能力。
              </p>
            </div>

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
            {/* 进度指示 */}
            <div className="card flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">当前目标</span>
                <p className="text-3xl font-bold text-blue-600">{currentTarget}</p>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">进度</span>
                <p className="text-lg font-semibold text-gray-800">
                  {currentTarget - 1} / {gridSize * gridSize}
                </p>
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
            {isSaving && (
              <p className="text-center text-sm text-gray-500">正在保存记录...</p>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
