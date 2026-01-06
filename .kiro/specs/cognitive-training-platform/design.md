# Design Document: 认知训练平台

## Overview

认知训练平台是一个基于 Next.js 的移动端优先中文网站，部署于 Vercel，使用 Supabase 作为云端数据库。平台提供七种科学的认知训练模块，通过 OpenRouter API 集成 AI 功能实现智能难度调节和个性化建议。

### 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI框架**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **数据库**: Supabase (PostgreSQL)
- **AI服务**: OpenRouter API
- **部署**: Vercel
- **设备识别**: FingerprintJS

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      用户设备 (Mobile)                        │
├─────────────────────────────────────────────────────────────┤
│  Next.js App (Vercel)                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Pages                                               │   │
│  │  ├── / (首页 - 训练模块选择)                          │   │
│  │  ├── /schulte (舒尔特表)                             │   │
│  │  ├── /stroop (Stroop训练)                           │   │
│  │  ├── /sequence (序列记忆)                            │   │
│  │  ├── /auditory (听觉注意)                            │   │
│  │  ├── /bilateral (双侧协调)                           │   │
│  │  ├── /classification (规则分类)                      │   │
│  │  ├── /scene (情景记忆)                               │   │
│  │  └── /stats (统计页面)                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Core Services                                       │   │
│  │  ├── DeviceService (设备指纹识别)                     │   │
│  │  ├── StorageService (云端/本地存储)                   │   │
│  │  ├── AIService (OpenRouter调用)                      │   │
│  │  └── TrainingEngine (训练逻辑引擎)                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Supabase   │  │  OpenRouter  │  │ FingerprintJS│      │
│  │  (Database)  │  │   (AI API)   │  │   (Device)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. DeviceService - 设备识别服务

```typescript
interface DeviceService {
  // 获取或生成设备ID
  getDeviceId(): Promise<string>;
  
  // 检查设备ID是否存在
  hasDeviceId(): boolean;
}
```

### 2. StorageService - 存储服务

```typescript
interface TrainingRecord {
  id: string;
  deviceId: string;
  moduleType: TrainingModuleType;
  score: number;
  accuracy: number;
  duration: number;  // 秒
  difficulty: number;
  details: Record<string, any>;  // 模块特定数据
  createdAt: Date;
}

interface StorageService {
  // 保存训练记录
  saveRecord(record: Omit<TrainingRecord, 'id' | 'createdAt'>): Promise<TrainingRecord>;
  
  // 获取训练记录
  getRecords(moduleType?: TrainingModuleType, limit?: number): Promise<TrainingRecord[]>;
  
  // 获取统计数据
  getStats(): Promise<TrainingStats>;
  
  // 同步本地缓存到云端
  syncLocalCache(): Promise<void>;
}
```

### 3. AIService - AI服务

```typescript
interface AIService {
  // 生成训练建议
  generateRecommendation(stats: TrainingStats): Promise<string>;
  
  // 生成训练反馈
  generateFeedback(record: TrainingRecord): Promise<string>;
  
  // 调整难度建议
  suggestDifficulty(recentRecords: TrainingRecord[]): Promise<number>;
}
```

### 4. TrainingEngine - 训练引擎基类

```typescript
interface TrainingConfig {
  difficulty: number;  // 1-10
  duration?: number;   // 可选时间限制
}

interface TrainingResult {
  score: number;
  accuracy: number;
  duration: number;
  details: Record<string, any>;
}

interface TrainingEngine {
  // 初始化训练
  initialize(config: TrainingConfig): void;
  
  // 开始训练
  start(): void;
  
  // 暂停训练
  pause(): void;
  
  // 结束训练并返回结果
  finish(): TrainingResult;
  
  // 获取当前状态
  getState(): TrainingState;
}
```

## Data Models

### Supabase 数据库表结构

```sql
-- 训练记录表
CREATE TABLE training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(64) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  score INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  duration INTEGER NOT NULL,
  difficulty INTEGER NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_device_id ON training_records(device_id);
CREATE INDEX idx_module_type ON training_records(module_type);
CREATE INDEX idx_created_at ON training_records(created_at DESC);
```

### TypeScript 类型定义

```typescript
type TrainingModuleType = 
  | 'schulte'      // 舒尔特表
  | 'stroop'       // Stroop训练
  | 'sequence'     // 序列记忆
  | 'auditory'     // 听觉注意
  | 'bilateral'    // 双侧协调
  | 'classification' // 规则分类
  | 'scene';       // 情景记忆

interface TrainingStats {
  totalSessions: number;
  totalDuration: number;
  streakDays: number;
  moduleStats: Record<TrainingModuleType, ModuleStats>;
}

interface ModuleStats {
  sessions: number;
  avgScore: number;
  avgAccuracy: number;
  bestScore: number;
  trend: 'improving' | 'stable' | 'declining';
}
```

## 训练模块设计

### 舒尔特表 (Schulte Table)

```typescript
interface SchulteConfig extends TrainingConfig {
  gridSize: 3 | 4 | 5 | 6;  // 网格大小
}

interface SchulteState {
  grid: number[][];         // 数字网格
  currentTarget: number;    // 当前目标数字
  correctCount: number;     // 正确次数
  errorCount: number;       // 错误次数
  startTime: number;        // 开始时间
}
```

### Stroop训练

```typescript
interface StroopConfig extends TrainingConfig {
  congruentRatio: number;   // 一致试次比例 (0-1)
  trialCount: number;       // 试次数量
}

interface StroopTrial {
  word: string;             // 颜色词 (红、蓝、绿、黄)
  inkColor: string;         // 墨水颜色
  isCongruent: boolean;     // 是否一致
}

interface StroopState {
  trials: StroopTrial[];
  currentIndex: number;
  responses: { correct: boolean; rt: number }[];
}
```

### 序列工作记忆 (N-back)

```typescript
interface SequenceConfig extends TrainingConfig {
  nBack: number;            // N值 (1-4)
  sequenceLength: number;   // 序列长度
  stimulusType: 'number' | 'letter' | 'position';
}

interface SequenceState {
  sequence: string[];
  currentIndex: number;
  responses: { hit: boolean; falseAlarm: boolean }[];
}
```

### 听觉选择性注意

```typescript
interface AuditoryConfig extends TrainingConfig {
  targetSound: string;      // 目标声音类型
  distractorCount: number;  // 干扰声音数量
  trialCount: number;
}

interface AuditoryState {
  currentSound: string;
  isTarget: boolean;
  responses: { hit: boolean; miss: boolean; falseAlarm: boolean }[];
}
```

### 双侧肢体镜像协调

```typescript
interface BilateralConfig extends TrainingConfig {
  patternComplexity: number;  // 图案复杂度
  timeLimit: number;          // 每个图案时间限制(ms)
}

interface BilateralPattern {
  leftTarget: { x: number; y: number };
  rightTarget: { x: number; y: number };
  isMirror: boolean;
}

interface BilateralState {
  patterns: BilateralPattern[];
  currentIndex: number;
  responses: { correct: boolean; timing: number }[];
}
```

### 规则导向分类逻辑

```typescript
interface ClassificationConfig extends TrainingConfig {
  attributeCount: number;   // 属性数量 (1-3)
  ruleComplexity: number;   // 规则复杂度
}

interface ClassificationItem {
  shape: 'circle' | 'square' | 'triangle';
  color: 'red' | 'blue' | 'green' | 'yellow';
  size: 'small' | 'medium' | 'large';
}

interface ClassificationState {
  currentRule: (item: ClassificationItem) => boolean;
  ruleDescription: string;  // 隐藏，用于结果展示
  items: ClassificationItem[];
  currentIndex: number;
  consecutiveCorrect: number;
  rulesDiscovered: number;
}
```

### 情景联想记忆

```typescript
interface SceneConfig extends TrainingConfig {
  elementCount: number;     // 元素数量
  studyTime: number;        // 学习时间(秒)
  testType: 'item' | 'spatial' | 'both';
}

interface SceneElement {
  id: string;
  type: string;             // 元素类型
  position: { x: number; y: number };
}

interface SceneState {
  elements: SceneElement[];
  phase: 'study' | 'test' | 'result';
  testQuestions: SceneTestQuestion[];
  responses: { correct: boolean }[];
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

