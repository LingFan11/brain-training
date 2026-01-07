"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { SequenceDifficultySelector, CorsiBoard, SequenceResult } from "@/components/sequence";
import { 
  SequenceEngine, 
  getSequenceConfigFromDifficulty,
} from "@/engines/sequence";
import type { CorsiResult, BlockPosition } from "@/engines/sequence";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "playing" | "result";

export default function SequencePage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<SequenceEngine | null>(null);
  const [blocks, setBlocks] = useState<BlockPosition[]>([]);
  const [highlightedBlock, setHighlightedBlock] = useState<number | null>(null);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [currentLength, setCurrentLength] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState<CorsiResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [statusText, setStatusText] = useState("");
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // 显示序列动画
  const showSequence = useCallback((eng: SequenceEngine) => {
    const config = eng.getConfig();
    setIsShowingSequence(true);
    setStatusText("观察序列...");
    setUserInput([]);
    
    const showNext = () => {
      const blockId = eng.showNextBlock();
      
      if (blockId === null) {
        // 序列显示完毕
        setHighlightedBlock(null);
        setIsShowingSequence(false);
        setStatusText(config.isReverse ? "请倒序点击方块" : "请按顺序点击方块");
      } else {
        setHighlightedBlock(blockId);
        
        // 显示一段时间后熄灭
        timerRef.current = setTimeout(() => {
          setHighlightedBlock(null);
          
          // 间隔后显示下一个
          timerRef.current = setTimeout(() => {
            showNext();
          }, config.intervalTime);
        }, config.displayTime);
      }
    };
    
    // 开始显示
    timerRef.current = setTimeout(showNext, 500);
  }, []);

  // 开始游戏
  const startGame = useCallback(() => {
    clearTimer();
    const config = getSequenceConfigFromDifficulty(difficulty);
    const newEngine = new SequenceEngine(config);
    newEngine.start();
    
    setEngine(newEngine);
    setBlocks(newEngine.getBlocks());
    setCurrentLength(newEngine.getCurrentSequenceLength());
    setPhase("playing");
    setShowFeedback(false);
    setIsCorrect(null);
    setUserInput([]);
    
    // 开始显示序列
    showSequence(newEngine);
  }, [difficulty, clearTimer, showSequence]);

  // 处理方块点击
  const handleBlockTap = useCallback((blockId: number) => {
    if (!engine || isShowingSequence || showFeedback) return;
    
    const result = engine.tapBlock(blockId);
    if (!result) return;
    
    // 更新用户输入显示
    const round = engine.getCurrentRound();
    if (round) {
      setUserInput([...round.userInput]);
    }
    
    if (result.complete) {
      // 本轮结束
      setShowFeedback(true);
      setIsCorrect(result.correct);
      setStatusText(result.correct ? "正确！" : "错误");
      
      // 延迟后进入下一轮或结束
      timerRef.current = setTimeout(() => {
        const hasNext = engine.nextRound();
        
        if (hasNext) {
          setShowFeedback(false);
          setIsCorrect(null);
          setCurrentLength(engine.getCurrentSequenceLength());
          showSequence(engine);
        } else {
          // 训练结束
          const gameResult = engine.calculateResult();
          setResult(gameResult);
          setPhase("result");
          
          setIsSaving(true);
          saveRecord({
            moduleType: "sequence",
            score: gameResult.score,
            accuracy: gameResult.accuracy,
            duration: Math.round(gameResult.duration),
            difficulty: difficulty,
            details: {
              maxSpan: gameResult.maxSpan,
              totalRounds: gameResult.totalRounds,
              correctRounds: gameResult.correctRounds,
              errorCount: gameResult.errorCount,
              avgResponseTime: gameResult.avgResponseTime,
              isReverse: gameResult.isReverse,
            },
          }).catch(console.error).finally(() => setIsSaving(false));
        }
      }, 1500);
    }
  }, [engine, isShowingSequence, showFeedback, difficulty, showSequence]);

  const handleRestart = useCallback(() => {
    clearTimer();
    setResult(null);
    startGame();
  }, [clearTimer, startGame]);

  const handleChangeDifficulty = useCallback(() => {
    clearTimer();
    setResult(null);
    setPhase("setup");
  }, [clearTimer]);

  const config = getSequenceConfigFromDifficulty(difficulty);

  return (
    <PageLayout showNav={false}>
      <div className="space-y-6">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Corsi 方块测试</h1>
          <div className="w-12" />
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">训练说明</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                屏幕上会有9个方块随机分布。方块会依次闪烁，你需要记住闪烁的顺序，
                然后按<strong>相同顺序</strong>（或高难度下<strong>倒序</strong>）点击方块。
                每轮成功后序列会变长，直到达到你的记忆极限。
              </p>
            </div>

            <SequenceDifficultySelector
              selectedDifficulty={difficulty}
              onSelect={setDifficulty}
            />

            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-3">训练配置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">起始长度：</span>
                  <span className="font-semibold text-gray-800">{config.startLength}格</span>
                </div>
                <div>
                  <span className="text-gray-500">模式：</span>
                  <span className="font-semibold text-gray-800">
                    {config.isReverse ? "倒序" : "正序"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">闪烁时间：</span>
                  <span className="font-semibold text-gray-800">{config.displayTime}ms</span>
                </div>
                <div>
                  <span className="text-gray-500">允许错误：</span>
                  <span className="font-semibold text-gray-800">{config.maxErrors}次</span>
                </div>
              </div>
            </div>

            <button onClick={startGame} className="btn-primary w-full text-lg py-4">
              开始训练
            </button>
          </div>
        )}

        {/* 游戏阶段 */}
        {phase === "playing" && (
          <div className="space-y-4">
            {/* 状态栏 */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">当前跨度</span>
                  <p className="text-2xl font-bold text-indigo-600">{currentLength}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">
                    {config.isReverse ? "倒序模式" : "正序模式"}
                  </span>
                  <p className={`text-sm font-medium ${
                    showFeedback 
                      ? (isCorrect ? "text-green-600" : "text-red-600")
                      : "text-gray-600"
                  }`}>
                    {statusText}
                  </p>
                </div>
              </div>
              
              {/* 输入进度 */}
              {!isShowingSequence && !showFeedback && (
                <div className="mt-3">
                  <div className="flex gap-1">
                    {Array.from({ length: currentLength }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full ${
                          i < userInput.length ? "bg-indigo-500" : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 方块区域 */}
            <CorsiBoard
              blocks={blocks}
              highlightedBlock={highlightedBlock}
              userInput={userInput}
              onBlockTap={handleBlockTap}
              disabled={isShowingSequence || showFeedback}
              showFeedback={showFeedback}
              isCorrect={isCorrect}
            />

            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">
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
