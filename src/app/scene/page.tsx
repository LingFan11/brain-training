"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { SceneDifficultySelector, SceneDisplay, SceneQuestion, SceneResult } from "@/components/scene";
import { TrainingIntro, Leaderboard } from "@/components/shared";
import { SceneEngine, getSceneConfigFromDifficulty, type SceneResult as SceneResultType, type SceneElement, type SceneTestQuestion } from "@/engines/scene";
import { saveRecord } from "@/services/storage";
import { useTimer } from "@/components/shared";

type GamePhase = "setup" | "study" | "test" | "result";

const SCENE_INTRO = {
  title: "训练说明",
  description: "屏幕上会显示一个包含多个物品的场景。在限定时间内记住每个物品及其位置。然后回答关于物品和位置的问题。",
  benefits: [
    "提升情景记忆能力",
    "增强空间记忆能力",
    "改善视觉工作记忆",
    "训练信息编码和提取能力",
    "有助于日常生活中的记忆任务",
  ],
  tips: [
    "使用位置联想法记忆物品",
    "将物品与位置建立联系",
    "尝试创建故事串联物品",
    "注意物品之间的空间关系",
    "多次练习可以提高记忆策略",
  ],
  referenceData: [
    {
      title: "记忆容量参考",
      items: [
        { label: "短期记忆容量", value: "7±2个项目" },
        { label: "空间记忆", value: "4-5个位置" },
        { label: "优秀表现", value: "记住8+物品位置" },
        { label: "良好表现", value: "记住5-7物品位置" },
      ],
    },
    {
      title: "表现标准",
      items: [
        { label: "优秀", value: "准确率>90%" },
        { label: "良好", value: "准确率75-90%" },
        { label: "中等", value: "准确率60-75%" },
        { label: "需练习", value: "准确率<60%" },
      ],
    },
  ],
};

export default function ScenePage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<SceneEngine | null>(null);
  const [elements, setElements] = useState<SceneElement[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<SceneTestQuestion | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [studyTimeLeft, setStudyTimeLeft] = useState(0);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [result, setResult] = useState<SceneResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const timer = useTimer();

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const initializeEngine = useCallback((diff: number) => {
    const config = getSceneConfigFromDifficulty(diff);
    const newEngine = new SceneEngine(config);
    setEngine(newEngine);
    setElements(newEngine.getElements());
    setProgress(newEngine.getProgress());
    setStudyTimeLeft(config.studyTime);
    setLastAnswer(null);
    setLastCorrect(null);
    setShowFeedback(false);
    timer.reset();
  }, [timer]);

  const startStudy = useCallback(() => {
    if (!engine) return;
    engine.startStudy();
    setPhase("study");
    const config = engine.getConfig();
    setStudyTimeLeft(config.studyTime);
    
    timerRef.current = setInterval(() => {
      setStudyTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          engine.startTest();
          timer.start();
          setPhase("test");
          setCurrentQuestion(engine.getCurrentQuestion());
          setProgress(engine.getProgress());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [engine, timer]);

  const startGame = useCallback(() => {
    initializeEngine(difficulty);
  }, [difficulty, initializeEngine]);

  useEffect(() => {
    if (engine && phase === "setup") startStudy();
  }, [engine, phase, startStudy]);

  const handleAnswer = useCallback(async (answer: string) => {
    if (!engine || phase !== "test" || showFeedback) return;

    const isCorrect = engine.respond(answer);
    setLastAnswer(answer);
    setLastCorrect(isCorrect);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setLastAnswer(null);
      setLastCorrect(null);

      if (engine.isComplete()) {
        timer.stop();
        const gameResult = engine.calculateResult();
        setResult(gameResult);
        setPhase("result");
        setIsSaving(true);
        saveRecord({
          moduleType: "scene",
          score: gameResult.score,
          accuracy: gameResult.accuracy,
          duration: Math.round(gameResult.duration),
          difficulty: difficulty,
          details: {
            elementCount: gameResult.elementCount,
            questionCount: gameResult.questionCount,
            correctCount: gameResult.correctCount,
            errorCount: gameResult.errorCount,
            itemAccuracy: gameResult.itemAccuracy,
            spatialAccuracy: gameResult.spatialAccuracy,
            studyTime: gameResult.studyTime,
          },
        }).catch((error) => console.error("Failed to save record:", error)).finally(() => setIsSaving(false));
      } else {
        setCurrentQuestion(engine.getCurrentQuestion());
        setProgress(engine.getProgress());
      }
    }, 500);
  }, [engine, phase, showFeedback, difficulty]);

  const handleRestart = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setResult(null);
    setPhase("setup");
    initializeEngine(difficulty);
  }, [difficulty, initializeEngine]);

  const handleChangeDifficulty = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timer.reset();
    setEngine(null);
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

  const config = getSceneConfigFromDifficulty(difficulty);

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
          <h1 className="text-lg font-semibold text-gray-900">情景记忆训练</h1>
          <div className="w-12" />
        </div>

        {phase === "setup" && !engine && (
          <div className="space-y-6">
            <TrainingIntro {...SCENE_INTRO} />
            <SceneDifficultySelector selectedDifficulty={difficulty} onSelect={setDifficulty} />
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-3">训练配置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">元素数量：</span>
                  <span className="font-semibold text-gray-800">{config.elementCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">记忆时间：</span>
                  <span className="font-semibold text-gray-800">{config.studyTime}秒</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">测试类型：</span>
                  <span className="font-semibold text-gray-800">
                    {config.testType === "item" ? "物品记忆" : config.testType === "spatial" ? "位置记忆" : "物品+位置记忆"}
                  </span>
                </div>
              </div>
            </div>
            <Leaderboard moduleType="scene" />
            <button onClick={startGame} className="btn-primary w-full text-lg py-4">开始训练</button>
          </div>
        )}

        {phase === "study" && (
          <div className="space-y-6">
            <div className="card text-center">
              <p className="text-sm text-gray-500 mb-2">记忆时间</p>
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200" />
                  <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={276.46} strokeDashoffset={276.46 * (1 - studyTimeLeft / config.studyTime)} className="text-purple-500 transition-all duration-1000" />
                </svg>
                <span className="absolute text-3xl font-bold text-purple-600">{studyTimeLeft}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">仔细记住每个物品的位置</p>
            </div>
            <SceneDisplay elements={elements} showElements={true} />
            <div className="card bg-purple-50 border-purple-200">
              <p className="text-sm text-purple-700 text-center">🪬 记住物品的类型和它们在场景中的位置</p>
            </div>
            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">放弃本次训练</button>
          </div>
        )}

        {phase === "test" && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm text-gray-500">测试进度</span>
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
            <SceneDisplay elements={elements} showElements={false} />
            <SceneQuestion question={currentQuestion} onAnswer={handleAnswer} disabled={showFeedback} lastAnswer={lastAnswer} lastCorrect={lastCorrect} showFeedback={showFeedback} />
            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">放弃本次训练</button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-4">
            <SceneResult result={result} onRestart={handleRestart} onChangeDifficulty={handleChangeDifficulty} />
            <Leaderboard moduleType="scene" currentScore={result.score} currentDuration={result.duration} />
            {isSaving && <p className="text-center text-sm text-gray-500">正在保存记录...</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
