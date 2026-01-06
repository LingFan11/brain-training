"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { 
  AuditoryDisplay, 
  ResponseButton, 
  AuditoryResult, 
  AuditoryDifficultySelector 
} from "@/components/auditory";
import { 
  AuditoryEngine, 
  getAuditoryConfigFromDifficulty,
  type AuditoryResult as AuditoryResultType,
  type ChineseSound,
} from "@/engines/auditory";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "playing" | "result";
type FeedbackType = "hit" | "miss" | "falseAlarm" | "correctRejection" | null;

export default function AuditoryPage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<AuditoryEngine | null>(null);
  const [currentSound, setCurrentSound] = useState<ChineseSound | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [result, setResult] = useState<AuditoryResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // 播放声音（使用Web Speech API）
  const playSound = useCallback((sound: ChineseSound) => {
    return new Promise<void>((resolve) => {
      // 取消之前的语音
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(sound);
      utterance.lang = "zh-CN";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => {
        resolve();
      };
      
      utterance.onerror = () => {
        resolve();
      };

      speechSynthRef.current = utterance;
      speechSynthesis.speak(utterance);
    });
  }, []);


  // 初始化引擎
  const initializeEngine = useCallback((diff: number) => {
    const config = getAuditoryConfigFromDifficulty(diff);
    const newEngine = new AuditoryEngine(config);
    setEngine(newEngine);
    setProgress(newEngine.getProgress());
    setCurrentSound(null);
    setIsPlaying(false);
    setShowFeedback(false);
    setFeedbackType(null);
    setHasResponded(false);
  }, []);

  // 播放下一个试次
  const playNextTrial = useCallback(async () => {
    if (!engine || engine.isComplete()) return;

    const trial = engine.getCurrentTrial();
    if (!trial) return;

    setHasResponded(false);
    setCurrentSound(trial.sound);
    setIsPlaying(true);
    setShowFeedback(false);
    setFeedbackType(null);

    // 播放声音
    await playSound(trial.sound);
    
    setIsPlaying(false);

    // 等待用户响应的时间窗口
    const config = engine.getConfig();
    const responseWindow = config.interStimulusInterval || 1000;

    timerRef.current = setTimeout(() => {
      // 如果用户没有响应，自动前进
      if (!hasResponded) {
        handleNoResponse();
      }
    }, responseWindow);
  }, [engine, playSound, hasResponded]);

  // 处理无响应
  const handleNoResponse = useCallback(() => {
    if (!engine || engine.isComplete()) return;

    const trial = engine.getCurrentTrial();
    if (!trial) return;

    // 前进到下一个试次（会自动记录未响应）
    engine.advance();
    
    // 显示反馈
    setShowFeedback(true);
    setFeedbackType(trial.isTarget ? "miss" : "correctRejection");

    setTimeout(() => {
      setShowFeedback(false);
      setFeedbackType(null);
      
      if (engine.isComplete()) {
        finishGame();
      } else {
        setProgress(engine.getProgress());
        playNextTrial();
      }
    }, 500);
  }, [engine]);

  // 处理用户响应
  const handleRespond = useCallback(() => {
    if (!engine || phase !== "playing" || hasResponded) return;

    // 清除等待定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setHasResponded(true);
    setIsButtonPressed(true);

    const response = engine.respond();
    
    setTimeout(() => {
      setIsButtonPressed(false);
    }, 150);

    if (response) {
      // 显示反馈
      setShowFeedback(true);
      if (response.hit) {
        setFeedbackType("hit");
      } else if (response.falseAlarm) {
        setFeedbackType("falseAlarm");
      }

      // 前进到下一个试次
      engine.advance();

      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackType(null);
        
        if (engine.isComplete()) {
          finishGame();
        } else {
          setProgress(engine.getProgress());
          playNextTrial();
        }
      }, 500);
    }
  }, [engine, phase, hasResponded, playNextTrial]);

  // 完成游戏
  const finishGame = useCallback(() => {
    if (!engine) return;

    const gameResult = engine.calculateResult();
    setResult(gameResult);
    setPhase("result");

    // 保存记录
    setIsSaving(true);
    saveRecord({
      moduleType: "auditory",
      score: gameResult.score,
      accuracy: gameResult.accuracy,
      duration: Math.round(gameResult.duration),
      difficulty: difficulty,
      details: {
        totalTrials: gameResult.totalTrials,
        hits: gameResult.hits,
        misses: gameResult.misses,
        falseAlarms: gameResult.falseAlarms,
        correctRejections: gameResult.correctRejections,
        hitRate: gameResult.hitRate,
        falseAlarmRate: gameResult.falseAlarmRate,
        dPrime: gameResult.dPrime,
        avgResponseTime: gameResult.avgResponseTime,
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

  // 游戏开始后播放第一个试次
  useEffect(() => {
    if (phase === "playing" && engine && !engine.isComplete()) {
      engine.start();
      // 短暂延迟后开始播放
      const startDelay = setTimeout(() => {
        playNextTrial();
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
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setResult(null);
    setPhase("setup");
  }, []);

  // 处理难度选择
  const handleDifficultySelect = useCallback((diff: number) => {
    setDifficulty(diff);
  }, []);

  const config = getAuditoryConfigFromDifficulty(difficulty);


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
          <h1 className="text-lg font-semibold text-gray-900">听觉注意训练</h1>
          <div className="w-12" />
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">训练说明</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                系统会播放一系列中文数字语音。你需要在听到<strong>目标声音</strong>时，
                尽快点击响应按钮。听到其他声音时不要点击。
                这项训练可以提升你的听觉选择性注意能力。
              </p>
            </div>

            <AuditoryDifficultySelector
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
                  <span className="text-gray-500">目标比例：</span>
                  <span className="font-semibold text-gray-800">
                    {Math.round(config.targetRatio * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="card bg-yellow-50 border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>提示：</strong>请确保设备音量已开启，训练将使用语音播放功能。
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
                  className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* 声音显示 */}
            <div className="card">
              <AuditoryDisplay
                currentSound={currentSound}
                targetSound={engine.getTargetSound()}
                isPlaying={isPlaying}
                showFeedback={showFeedback}
                feedbackType={feedbackType}
              />
            </div>

            {/* 响应按钮 */}
            <div className="flex justify-center">
              <ResponseButton
                onRespond={handleRespond}
                disabled={showFeedback || hasResponded}
                isPressed={isButtonPressed}
              />
            </div>

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
            <AuditoryResult
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
