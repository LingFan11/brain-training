"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import {
  SceneDifficultySelector,
  SceneDisplay,
  SceneQuestion,
  SceneResult,
} from "@/components/scene";
import {
  SceneEngine,
  getSceneConfigFromDifficulty,
  type SceneResult as SceneResultType,
  type SceneElement,
  type SceneTestQuestion,
} from "@/engines/scene";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "study" | "test" | "result";

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

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 初始化引擎
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
  }, []);

  // 开始学习阶段
  const startStudy = useCallback(() => {
    if (!engine) return;
    
    engine.startStudy();
    setPhase("study");
    
    const config = engine.getConfig();
    setStudyTimeLeft(config.studyTime);
    
    // 启动倒计时
    timerRef.current = setInterval(() => {
      setStudyTimeLeft((prev) => {
        if (prev <= 1) {
          // 时间到，进入测试阶段
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          engine.startTest();
          setPhase("test");
          setCurrentQuestion(engine.getCurrentQuestion());
          setProgress(engine.getProgress());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [engine]);


  // 开始游戏
  const startGame = useCallback(() => {
    initializeEngine(difficulty);
  }, [difficulty, initializeEngine]);

  // 当引擎初始化后自动开始学习
  useEffect(() => {
    if (engine && phase === "setup") {
      startStudy();
    }
  }, [engine, phase, startStudy]);

  // 处理回答
  const handleAnswer = useCallback(async (answer: string) => {
    if (!engine || phase !== "test" || showFeedback) return;

    const isCorrect = engine.respond(answer);
    setLastAnswer(answer);
    setLastCorrect(isCorrect);
    setShowFeedback(true);

    // 短暂显示反馈后更新到下一个问题
    setTimeout(() => {
      setShowFeedback(false);
      setLastAnswer(null);
      setLastCorrect(null);

      if (engine.isComplete()) {
        const gameResult = engine.calculateResult();
        setResult(gameResult);
        setPhase("result");

        // 保存记录
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
        })
          .catch((error) => {
            console.error("Failed to save record:", error);
          })
          .finally(() => {
            setIsSaving(false);
          });
      } else {
        setCurrentQuestion(engine.getCurrentQuestion());
        setProgress(engine.getProgress());
      }
    }, 500);
  }, [engine, phase, showFeedback, difficulty]);

  // 重新开始（相同难度）
  const handleRestart = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setResult(null);
    setPhase("setup");
    initializeEngine(difficulty);
  }, [difficulty, initializeEngine]);

  // 更换难度
  const handleChangeDifficulty = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setEngine(null);
    setResult(null);
    setPhase("setup");
  }, []);

  // 处理难度选择
  const handleDifficultySelect = useCallback((diff: number) => {
    setDifficulty(diff);
  }, []);

  const config = getSceneConfigFromDifficulty(difficulty);

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
          <h1 className="text-lg font-semibold text-gray-900">情景记忆训练</h1>
          <div className="w-12" />
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && !engine && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">训练说明</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                屏幕上会显示一个包含多个物品的场景。
                在限定时间内记住每个物品及其位置。
                然后回答关于物品和位置的问题。
                这项训练可以提升你的情景记忆能力。
              </p>
            </div>

            <SceneDifficultySelector
              selectedDifficulty={difficulty}
              onSelect={handleDifficultySelect}
            />

            {/* 配置预览 */}
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
                    {config.testType === "item"
                      ? "物品记忆"
                      : config.testType === "spatial"
                      ? "位置记忆"
                      : "物品+位置记忆"}
                  </span>
                </div>
              </div>
            </div>

            <button onClick={startGame} className="btn-primary w-full text-lg py-4">
              开始训练
            </button>
          </div>
        )}


        {/* 学习阶段 */}
        {phase === "study" && (
          <div className="space-y-6">
            {/* 倒计时 */}
            <div className="card text-center">
              <p className="text-sm text-gray-500 mb-2">记忆时间</p>
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={276.46}
                    strokeDashoffset={276.46 * (1 - studyTimeLeft / config.studyTime)}
                    className="text-purple-500 transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-3xl font-bold text-purple-600">
                  {studyTimeLeft}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">仔细记住每个物品的位置</p>
            </div>

            {/* 场景显示 */}
            <SceneDisplay elements={elements} showElements={true} />

            {/* 提示 */}
            <div className="card bg-purple-50 border-purple-200">
              <p className="text-sm text-purple-700 text-center">
                💡 记住物品的类型和它们在场景中的位置
              </p>
            </div>

            {/* 放弃按钮 */}
            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">
              放弃本次训练
            </button>
          </div>
        )}

        {/* 测试阶段 */}
        {phase === "test" && (
          <div className="space-y-6">
            {/* 进度指示 */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">测试进度</span>
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

            {/* 场景显示（隐藏元素） */}
            <SceneDisplay elements={elements} showElements={false} />

            {/* 问题 */}
            <SceneQuestion
              question={currentQuestion}
              onAnswer={handleAnswer}
              disabled={showFeedback}
              lastAnswer={lastAnswer}
              lastCorrect={lastCorrect}
              showFeedback={showFeedback}
            />

            {/* 放弃按钮 */}
            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">
              放弃本次训练
            </button>
          </div>
        )}

        {/* 结果阶段 */}
        {phase === "result" && result && (
          <div className="space-y-4">
            <SceneResult
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
