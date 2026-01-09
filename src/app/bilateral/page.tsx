"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { BilateralDisplay, BilateralResult, BilateralDifficultySelector } from "@/components/bilateral";
import { TrainingIntro, Leaderboard } from "@/components/shared";
import { BilateralEngine, getBilateralConfigFromDifficulty, type BilateralResult as BilateralResultType, type BilateralPattern } from "@/engines/bilateral";
import { saveRecord } from "@/services/storage";
import { useTimer } from "@/components/shared";

type GamePhase = "setup" | "playing" | "result";

const BILATERAL_INTRO = {
  title: "训练说明",
  description: "屏幕上会出现左右两个目标点，你需要同时用双手触摸两个目标。部分图案是镜像对称的，需要双手做出对称动作。",
  benefits: [
    "提升双侧肢体协调能力",
    "增强左右脑协同工作",
    "改善空间感知能力",
    "训练精细动作控制",
    "有助于提高运动协调性",
  ],
  tips: [
    "建议使用平板或大屏手机横屏进行",
    "双手同时触摸，注意时机配合",
    "观察图案的对称性",
    "保持稳定的节奏",
    "放松手臂，避免紧张",
  ],
  referenceData: [
    {
      title: "表现标准",
      items: [
        { label: "优秀准确率", value: ">95%" },
        { label: "良好准确率", value: "85-95%" },
        { label: "时间精度", value: "<100ms差异" },
        { label: "镜像准确率", value: ">90%" },
      ],
    },
    {
      title: "训练效果",
      items: [
        { label: "初学者", value: "准确率75%左右" },
        { label: "熟练者", value: "准确率90%以上" },
        { label: "专家水平", value: "时间差<50ms" },
      ],
    },
  ],
};

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
  
  const timer = useTimer();

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const initializeEngine = useCallback((diff: number) => {
    const config = getBilateralConfigFromDifficulty(diff);
    const newEngine = new BilateralEngine(config);
    setEngine(newEngine);
    setProgress(newEngine.getProgress());
    setCurrentPattern(null);
    setShowFeedback(false);
    setFeedbackCorrect(null);
    setHasResponded(false);
    timer.reset();
  }, [timer]);

  const finishGame = useCallback(() => {
    if (!engine) return;
    timer.stop();
    const gameResult = engine.calculateResult();
    setResult(gameResult);
    setPhase("result");
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
    }).catch((error) => console.error("Failed to save record:", error)).finally(() => setIsSaving(false));
  }, [engine, difficulty]);

  const showNextPattern = useCallback(() => {
    if (!engine || engine.isComplete()) return;
    const pattern = engine.getCurrentPattern();
    if (!pattern) return;
    setHasResponded(false);
    setCurrentPattern(pattern);
    setShowFeedback(false);
    setFeedbackCorrect(null);
    const config = engine.getConfig();
    timerRef.current = setTimeout(() => {
      if (!hasResponded) handleTimeout();
    }, config.timeLimit);
  }, [engine, hasResponded]);

  const handleTimeout = useCallback(() => {
    if (!engine || engine.isComplete()) return;
    engine.advance();
    setShowFeedback(true);
    setFeedbackCorrect(false);
    setTimeout(() => {
      setShowFeedback(false);
      setFeedbackCorrect(null);
      if (engine.isComplete()) finishGame();
      else {
        setProgress(engine.getProgress());
        showNextPattern();
      }
    }, 500);
  }, [engine, finishGame, showNextPattern]);

  const handleTouch = useCallback((leftTouched: boolean, rightTouched: boolean) => {
    if (!engine || phase !== "playing" || hasResponded) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHasResponded(true);
    const response = engine.respond(leftTouched, rightTouched);
    if (response) {
      setShowFeedback(true);
      setFeedbackCorrect(response.correct);
      engine.advance();
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackCorrect(null);
        if (engine.isComplete()) finishGame();
        else {
          setProgress(engine.getProgress());
          showNextPattern();
        }
      }, 500);
    }
  }, [engine, phase, hasResponded, showNextPattern, finishGame]);

  const startGame = useCallback(() => {
    initializeEngine(difficulty);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  useEffect(() => {
    if (phase === "playing" && engine && !engine.isComplete()) {
      engine.start();
      timer.start();
      const startDelay = setTimeout(() => showNextPattern(), 1000);
      return () => clearTimeout(startDelay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, engine]);

  const handleRestart = useCallback(() => {
    initializeEngine(difficulty);
    setResult(null);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  const handleChangeDifficulty = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
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

  const config = getBilateralConfigFromDifficulty(difficulty);

  return (
    <PageLayout showNav={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">双侧协调训练</h1>
          <div className="w-12" />
        </div>

        {phase === "setup" && (
          <div className="space-y-6">
            <TrainingIntro {...BILATERAL_INTRO} />
            <BilateralDifficultySelector selectedDifficulty={difficulty} onSelect={setDifficulty} />
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-3">训练配置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">图案数量：</span>
                  <span className="font-semibold text-gray-800">{config.patternCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">响应时限：</span>
                  <span className="font-semibold text-gray-800">{(config.timeLimit / 1000).toFixed(1)}秒</span>
                </div>
              </div>
            </div>
            <div className="card bg-purple-50 border-purple-200">
              <p className="text-sm text-purple-800"><strong>提示：</strong>建议使用平板或大屏手机横屏进行训练，以获得最佳体验。</p>
            </div>
            <Leaderboard moduleType="bilateral" />
            <button onClick={startGame} className="btn-primary w-full text-lg py-4">开始训练</button>
          </div>
        )}

        {phase === "playing" && engine && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm text-gray-500">进度</span>
                  <p className="text-lg font-semibold text-gray-800">{progress.current} / {progress.total}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">用时</span>
                  <p className="text-2xl font-mono font-bold text-orange-500">{formatTime(timer.time)}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
            </div>
            <BilateralDisplay pattern={currentPattern} timeLimit={config.timeLimit} onTouch={handleTouch} disabled={showFeedback || hasResponded} showFeedback={showFeedback} feedbackCorrect={feedbackCorrect} />
            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">放弃本次训练</button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-4">
            <BilateralResult result={result} onRestart={handleRestart} onChangeDifficulty={handleChangeDifficulty} />
            <Leaderboard moduleType="bilateral" currentScore={result.score} currentDuration={result.duration} />
            {isSaving && <p className="text-center text-sm text-gray-500">正在保存记录...</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
