"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import {
  SimonBoard,
  SimonStatus,
  SimonResult,
  SimonDifficultySelector,
} from "@/components/simon";
import { TrainingIntro, Leaderboard } from "@/components/shared";
import {
  SimonEngine,
  getSimonConfigFromDifficulty,
  playTone,
  type SimonResult as SimonResultType,
  type SoundId,
} from "@/engines/simon";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "playing" | "result";

const SIMON_INTRO = {
  title: "训练说明",
  description:
    "系统会播放一段声音序列，每个声音对应一个动物图标。仔细听并记住顺序，然后按相同顺序点击图标重复。每成功一轮，序列会增加一个声音。",
  benefits: [
    "训练听觉工作记忆",
    "提升序列记忆能力",
    "增强注意力集中",
    "改善听觉-动作协调",
    "锻炼短期记忆容量",
  ],
  tips: [
    "专注听每个声音的特征",
    "在脑中默念声音顺序",
    "利用图标位置辅助记忆",
    "保持节奏稳定地输入",
    "错误后不要慌张，重新开始",
  ],
  referenceData: [
    {
      title: "记忆容量参考",
      items: [
        { label: "普通人", value: "5-7个" },
        { label: "训练后", value: "8-10个" },
        { label: "记忆高手", value: "12+个" },
      ],
    },
    {
      title: "表现标准",
      items: [
        { label: "入门", value: "序列4-5" },
        { label: "良好", value: "序列6-7" },
        { label: "优秀", value: "序列8-9" },
        { label: "大师", value: "序列10+" },
      ],
    },
  ],
};


export default function AuditoryPage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<SimonEngine | null>(null);
  const [activeSound, setActiveSound] = useState<SoundId | null>(null);
  const [result, setResult] = useState<SimonResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [gamePhase, setGamePhase] = useState<"watch" | "repeat" | "feedback">("watch");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [, forceUpdate] = useState({});

  const playingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const playSequence = useCallback(async (eng: SimonEngine) => {
    if (playingRef.current) return;
    playingRef.current = true;

    const sequence = eng.getSequence();
    const sounds = eng.getActiveSounds();
    const config = eng.getConfig();

    setGamePhase("watch");
    await new Promise(r => setTimeout(r, 500));

    for (let i = 0; i < sequence.length; i++) {
      if (!playingRef.current) break;
      const soundId = sequence[i];
      const sound = sounds.find(s => s.id === soundId);
      if (sound) {
        eng.setPlayIndex(i);
        setActiveSound(soundId);
        await playTone(sound.freq, 300);
        await new Promise(r => setTimeout(r, 100));
        setActiveSound(null);
        await new Promise(r => setTimeout(r, config.playSpeed - 400));
      }
    }

    eng.setPlayIndex(-1);
    eng.finishPlaying();
    setGamePhase("repeat");
    playingRef.current = false;
  }, []);

  const initializeEngine = useCallback((diff: number) => {
    const config = getSimonConfigFromDifficulty(diff);
    const newEngine = new SimonEngine(config);
    setEngine(newEngine);
    setActiveSound(null);
    setFeedbackMessage(null);
    setGamePhase("watch");
    return newEngine;
  }, []);

  const startGame = useCallback(() => {
    const eng = initializeEngine(difficulty);
    eng.start();
    setPhase("playing");
    setTimeout(() => playSequence(eng), 300);
  }, [difficulty, initializeEngine, playSequence]);

  const handleSoundClick = useCallback((soundId: SoundId) => {
    if (!engine || gamePhase !== "repeat") return;
    setActiveSound(soundId);
    setTimeout(() => setActiveSound(null), 150);

    const res = engine.input(soundId);
    forceUpdate({});

    if (res.roundComplete) {
      setGamePhase("feedback");
      if (res.complete) {
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
            highestLength: gameResult.highestLength,
            totalRounds: gameResult.totalRounds,
            correctRounds: gameResult.correctRounds,
            avgSequenceLength: gameResult.avgSequenceLength,
          },
        })
          .catch((error) => console.error("Failed to save record:", error))
          .finally(() => setIsSaving(false));
      } else {
        if (res.correct) {
          setFeedbackMessage("太棒了！准备下一轮...");
          timeoutRef.current = setTimeout(() => {
            engine.nextRound();
            setFeedbackMessage(null);
            forceUpdate({});
            playSequence(engine);
          }, 1500);
        } else {
          setFeedbackMessage(`错误！还剩 ${engine.getLives()} 条命`);
          timeoutRef.current = setTimeout(() => {
            engine.retryRound();
            setFeedbackMessage(null);
            forceUpdate({});
            playSequence(engine);
          }, 2000);
        }
      }
    }
  }, [engine, gamePhase, difficulty, playSequence]);

  const handleRestart = useCallback(() => {
    playingRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setResult(null);
    startGame();
  }, [startGame]);

  const handleChangeDifficulty = useCallback(() => {
    playingRef.current = false;
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
          <h1 className="text-lg font-semibold text-gray-900">声音序列记忆</h1>
          <div className="w-12" />
        </div>

        {phase === "setup" && (
          <div className="space-y-4">
            <TrainingIntro {...SIMON_INTRO} />
            <SimonDifficultySelector selectedDifficulty={difficulty} onSelect={setDifficulty} />
            <Leaderboard moduleType="auditory" />
            <button onClick={startGame} className="btn-primary w-full text-lg py-4">开始训练</button>
          </div>
        )}

        {phase === "playing" && engine && (
          <div className="space-y-4">
            <SimonStatus
              round={engine.getRound()}
              sequenceLength={engine.getSequenceLength()}
              lives={engine.getLives()}
              maxLives={engine.getMaxLives()}
              highestLength={engine.getHighestLength()}
              phase={gamePhase}
              userInputLength={engine.getUserInput().length}
            />
            {feedbackMessage && (
              <div className={`card text-center py-4 ${engine.getLastRoundCorrect() ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <p className={`font-medium ${engine.getLastRoundCorrect() ? "text-green-700" : "text-red-700"}`}>{feedbackMessage}</p>
              </div>
            )}
            <div className="card py-8">
              <SimonBoard
                sounds={engine.getActiveSounds()}
                activeSound={activeSound}
                onSoundClick={handleSoundClick}
                disabled={gamePhase !== "repeat"}
                mode={gamePhase === "repeat" ? "repeat" : "watch"}
              />
            </div>
            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">放弃训练</button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-4">
            <SimonResult result={result} onRestart={handleRestart} onChangeDifficulty={handleChangeDifficulty} />
            <Leaderboard moduleType="auditory" currentScore={result.score} currentDuration={result.duration} />
            {isSaving && <p className="text-center text-sm text-gray-500">正在保存记录...</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
