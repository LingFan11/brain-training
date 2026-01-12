"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { ClassificationItemDisplay, ClassificationButtons, ClassificationResult, ClassificationDifficultySelector } from "@/components/classification";
import { TrainingIntro, Leaderboard } from "@/components/shared";
import { ClassificationEngine, getConfigFromDifficulty, type ClassificationResult as ClassificationResultType, type ClassificationItem } from "@/engines/classification";
import { saveRecord } from "@/services/storage";
import { useTimer } from "@/components/shared";

type GamePhase = "setup" | "playing" | "result";

const CLASSIFICATION_INTRO = {
  title: "训练说明",
  description: "屏幕上会显示不同形状、颜色、大小的图形。你需要根据隐藏的规则判断每个图形是否符合规则。连续答对后规则会改变，你需要发现新规则。",
  benefits: [
    "提升逻辑推理能力",
    "增强规则发现和归纳能力",
    "改善认知灵活性",
    "训练抽象思维能力",
    "有助于问题解决和决策能力",
  ],
  tips: [
    "仔细观察图形的各种属性",
    "根据反馈推断可能的规则",
    "规则改变时要快速调整策略",
    "不要固守之前的规则",
    "保持开放的思维方式",
  ],
  referenceData: [
    {
      title: "威斯康星卡片分类测验参考",
      items: [
        { label: "正常成人", value: "完成6个类别" },
        { label: "持续性错误", value: "<15%" },
        { label: "规则切换", value: "连续10次正确后切换" },
        { label: "总试次", value: "通常128次" },
      ],
    },
    {
      title: "表现标准",
      items: [
        { label: "优秀", value: "发现5+规则" },
        { label: "良好", value: "发现3-4规则" },
        { label: "中等", value: "发现2规则" },
        { label: "需练习", value: "发现1规则" },
      ],
    },
  ],
};

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
  
  const timer = useTimer();

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
    timer.reset();
  }, [timer]);

  const startGame = useCallback(() => {
    initializeEngine(difficulty);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  const handleClassify = useCallback(async (userAnswer: boolean) => {
    if (!engine || phase !== "playing") return;
    if (engine.getState().startTime === null) {
      engine.start();
      timer.start();
    }

    const isCorrect = engine.respond(userAnswer);
    setLastSelected(userAnswer);
    setLastCorrect(isCorrect);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setLastSelected(null);
      setLastCorrect(null);
      
      if (engine.isComplete()) {
        timer.stop();
        const gameResult = engine.calculateResult();
        setResult(gameResult);
        setPhase("result");
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
        }).catch((error) => console.error("Failed to save record:", error)).finally(() => setIsSaving(false));
      } else {
        setCurrentItem(engine.getCurrentItem());
        setProgress(engine.getProgress());
        setConsecutiveCorrect(engine.getConsecutiveCorrect());
        setRulesDiscovered(engine.getRulesDiscovered());
      }
    }, 300);
  }, [engine, phase, difficulty, timer]);

  const handleRestart = useCallback(() => {
    initializeEngine(difficulty);
    setResult(null);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

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

  const config = getConfigFromDifficulty(difficulty);

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
          <h1 className="text-lg font-semibold text-gray-900">规则分类训练</h1>
          <div className="w-12" />
        </div>

        {phase === "setup" && (
          <div className="space-y-6">
            <TrainingIntro {...CLASSIFICATION_INTRO} />
            <ClassificationDifficultySelector selectedDifficulty={difficulty} onSelect={setDifficulty} />
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
            <Leaderboard moduleType="classification" />
            <button onClick={startGame} className="btn-primary w-full text-lg py-4">开始训练</button>
          </div>
        )}

        {phase === "playing" && (
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
                <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
            </div>
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
            <div className="card">
              <ClassificationItemDisplay item={currentItem} showFeedback={showFeedback} feedbackCorrect={lastCorrect} />
            </div>
            <ClassificationButtons onSelect={handleClassify} disabled={showFeedback} lastSelected={lastSelected} lastCorrect={lastCorrect} />
            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">放弃本次训练</button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-4">
            <ClassificationResult result={result} onRestart={handleRestart} onChangeDifficulty={handleChangeDifficulty} />
            <Leaderboard moduleType="classification" currentScore={result.score} currentDuration={result.duration} currentDifficulty={difficulty} />
            {isSaving && <p className="text-center text-sm text-gray-500">正在保存记录...</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
