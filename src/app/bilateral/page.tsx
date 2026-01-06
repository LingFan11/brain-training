"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { 
  BilateralDisplay, 
  BilateralResult, 
  BilateralDifficultySelector 
} from "@/components/bilateral";
import { 
  BilateralEngine, 
  getBilateralConfigFromDifficulty,
  type BilateralResult as BilateralResultType,
  type BilateralPattern,
} from "@/engines/bilateral";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "playing" | "result";

export default function BilateralPage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<BilateralEngine | null>(null);
  const [currentPattern, setCurrentPattern] = useState<BilateralPattern | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState<BilateralResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 初始化引擎
  const initializeEngine = useCallback((diff: number) => {
    const config = getBilateralConfigFromDifficulty(diff);
    const newEngine = new BilateralEngine(config);
    setEngine(newEngine);
    setProgress(newEngine.getProgress());
    setCurrentPattern(null);
    setShowFeedback(false);
    setFeedbackCorrect(null);
    setHasResponded(false);
  }, []);

  // 显示下一个图案
  const showNextPattern = useCallback(() => {
    if (!engine || engine.isComplete()) return;

    const pattern = engine.getCurrentPattern();
    if (!pattern) return;

    setHasResponded(false);
    setCurrentPattern(pattern);
    setShowFeedback(false);
    setFeedbackCorrect(null);

    // 设置超时定时器
    const config = engine.getConfig();
    timerRef.current = setTimeout(() => {
      // 如果用户没有响应，自动前进
      if (!hasResponded) {
        handleTimeout();
      }
    }, config.timeLimit);
  }, [engine, hasResponded]);

  // 处理超时
  const handleTimeout = useCallback(() => {
    if (!engine || engine.isComplete()) return;

    // 前进到下一个图案（会自动记录未响应）
    engine.advance();
    
    // 显示反馈
    setShowFeedback(true);
    setFeedbackCorrect(false);

    setTimeout(() => {
      setShowFeedback(false);
      setFeedbackCorrect(null);
      
      if (engine.isComplete()) {
        finishGame();
      } else {
        setProgress(engine.getProgress());
        showNextPattern();
      }
    }, 500);
  }, [engine]);

  // 处理用户触摸响应
  const handleTouch = useCallback((leftTouched: boolean, rightTouched: boolean) => {
    if (!engine || phase !== "playing" || hasResponded) return;

    // 清除超时定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setHasResponded(true);

    const response = engine.respond(leftTouched, rightTouched);
    
    if (response) {
      // 显示反馈
      setShowFeedback(true);
      setFeedbackCorrect(response.correct);

      // 前进到下一个图案
      engine.advance();

      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackCorrect(null);
        
        if (engine.isComplete()) {
          finishGame();
        } else {
          setProgress(engine.getProgress());
          showNextPattern();
        }
      }, 500);
    }
  }, [engine, phase, hasResponded, showNextPattern]);

  // 完成游戏
  const finishGame = useCallback(() => {
    if (!engine) return;

    const gameResult = engine.calculateResult();
    setResult(gameResult);
    setPhase("result");

    // 保存记录
    setIsSaving(true);
    saveRecord({
      moduleType: "bilateral",
      score: gameResult.score,
      accuracy: gameResult.accuracy,
      duration: Math.round(gameResult.duration),
      difficulty: difficulty,
      details: {
        patternCount: gameResult.patternCount,
        correctCount: gameResult.correctCount,
        errorCount: gameResult.errorCount,
        avgTiming: gameResult.avgTiming,
        mirrorAccuracy: gameResult.mirrorAccuracy,
        nonMirrorAccuracy: gameResult.nonMirrorAccuracy,
        timingPrecision: gameResult.timingPrecision,
      },
    }).catch((error) => {
      console.error("Failed to save record:", error);
    }).finally(() => {
      setIsSaving(false);
    });
  }, [engine, difficulty]);

  // 开始游戏
  const startGame = useCallback(() => {
    initializeEngine(difficulty);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  // 游戏开始后显示第一个图案
  useEffect(() => {
    if (phase === "playing" && engine && !engine.isComplete()) {
      engine.start();
      // 短暂延迟后开始显示
      const startDelay = setTimeout(() => {
        showNextPattern();
      }, 1000);
      
      return () => clearTimeout(startDelay);
    }
  }, [phase, engine]);

  // 重新开始（相同难度）
  const handleRestart = useCallback(() => {
    initializeEngine(difficulty);
    setResult(null);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  // 更换难度
  const handleChangeDifficulty = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setResult(null);
    setPhase("setup");
  }, []);

  // 处理难度选择
  const handleDifficultySelect = useCallback((diff: number) => {
    setDifficulty(diff);
  }, []);

  const config = getBilateralConfigFromDifficulty(difficulty);

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
          <h1 className="text-lg font-semibold text-gray-900">双侧协调训练</h1>
          <div className="w-12" />
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">训练说明</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                屏幕上会出现左右两个目标点，你需要<strong>同时</strong>用双手触摸两个目标。
                部分图案是镜像对称的，需要双手做出对称动作。
                这项训练可以提升你的双侧肢体协调能力。
              </p>
            </div>

            <BilateralDifficultySelector
              selectedDifficulty={difficulty}
              onSelect={handleDifficultySelect}
            />

            {/* 配置预览 */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-3">训练配置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">图案数量：</span>
                  <span className="font-semibold text-gray-800">{config.patternCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">响应时限：</span>
                  <span className="font-semibold text-gray-800">
                    {(config.timeLimit / 1000).toFixed(1)}秒
                  </span>
                </div>
              </div>
            </div>

            <div className="card bg-purple-50 border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>提示：</strong>建议使用平板或大屏手机横屏进行训练，以获得最佳体验。
              </p>
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
        {phase === "playing" && engine && (
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
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* 双侧触摸显示 */}
            <BilateralDisplay
              pattern={currentPattern}
              timeLimit={config.timeLimit}
              onTouch={handleTouch}
              disabled={showFeedback || hasResponded}
              showFeedback={showFeedback}
              feedbackCorrect={feedbackCorrect}
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
            <BilateralResult
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
