"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { 
  ClassificationItemDisplay, 
  ClassificationButtons, 
  ClassificationResult, 
  ClassificationDifficultySelector 
} from "@/components/classification";
import { 
  ClassificationEngine, 
  getConfigFromDifficulty,
  type ClassificationResult as ClassificationResultType,
  type ClassificationItem,
} from "@/engines/classification";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "playing" | "result";

export default function ClassificationPage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<ClassificationEngine | null>(null);
  const [currentItem, setCurrentItem] = useState<ClassificationItem | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [rulesDiscovered, setRulesDiscovered] = useState(1);
  const [lastSelected, setLastSelected] = useState<boolean | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [result, setResult] = useState<ClassificationResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 初始化引擎
  const initializeEngine = useCallback((diff: number) => {
    const config = getConfigFromDifficulty(diff);
    const newEngine = new ClassificationEngine(config);
    setEngine(newEngine);
    setCurrentItem(newEngine.getCurrentItem());
    setProgress(newEngine.getProgress());
    setConsecutiveCorrect(0);
    setRulesDiscovered(1);
    setLastSelected(null);
    setLastCorrect(null);
    setShowFeedback(false);
  }, []);

  // 开始游戏
  const startGame = useCallback(() => {
    initializeEngine(difficulty);
    setPhase("playing");
  }, [difficulty, initializeEngine]);


  // 处理分类选择
  const handleClassify = useCallback(async (userAnswer: boolean) => {
    if (!engine || phase !== "playing") return;

    // 如果还没开始，先开始
    if (engine.getState().startTime === null) {
      engine.start();
    }

    const isCorrect = engine.respond(userAnswer);
    setLastSelected(userAnswer);
    setLastCorrect(isCorrect);
    setShowFeedback(true);

    // 短暂显示反馈后更新到下一个分类项
    setTimeout(() => {
      setShowFeedback(false);
      setLastSelected(null);
      setLastCorrect(null);
      
      if (engine.isComplete()) {
        const gameResult = engine.calculateResult();
        setResult(gameResult);
        setPhase("result");

        // 保存记录
        setIsSaving(true);
        saveRecord({
          moduleType: "classification",
          score: gameResult.score,
          accuracy: gameResult.accuracy,
          duration: Math.round(gameResult.duration),
          difficulty: difficulty,
          details: {
            totalItems: gameResult.totalItems,
            correctCount: gameResult.correctCount,
            errorCount: gameResult.errorCount,
            rulesDiscovered: gameResult.rulesDiscovered,
            avgConsecutiveCorrect: gameResult.avgConsecutiveCorrect,
          },
        }).catch((error) => {
          console.error("Failed to save record:", error);
        }).finally(() => {
          setIsSaving(false);
        });
      } else {
        setCurrentItem(engine.getCurrentItem());
        setProgress(engine.getProgress());
        setConsecutiveCorrect(engine.getConsecutiveCorrect());
        setRulesDiscovered(engine.getRulesDiscovered());
      }
    }, 300);
  }, [engine, phase, difficulty]);

  // 重新开始（相同难度）
  const handleRestart = useCallback(() => {
    initializeEngine(difficulty);
    setResult(null);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  // 更换难度
  const handleChangeDifficulty = useCallback(() => {
    setResult(null);
    setPhase("setup");
  }, []);

  // 处理难度选择
  const handleDifficultySelect = useCallback((diff: number) => {
    setDifficulty(diff);
  }, []);

  const config = getConfigFromDifficulty(difficulty);

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
          <h1 className="text-lg font-semibold text-gray-900">规则分类训练</h1>
          <div className="w-12" />
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">训练说明</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                屏幕上会显示不同形状、颜色、大小的图形。
                你需要根据隐藏的规则判断每个图形是否符合规则。
                连续答对后规则会改变，你需要发现新规则。
                这项训练可以提升你的逻辑推理和规则发现能力。
              </p>
            </div>

            <ClassificationDifficultySelector
              selectedDifficulty={difficulty}
              onSelect={handleDifficultySelect}
            />

            {/* 配置预览 */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-3">训练配置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">分类项数量：</span>
                  <span className="font-semibold text-gray-800">{config.itemCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">规则属性数：</span>
                  <span className="font-semibold text-gray-800">{config.attributeCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">切换规则需要：</span>
                  <span className="font-semibold text-gray-800">{config.consecutiveToSwitch}次连续正确</span>
                </div>
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
          <div className="space-y-6">
            {/* 进度指示 */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">进度</span>
                <span className="text-sm font-semibold text-gray-800">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* 状态信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card text-center">
                <p className="text-xs text-gray-500 mb-1">连续正确</p>
                <p className="text-2xl font-bold text-green-600">{consecutiveCorrect}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500 mb-1">已发现规则</p>
                <p className="text-2xl font-bold text-blue-600">{rulesDiscovered}</p>
              </div>
            </div>

            {/* 分类项显示 */}
            <div className="card">
              <ClassificationItemDisplay
                item={currentItem}
                showFeedback={showFeedback}
                feedbackCorrect={lastCorrect}
              />
            </div>

            {/* 分类选择按钮 */}
            <ClassificationButtons
              onSelect={handleClassify}
              disabled={showFeedback}
              lastSelected={lastSelected}
              lastCorrect={lastCorrect}
            />

            {/* 放弃按钮 */}
            <button
              onClick={handleChangeDifficulty}
              className="btn-secondary w-full"
            >
              放弃本次训练
            </button>
          </div>
        )}

        {/* 结果阶段 */}
        {phase === "result" && result && (
          <div className="space-y-4">
            <ClassificationResult
              result={result}
              onRestart={handleRestart}
              onChangeDifficulty={handleChangeDifficulty}
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
