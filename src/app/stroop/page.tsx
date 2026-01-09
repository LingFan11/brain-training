"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { StroopWord, ColorButtons, StroopResult, StroopDifficultySelector } from "@/components/stroop";
import { TrainingIntro, Leaderboard } from "@/components/shared";
import { 
  StroopEngine, 
  getConfigFromDifficulty,
  type StroopResult as StroopResultType,
  type ChineseColor,
} from "@/engines/stroop";
import { saveRecord } from "@/services/storage";
import { useTimer } from "@/components/shared";

type GamePhase = "setup" | "playing" | "result";

// Stroop训练介绍数据
const STROOP_INTRO = {
  title: "训练说明",
  description: "屏幕上会显示颜色词（如\"红\"、\"蓝\"），但文字的墨水颜色可能与词义不同。你需要选择文字的墨水颜色，而不是词义。",
  benefits: [
    "提升认知控制和抑制能力",
    "增强选择性注意力",
    "改善执行功能和反应速度",
    "训练大脑处理冲突信息的能力",
    "有助于提高阅读理解和学习效率",
  ],
  tips: [
    "专注于文字的颜色，忽略文字的含义",
    "保持稳定的节奏，不要急于求成",
    "错误后不要慌张，继续保持专注",
    "随着练习，反应速度会逐渐提高",
  ],
  referenceData: [
    {
      title: "Stroop效应参考",
      items: [
        { label: "一致条件", value: "反应更快更准确" },
        { label: "不一致条件", value: "反应较慢，需要抑制" },
        { label: "优秀准确率", value: "95%以上" },
        { label: "平均反应时间", value: "500-800毫秒" },
      ],
    },
    {
      title: "训练效果",
      items: [
        { label: "初学者", value: "准确率80%左右" },
        { label: "熟练者", value: "准确率95%以上" },
        { label: "专家水平", value: "反应时间<500ms" },
      ],
    },
  ],
};

export default function StroopPage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<StroopEngine | null>(null);
  const [currentTrial, setCurrentTrial] = useState<ReturnType<StroopEngine["getCurrentTrial"]>>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [lastSelected, setLastSelected] = useState<ChineseColor | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [result, setResult] = useState<StroopResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const timer = useTimer();

  // 初始化引擎
  const initializeEngine = useCallback((diff: number) => {
    const config = getConfigFromDifficulty(diff);
    const newEngine = new StroopEngine(config);
    setEngine(newEngine);
    setCurrentTrial(newEngine.getCurrentTrial());
    setProgress(newEngine.getProgress());
    setLastSelected(null);
    setLastCorrect(null);
    setShowFeedback(false);
    timer.reset();
  }, [timer]);

  // 开始游戏
  const startGame = useCallback(() => {
    initializeEngine(difficulty);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  // 处理颜色选择
  const handleColorSelect = useCallback(async (color: ChineseColor) => {
    if (!engine || phase !== "playing") return;

    // 如果还没开始，先开始
    if (engine.getState().startTime === null) {
      engine.start();
      timer.start();
    }

    const isCorrect = engine.respond(color);
    setLastSelected(color);
    setLastCorrect(isCorrect);
    setShowFeedback(true);

    // 短暂显示反馈后更新到下一个试次
    setTimeout(() => {
      setShowFeedback(false);
      setLastSelected(null);
      setLastCorrect(null);
      
      if (engine.isComplete()) {
        timer.stop();
        const gameResult = engine.calculateResult();
        setResult(gameResult);
        setPhase("result");

        // 保存记录
        setIsSaving(true);
        saveRecord({
          moduleType: "stroop",
          score: gameResult.score,
          accuracy: gameResult.accuracy,
          duration: Math.round(gameResult.duration),
          difficulty: difficulty,
          details: {
            totalTrials: gameResult.totalTrials,
            correctCount: gameResult.correctCount,
            errorCount: gameResult.errorCount,
            avgResponseTime: gameResult.avgResponseTime,
            congruentAccuracy: gameResult.congruentAccuracy,
            incongruentAccuracy: gameResult.incongruentAccuracy,
          },
        }).catch((error) => {
          console.error("Failed to save record:", error);
        }).finally(() => {
          setIsSaving(false);
        });
      } else {
        setCurrentTrial(engine.getCurrentTrial());
        setProgress(engine.getProgress());
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, phase, difficulty]);

  // 重新开始（相同难度）
  const handleRestart = useCallback(() => {
    initializeEngine(difficulty);
    setResult(null);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  // 更换难度
  const handleChangeDifficulty = useCallback(() => {
    timer.reset();
    setResult(null);
    setPhase("setup");
  }, [timer]);

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
          <h1 className="text-lg font-semibold text-gray-900">Stroop训练</h1>
          <div className="w-12" />
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && (
          <div className="space-y-6">
            <TrainingIntro {...STROOP_INTRO} />

            <StroopDifficultySelector
              selectedDifficulty={difficulty}
              onSelect={handleDifficultySelect}
            />

            {/* 配置预览 */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-3">训练配置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">试次数量：</span>
                  <span className="font-semibold text-gray-800">{config.trialCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">一致比例：</span>
                  <span className="font-semibold text-gray-800">
                    {Math.round(config.congruentRatio * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 排行榜 */}
            <Leaderboard moduleType="stroop" />

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
            {/* 进度和计时 */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm text-gray-500">进度</span>
                  <p className="text-lg font-semibold text-gray-800">
                    {progress.current} / {progress.total}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">用时</span>
                  <p className="text-2xl font-mono font-bold text-orange-500">
                    {formatTime(timer.time)}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* 颜色词显示 */}
            <div className="card">
              <StroopWord
                trial={currentTrial}
                showFeedback={showFeedback}
                feedbackCorrect={lastCorrect}
              />
            </div>

            {/* 颜色选择按钮 */}
            <ColorButtons
              onSelect={handleColorSelect}
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
            <StroopResult
              result={result}
              onRestart={handleRestart}
              onChangeDifficulty={handleChangeDifficulty}
            />
            
            {/* 排行榜 */}
            <Leaderboard 
              moduleType="stroop" 
              currentScore={result.score}
              currentDuration={result.duration}
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
