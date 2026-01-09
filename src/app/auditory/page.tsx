"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import {
  SoundMatchBoard,
  SoundMatchStatus,
  SoundMatchResult,
  SoundMatchDifficultySelector,
} from "@/components/soundMatch";
import { TrainingIntro, Leaderboard } from "@/components/shared";
import {
  SoundMatchEngine,
  getSoundMatchConfigFromDifficulty,
  playSpeech,
  type SoundMatchResult as SoundMatchResultType,
} from "@/engines/soundMatch";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "playing" | "result";

const SOUND_MATCH_INTRO = {
  title: "训练说明",
  description:
    "屏幕上有多张卡片，每张卡片隐藏着一个声音。点击卡片听声音，找出声音相同的两张卡片进行配对。用最少的尝试次数完成所有配对。",
  benefits: [
    "训练听觉记忆能力",
    "提升声音辨别能力",
    "增强听觉注意力",
    "改善工作记忆",
    "锻炼听觉-空间关联",
  ],
  tips: [
    "仔细听每个声音的特征",
    "记住声音的位置",
    "不要急于点击，先听完再判断",
    "利用声音的独特性辅助记忆",
    "尝试在脑中复述声音",
  ],
  referenceData: [
    {
      title: "表现标准",
      items: [
        { label: "优秀", value: "一次配对>60%" },
        { label: "良好", value: "一次配对40-60%" },
        { label: "一般", value: "一次配对<40%" },
      ],
    },
    {
      title: "效率参考",
      items: [
        { label: "完美", value: "尝试=配对数" },
        { label: "优秀", value: "尝试<配对数×1.5" },
        { label: "良好", value: "尝试<配对数×2" },
      ],
    },
  ],
};

export default function AuditoryPage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<SoundMatchEngine | null>(null);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);
  const [result, setResult] = useState<SoundMatchResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchFeedback, setMatchFeedback] = useState<'success' | 'fail' | null>(null);
  const [, forceUpdate] = useSta

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const initializeEngine = useCallback((diff: number) => {
    const config = getSoundMatchConfigFromDifficulty(diff);
    const newEngine = new SoundMatchEngine(config);
    setEngine(newEngine);
    setPlayingCardId(null);
    setIsProcessing(false);
    return newEngine;
  }, []);

  const startGame = useCallback(() => {
    const eng = initializeEngine(difficulty);
    eng.start();
    setPhase("playing");
  }, [difficulty, initializeEngine]);


  const handleCardClick = useCallback(async (cardId: string) => {
    if (!engine || isProcessing) return;

    const res = engine.selectCard(cardId);
    if (!res.success) return;

    forceUpdate({});

    // 播放声音
    if (res.sound) {
      setPlayingCardId(cardId);
      await playSpeech(res.sound.speech);
      setPlayingCardId(null);
    }

    // 如果选了两张卡片
    const selected = engine.getSelectedCards();
    if (selected.length === 2) {
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 800));

      if (res.isMatch) {
        engine.clearSelection();
        forceUpdate({});

        // 检查是否完成所有配对
        if (engine.getMatchedPairs() >= engine.getTotalPairs()) {
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
              pairCount: gameResult.pairCount,
              matchedPairs: gameResult.matchedPairs,
              attempts: gameResult.attempts,
              perfectMatches: gameResult.perfectMatches,
            },
          })
            .catch((error) => console.error("Failed to save record:", error))
            .finally(() => setIsSaving(false));
          return;
        }
      } else {
        engine.resetSelection();
        forceUpdate({});
      }
      setIsProcessing(false);
    }
  }, [engine, isProcessing, difficulty]);

  const handleRestart = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setResult(null);
    startGame();
  }, [startGame]);

  const handleChangeDifficulty = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setEngine(null);
    setResult(null);
    setPhase("setup");
  }, []);

  return (
    <PageLayout showNav={false}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">声音配对记忆</h1>
          <div className="w-12" />
        </div>

        {phase === "setup" && (
          <div className="space-y-4">
            <TrainingIntro {...SOUND_MATCH_INTRO} />
            <SoundMatchDifficultySelector selectedDifficulty={difficulty} onSelect={setDifficulty} />
            <Leaderboard moduleType="auditory" />
            <button onClick={startGame} className="btn-primary w-full text-lg py-4">开始训练</button>
          </div>
        )}

        {phase === "playing" && engine && (
          <div className="space-y-4">
            <SoundMatchStatus
              matchedPairs={engine.getMatchedPairs()}
              totalPairs={engine.getTotalPairs()}
              attempts={engine.getAttempts()}
              timeLeft={null}
            />
            <div className="card">
              <SoundMatchBoard
                cards={engine.getCards()}
                playingCardId={playingCardId}
                onCardClick={handleCardClick}
                disabled={isProcessing}
              />
            </div>
            <div className="card bg-purple-50 border-purple-200">
              <p className="text-sm text-purple-700 text-center">🎧 点击卡片听声音，找出相同声音的配对</p>
            </div>
            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">放弃训练</button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-4">
            <SoundMatchResult result={result} onRestart={handleRestart} onChangeDifficulty={handleChangeDifficulty} />
            <Leaderboard moduleType="auditory" currentScore={result.score} currentDuration={result.duration} />
            {isSaving && <p className="text-center text-sm text-gray-500">正在保存记录...</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
