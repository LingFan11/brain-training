"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { 
  SequenceDifficultySelector, 
  SequenceDisplay, 
  SequenceControls, 
  SequenceResult 
} from "@/components/sequence";
import { 
  SequenceEngine, 
  getSequenceConfigFromDifficulty,
  type SequenceResult as SequenceResultType,
  type SequenceItem,
} from "@/engines/sequence";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "playing" | "result";
type FeedbackType = "hit" | "miss" | "falseAlarm" | "correctRejection" | null;

// 刺激显示时间（毫秒）
const STIMULUS_DURATION = 2500;
// 刺激间隔时间（毫秒）
const INTER_STIMULUS_INTERVAL = 500;

export default function SequencePage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<SequenceEngine | null>(null);
  const [currentItem, setCurrentItem] = useState<SequenceItem | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [result, setResult] = useState<SequenceResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // 初始化引擎
  const initializeEngine = useCallback((diff: number) => {
    const config = getSequenceConfigFromDifficulty(diff);
    const newEngine = new SequenceEngine(config);
    setEngine(newEngine);
    setCurrentItem(null);
    setProgress({ current: 0, total: config.sequenceLength });
    setShowFeedback(false);
    setFeedbackType(null);
    setCanRespond(false);
    setHasResponded(false);
  }, []);

  // 前进到下一个刺激
  const advanceToNext = useCallback((eng: SequenceEngine) => {
    const hasMore = eng.advance();
    
    if (!hasMore) {
      // 训练完成
      const gameResult = eng.calculateResult();
      setResult(gameResult);
      setPhase("result");
      setCurrentItem(null);
      
      // 保存记录
      setIsSaving(true);
      saveRecord({
        moduleType: "sequence",
        score: gameResult.score,
        accuracy: gameResult.accuracy,
        duration: Math.round(gameResult.duration),
        difficulty: difficulty,
        details: {
          nBack: gameResult.nBack,
          sequenceLength: gameResult.sequenceLength,
          hitRate: gameResult.hitRate,
          falseAlarmRate: gameResult.falseAlarmRate,
          dPrime: gameResult.dPrime,
          hits: gameResult.hits,
          misses: gameResult.misses,
          falseAlarms: gameResult.falseAlarms,
          correctRejections: gameResult.correctRejections,
          avgResponseTime: gameResult.avgResponseTime,
        },
      }).catch((error) => {
        console.error("Failed to save record:", error);
      }).finally(() => {
        setIsSaving(false);
      });
    } else {
      // 显示下一个刺激
      setCurrentItem(eng.getCurrentItem());
      setProgress(eng.getProgress());
      setCanRespond(true);
      setHasResponded(false);
      setShowFeedback(false);
      setFeedbackType(null);
      
      // 设置自动前进定时器
      advanceTimerRef.current = setTimeout(() => {
        if (!eng.isComplete()) {
          // 如果用户没有响应，自动前进
          setCanRespond(false);
          setShowFeedback(true);
          
          // 获取当前项的状态来显示反馈
          const item = eng.getCurrentItem();
          if (item?.isTarget) {
            setFeedbackType("miss");
          } else {
            setFeedbackType("correctRejection");
          }
          
          // 短暂显示反馈后前进
          timerRef.current = setTimeout(() => {
            advanceToNext(eng);
          }, INTER_STIMULUS_INTERVAL);
        }
      }, STIMULUS_DURATION);
    }
  }, [difficulty]);

  // 开始游戏
  const startGame = useCallback(() => {
    clearTimers();
    initializeEngine(difficulty);
    setPhase("playing");
    
    // 延迟启动引擎
    setTimeout(() => {
      const config = getSequenceConfigFromDifficulty(difficulty);
      const newEngine = new SequenceEngine(config);
      newEngine.start();
      setEngine(newEngine);
      setCurrentItem(newEngine.getCurrentItem());
      setProgress(newEngine.getProgress());
      setCanRespond(true);
      
      // 设置自动前进定时器
      advanceTimerRef.current = setTimeout(() => {
        if (!newEngine.isComplete()) {
          setCanRespond(false);
          setShowFeedback(true);
          
          const item = newEngine.getCurrentItem();
          if (item?.isTarget) {
            setFeedbackType("miss");
          } else {
            setFeedbackType("correctRejection");
          }
          
          timerRef.current = setTimeout(() => {
            advanceToNext(newEngine);
          }, INTER_STIMULUS_INTERVAL);
        }
      }, STIMULUS_DURATION);
    }, 500);
  }, [difficulty, initializeEngine, clearTimers, advanceToNext]);


  // 处理用户响应
  const handleResponse = useCallback((isMatch: boolean) => {
    if (!engine || phase !== "playing" || !canRespond || hasResponded) return;
    
    clearTimers();
    setHasResponded(true);
    setCanRespond(false);
    
    const response = engine.respond(isMatch);
    
    if (response) {
      // 显示反馈
      setShowFeedback(true);
      if (response.hit) {
        setFeedbackType("hit");
      } else if (response.miss) {
        setFeedbackType("miss");
      } else if (response.falseAlarm) {
        setFeedbackType("falseAlarm");
      } else {
        setFeedbackType("correctRejection");
      }
      
      // 短暂显示反馈后前进
      timerRef.current = setTimeout(() => {
        advanceToNext(engine);
      }, INTER_STIMULUS_INTERVAL);
    }
  }, [engine, phase, canRespond, hasResponded, clearTimers, advanceToNext]);

  // 重新开始（相同难度）
  const handleRestart = useCallback(() => {
    clearTimers();
    setResult(null);
    startGame();
  }, [clearTimers, startGame]);

  // 更换难度
  const handleChangeDifficulty = useCallback(() => {
    clearTimers();
    setResult(null);
    setPhase("setup");
  }, [clearTimers]);

  // 处理难度选择
  const handleDifficultySelect = useCallback((diff: number) => {
    setDifficulty(diff);
  }, []);

  const config = getSequenceConfigFromDifficulty(difficulty);

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
          <h1 className="text-lg font-semibold text-gray-900">序列记忆训练</h1>
          <div className="w-12" />
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">训练说明</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                屏幕上会依次显示字母。你需要判断当前字母是否与<strong>N步之前</strong>的字母相同。
                例如在2-back任务中，判断当前字母是否与2步前的字母相同。
                这项训练可以提升你的工作记忆容量。
              </p>
            </div>

            <SequenceDifficultySelector
              selectedDifficulty={difficulty}
              onSelect={handleDifficultySelect}
            />

            {/* 配置预览 */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-3">训练配置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">N-back级别：</span>
                  <span className="font-semibold text-gray-800">{config.nBack}-back</span>
                </div>
                <div>
                  <span className="text-gray-500">序列长度：</span>
                  <span className="font-semibold text-gray-800">{config.sequenceLength}</span>
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
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* 刺激显示 */}
            <div className="card">
              <SequenceDisplay
                item={currentItem}
                stimulusType={config.stimulusType}
                showFeedback={showFeedback}
                feedbackType={feedbackType}
                nBack={config.nBack}
              />
            </div>

            {/* 响应按钮 */}
            <SequenceControls
              onMatch={() => handleResponse(true)}
              onNoMatch={() => handleResponse(false)}
              disabled={showFeedback}
              canRespond={canRespond && !hasResponded}
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
            <SequenceResult
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
