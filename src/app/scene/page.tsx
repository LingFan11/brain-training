"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout";
import {
  PalaceRoom,
  PalaceItemTray,
  PalaceRoomNav,
  PalaceResult,
  PalaceDifficultySelector,
} from "@/components/palace";
import { TrainingIntro, Leaderboard } from "@/components/shared";
import {
  PalaceEngine,
  getPalaceConfigFromDifficulty,
  type PalaceResult as PalaceResultType,
  type PalaceItem,
  type Anchor,
  type Placement,
  PALACE_ITEMS,
} from "@/engines/palace";
import { saveRecord } from "@/services/storage";

type GamePhase = "setup" | "study" | "test" | "result";

const PALACE_INTRO = {
  title: "训练说明",
  description:
    "进入记忆宫殿，在不同房间的固定位置记住物品。然后将物品拖拽回正确的位置。这是一种经典的记忆术训练方法。",
  benefits: [
    "训练空间记忆能力",
    "学习记忆宫殿技术",
    "提升位置-物品关联记忆",
    "增强工作记忆容量",
    "改善长期记忆编码",
  ],
  tips: [
    "将物品与位置建立生动联想",
    "想象物品在该位置的场景",
    "按房间顺序依次记忆",
    "利用位置的特征辅助记忆",
    "多次练习同一房间布局",
  ],
  referenceData: [
    {
      title: "记忆宫殿效果",
      items: [
        { label: "记忆提升", value: "2-3倍" },
        { label: "专业选手", value: "50+物品" },
        { label: "普通人", value: "7±2物品" },
        { label: "训练后", value: "15-20物品" },
      ],
    },
    {
      title: "表现标准",
      items: [
        { label: "完美", value: "准确率≥90%" },
        { label: "优秀", value: "准确率70-89%" },
        { label: "良好", value: "准确率50-69%" },
        { label: "需练习", value: "准确率<50%" },
      ],
    },
  ],
};

export default function ScenePage() {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [engine, setEngine] = useState<PalaceEngine | null>(null);
  const [studyTimeLeft, setStudyTimeLeft] = useState(0);
  const [result, setResult] = useState<PalaceResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 交互状态
  const [selectedItem, setSelectedItem] = useState<PalaceItem | null>(null);
  const [userPlacements, setUserPlacements] = useState<Placement[]>([]);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 创建物品映射
  const itemsMap = new Map<string, PalaceItem>(
    PALACE_ITEMS.map((item) => [item.id, { id: item.id, name: item.name, icon: item.icon }])
  );

  const initializeEngine = useCallback((diff: number) => {
    const config = getPalaceConfigFromDifficulty(diff);
    const newEngine = new PalaceEngine(config);
    setEngine(newEngine);
    setUserPlacements([]);
    setSelectedItem(null);
    setCurrentRoomIndex(0);
    setStudyTimeLeft(config.studyTimePerRoom);
  }, []);

  const startStudy = useCallback(() => {
    if (!engine) return;
    engine.startStudy();
    setPhase("study");
    setCurrentRoomIndex(0);

    const config = engine.getConfig();
    setStudyTimeLeft(config.studyTimePerRoom);

    timerRef.current = setInterval(() => {
      setStudyTimeLeft((prev) => {
        if (prev <= 1) {
          // 检查是否还有下一个房间
          const hasNext = engine.nextStudyRoom();
          if (hasNext) {
            setCurrentRoomIndex((i) => i + 1);
            return config.studyTimePerRoom;
          } else {
            // 所有房间记忆完成，进入测试
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            engine.startTest();
            setPhase("test");
            setCurrentRoomIndex(0);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
  }, [engine]);

  const startGame = useCallback(() => {
    initializeEngine(difficulty);
  }, [difficulty, initializeEngine]);

  useEffect(() => {
    if (engine && phase === "setup") startStudy();
  }, [engine, phase, startStudy]);

  // 处理锚点点击（放置物品）
  const handleAnchorClick = useCallback(
    (anchor: Anchor) => {
      if (!engine || phase !== "test") return;

      const room = engine.getRooms()[currentRoomIndex];
      if (!room) return;

      if (selectedItem) {
        // 放置选中的物品
        engine.placeItem(room.id, anchor.id, selectedItem.id);
        setUserPlacements([...engine.getUserPlacements()]);
        setSelectedItem(null);
      } else {
        // 检查锚点上是否有物品，有则移除
        const removed = engine.removeItem(room.id, anchor.id);
        if (removed) {
          setUserPlacements([...engine.getUserPlacements()]);
        }
      }
    },
    [engine, phase, currentRoomIndex, selectedItem]
  );

  // 处理拖拽放置
  const handleAnchorDrop = useCallback(
    (anchor: Anchor, itemId: string) => {
      if (!engine || phase !== "test") return;

      const room = engine.getRooms()[currentRoomIndex];
      if (!room) return;

      engine.placeItem(room.id, anchor.id, itemId);
      setUserPlacements([...engine.getUserPlacements()]);
      setSelectedItem(null);
    },
    [engine, phase, currentRoomIndex]
  );

  // 切换房间（测试阶段）
  const handleRoomSelect = useCallback(
    (index: number) => {
      const roomCount = engine?.getRooms().length || 0;
      if (phase === "test" && engine && index >= 0 && index < roomCount) {
        setCurrentRoomIndex(index);
      }
    },
    [phase, engine]
  );

  // 完成测试
  const handleComplete = useCallback(() => {
    if (!engine) return;

    engine.complete();
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
        roomCount: gameResult.roomCount,
        totalItems: gameResult.totalItems,
        correctCount: gameResult.correctCount,
        wrongCount: gameResult.wrongCount,
        missedCount: gameResult.missedCount,
      },
    })
      .catch((error) => console.error("Failed to save record:", error))
      .finally(() => setIsSaving(false));
  }, [engine, difficulty]);

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
    setEngine(null);
    setResult(null);
    setPhase("setup");
    setUserPlacements([]);
    setSelectedItem(null);
  }, []);

  const rooms = engine?.getRooms() || [];
  const currentRoom = rooms[currentRoomIndex];
  const unplacedItems = engine?.getUnplacedItems() || [];

  // 获取当前房间的放置情况
  const currentRoomPlacements =
    phase === "study"
      ? engine?.getCurrentRoomPlacements() || []
      : userPlacements.filter((p) => p.roomId === currentRoom?.id);

  return (
    <PageLayout showNav={false}>
      <div className="space-y-4">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">记忆宫殿</h1>
          <div className="w-12" />
        </div>

        {/* 设置阶段 */}
        {phase === "setup" && !engine && (
          <div className="space-y-4">
            <TrainingIntro {...PALACE_INTRO} />
            <PalaceDifficultySelector selectedDifficulty={difficulty} onSelect={setDifficulty} />
            <Leaderboard moduleType="scene" />
            <button onClick={startGame} className="btn-primary w-full text-lg py-4">
              进入宫殿
            </button>
          </div>
        )}

        {/* 记忆阶段 */}
        {phase === "study" && currentRoom && (
          <div className="space-y-4">
            {/* 计时器 */}
            <div className="card flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">记忆时间</p>
                <p className="text-2xl font-bold text-purple-600">{studyTimeLeft}s</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">房间</p>
                <p className="text-lg font-medium text-gray-700">
                  {currentRoomIndex + 1} / {rooms.length}
                </p>
              </div>
            </div>

            {/* 房间导航 */}
            {rooms.length > 1 && (
              <PalaceRoomNav rooms={rooms} currentIndex={currentRoomIndex} mode="study" />
            )}

            {/* 房间视图 */}
            <PalaceRoom
              room={currentRoom}
              placements={currentRoomPlacements}
              items={itemsMap}
              mode="study"
            />

            {/* 提示 */}
            <div className="card bg-purple-50 border-purple-200">
              <p className="text-sm text-purple-700 text-center">
                🧠 记住每个物品的位置，稍后需要将它们放回原处
              </p>
            </div>

            <button onClick={handleChangeDifficulty} className="btn-secondary w-full">
              放弃训练
            </button>
          </div>
        )}

        {/* 测试阶段 */}
        {phase === "test" && currentRoom && (
          <div className="space-y-4">
            {/* 进度 */}
            <div className="card flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已放置</p>
                <p className="text-xl font-bold text-purple-600">
                  {userPlacements.length} / {engine?.getCorrectPlacements().length || 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">剩余物品</p>
                <p className="text-lg font-medium text-gray-700">{unplacedItems.length}</p>
              </div>
            </div>

            {/* 房间导航 */}
            {rooms.length > 1 && (
              <PalaceRoomNav
                rooms={rooms}
                currentIndex={currentRoomIndex}
                onRoomSelect={handleRoomSelect}
                mode="test"
              />
            )}

            {/* 房间切换按钮 */}
            {rooms.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleRoomSelect(currentRoomIndex - 1)}
                  disabled={currentRoomIndex === 0}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    currentRoomIndex === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  }`}
                >
                  ← 上一个房间
                </button>
                <button
                  onClick={() => handleRoomSelect(currentRoomIndex + 1)}
                  disabled={currentRoomIndex === rooms.length - 1}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    currentRoomIndex === rooms.length - 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  }`}
                >
                  下一个房间 →
                </button>
              </div>
            )}

            {/* 房间视图 */}
            <PalaceRoom
              room={currentRoom}
              placements={currentRoomPlacements}
              items={itemsMap}
              mode="test"
              onAnchorClick={handleAnchorClick}
              onAnchorDrop={handleAnchorDrop}
              selectedAnchorId={null}
              highlightAnchors={!!selectedItem}
            />

            {/* 物品托盘 */}
            <PalaceItemTray
              items={unplacedItems}
              onItemSelect={setSelectedItem}
              selectedItemId={selectedItem?.id}
            />

            {/* 操作按钮 */}
            <div className="space-y-2">
              <button
                onClick={handleComplete}
                className="btn-primary w-full"
                disabled={unplacedItems.length === engine?.getAvailableItems().length}
              >
                完成放置
              </button>
              <button onClick={handleChangeDifficulty} className="btn-secondary w-full">
                放弃训练
              </button>
            </div>
          </div>
        )}

        {/* 结果阶段 */}
        {phase === "result" && result && (
          <div className="space-y-4">
            <PalaceResult
              result={result}
              onRestart={handleRestart}
              onChangeDifficulty={handleChangeDifficulty}
            />
            <Leaderboard moduleType="scene" currentScore={result.score} currentDuration={result.duration} currentDifficulty={difficulty} />
            {isSaving && <p className="text-center text-sm text-gray-500">正在保存记录...</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
