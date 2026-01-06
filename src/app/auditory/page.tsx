"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import { AuditoryDisplay, ResponseButton, AuditoryResult, AuditoryDifficultySelector } from "@/components/auditory";
import { TrainingIntro, Leaderboard } from "@/components/shared";
import { AuditoryEngine, getAuditoryConfigFromDifficulty, type AuditoryResult as AuditoryResultType, type ChineseSound } from "@/engines/auditory";
import { saveRecord } from "@/services/storage";
import { useTimer } from "@/components/shared";

type GamePhase = "setup" | "playing" | "result";
type FeedbackType = "hit" | "miss" | "falseAlarm" | "correctRejection" | null;

const AUDITORY_INTRO = {
  title: "训练说明",
  description: "系统会播放一系列中文数字语音。你需要在听到目标声音时，尽快点击响应按钮。听到其他声音时不要点击。",
  benefits: [
    "提升听觉选择性注意能力",
    "增强听觉信息处理速度",
    "改善持续性注意力",
    "训练快速反应能力",
    "有助于提高听力理解能力",
  ],
  tips: [
    "确保设备音量适中",
    "在安静环境中进行训练",
    "专注于目标声音的特征",
    "保持稳定的反应节奏",
    "避免过度紧张导致误按",
  ],
  referenceData: [
    {
      title: "表现标准",
      items: [
        { label: "优秀命中率", value: ">95%" },
        { label: "良好命中率", value: "85-95%" },
        { label: "虚报率控制", value: "<10%" },
        { label: "平均反应时间", value: "300-500ms" },
      ],
    },
    {
      title: "训练效果",
      items: [
        { label: "初学者", value: "命中率80%左右" },
        { label: "熟练者", value: "命中率95%以上" },
        { label: "专家水平", value: "反应时间<300ms" },
      ],
    },
  ],
};

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
  
  const timer = useTimer();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (speechSynthesis.speaking) speechSynthesis.cancel();
    };
  }, []);

  const playSound = useCallback((sound: ChineseSound) => {
    return new Promise<void>((resolve) => {
      if (speechSynthesis.speaking) speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sound);
      utterance.lang = "zh-CN";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speechSynthRef.current = utterance;
      speechSynthesis.speak(utterance);
    });
  }, []);

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
    }).catch((error) => console.error("Failed to save record:", error)).finally(() => setIsSaving(false));
  }, [engine, difficulty]);

  const handleNoResponse = useCallback(() => {
    if (!engine || engine.isComplete()) return;
    const trial = engine.getCurrentTrial();
    if (!trial) return;
    engine.advance();
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
  }, [engine, finishGame]);

  const playNextTrial = useCallback(async () => {
    if (!engine || engine.isComplete()) return;
    const trial = engine.getCurrentTrial();
    if (!trial) return;
    setHasResponded(false);
    setCurrentSound(trial.sound);
    setIsPlaying(true);
    setShowFeedback(false);
    setFeedbackType(null);
    await playSound(trial.sound);
    setIsPlaying(false);
    const config = engine.getConfig();
    const responseWindow = config.interStimulusInterval || 1000;
    timerRef.current = setTimeout(() => {
      if (!hasResponded) handleNoResponse();
    }, responseWindow);
  }, [engine, playSound, hasResponded, handleNoResponse]);

  const handleRespond = useCallback(() => {
    if (!engine || phase !== "playing" || hasResponded) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHasResponded(true);
    setIsButtonPressed(true);
    const response = engine.respond();
    setTimeout(() => setIsButtonPressed(false), 150);
    if (response) {
      setShowFeedback(true);
      if (response.hit) setFeedbackType("hit");
      else if (response.falseAlarm) setFeedbackType("falseAlarm");
      engine.advance();
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackType(null);
        if (engine.isComplete()) finishGame();
        else {
          setProgress(engine.getProgress());
          playNextTrial();
        }
      }, 500);
    }
  }, [engine, phase, hasResponded, playNextTrial, finishGame]);

  const startGame = useCallback(() => {
    initializeEngine(difficulty);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  useEffect(() => {
    if (phase === "playing" && engine && !engine.isComplete()) {
      engine.start();
      timer.start();
      const startDelay = setTimeout(() => playNextTrial(), 1000);
      return () => clearTimeout(startDelay);
    }
  }, [phase, engine]);

  const handleRestart = useCallback(() => {
    initializeEngine(difficulty);
    setResult(null);
    setPhase("playing");
  }, [difficulty, initializeEngine]);

  const handleChangeDifficulty = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (speechSynthesis.speaking) speechSynthesis.cancel();
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

  const config = getAuditoryConfigFromDifficulty(difficulty);

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
          <h1 className="text-lg font-semibold text-gray-900">听觉注意训练</h1>
          <div className="w-12" />
        </div>

        {phase === "setup" && (
          <div className="space-y-6">
            <TrainingIntro {...AUDITORY_INTRO} />
            <AuditoryDifficultySelector selectedDifficulty={difficulty} onSelect={setDifficulty} />
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-3">训练配置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">试次数量：</span>
                  <span className="font-semibold text-gray-800">{config.trialCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">目标比例：</span>
                  <span className="font-semibold text-gray-800">{Math.round(config.targetRatio * 100)}%</span>
                </div>
              </div>
            </div>
            <div className="card bg-yellow-50 border-yellow-200">
              <p className="text-sm text-yellow-800"><strong>提示：</strong>请确保设备音量已开启，训练将使用语音播放功能。</p>
            </div>
            <Leaderboard moduleType="auditory" />
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
                <div className="bg-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
            </div>
            <div className="card">
              <AuditoryDisplay currentSound={currentSound} targetSound={engine.getTargetSound()} isPlaying={isPlaying} showFeedback={showFeedback} feedbackType={feedbackType} />
            </div>
            <div className="flex justify-center">
              <ResponseButton onRespond={handleRespond} disabled={showFeedback || hasResponded} isPressed={isButtonPressed} />
            </div>
            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">放弃本次训练</button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-4">
            <AuditoryResult result={result} onRestart={handleRestart} onChangeDifficulty={handleChangeDifficulty} />
            <Leaderboard moduleType="auditory" currentScore={result.score} currentDuration={result.duration} />
            {isSaving && <p className="text-center text-sm text-gray-500">正在保存记录...</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
