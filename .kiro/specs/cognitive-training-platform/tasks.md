# Implementation Plan: 认知训练平台

## Overview

本实现计划将认知训练平台分解为可执行的编码任务，从项目基础架构开始，逐步实现各个训练模块和服务层。任务按依赖关系排序，确保每个步骤都能在前一步基础上构建。

## Tasks

- [x] 1. 项目初始化与基础架构
  - [x] 1.1 创建 Next.js 14 项目并配置 Tailwind CSS
    - 使用 `create-next-app` 创建项目，选择 App Router
    - 配置 Tailwind CSS 和中文字体
    - 设置移动端优先的 viewport meta
    - _Requirements: 1.1, 1.2, 1.4, 1.5_
  - [x] 1.2 安装并配置核心依赖
    - 安装 zustand, @fingerprintjs/fingerprintjs, @supabase/supabase-js
    - 配置环境变量 (.env.local)
    - _Requirements: 1.1.1_
  - [x] 1.3 创建基础布局和导航组件
    - 创建移动端底部导航栏
    - 创建页面布局组件
    - 创建首页训练模块卡片列表
    - _Requirements: 1.1, 1.3_

- [x] 2. 设备识别与存储服务
  - [x] 2.1 实现 DeviceService
    - 使用 FingerprintJS 生成设备指纹
    - 实现 getDeviceId() 和 hasDeviceId()
    - 将设备ID存储到 localStorage
    - _Requirements: 1.1.1, 1.1.2_
  - [x] 2.2 编写 DeviceService 属性测试
    - **Property 1: Device ID Persistence**
    - **Validates: Requirements 1.1.1, 1.1.2**
  - [x] 2.3 配置 Supabase 数据库
    - 创建 training_records 表
    - 设置索引和 RLS 策略
    - _Requirements: 1.1.3_
  - [x] 2.4 实现 StorageService
    - 实现 saveRecord(), getRecords(), getStats()
    - 实现本地缓存和离线同步逻辑
    - _Requirements: 1.1.3, 1.1.4, 1.1.5, 10.1, 10.5_
  - [x] 2.5 编写 StorageService 属性测试
    - **Property 2: Training Record Round-Trip**
    - **Property 3: Offline Caching Fallback**
    - **Property 28: Stats Aggregation**
    - **Property 29: Record Filtering**
    - **Property 30: JSON Serialization Round-Trip**
    - **Validates: Requirements 1.1.3, 1.1.4, 1.1.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

- [x] 3. Checkpoint - 基础服务验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 4. 舒尔特表训练模块
  - [x] 4.1 实现舒尔特表核心逻辑
    - 实现 generateGrid() 生成随机数字网格
    - 实现 SchulteEngine 类处理点击和状态
    - 实现 calculateResult() 计算成绩
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 4.2 编写舒尔特表属性测试
    - **Property 4: Schulte Grid Generation**
    - **Property 5: Schulte Tap Response**
    - **Property 6: Schulte Completion Stats**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  - [x] 4.3 创建舒尔特表 UI 组件
    - 创建网格显示组件
    - 创建难度选择器
    - 创建结果展示组件
    - _Requirements: 2.1, 2.4, 2.5_
  - [x] 4.4 创建舒尔特表页面
    - 整合组件到 /schulte 页面
    - 连接 StorageService 保存记录
    - _Requirements: 2.4, 2.6_

- [x] 5. Stroop 训练模块
  - [x] 5.1 实现 Stroop 核心逻辑
    - 实现 generateTrials() 生成试次
    - 实现 StroopEngine 类处理响应
    - 定义中文颜色词和颜色映射
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 5.2 编写 Stroop 属性测试
    - **Property 7: Stroop Trial Generation**
    - **Property 8: Stroop Response Recording**
    - **Property 9: Stroop Accuracy Calculation**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
  - [x] 5.3 创建 Stroop UI 组件和页面
    - 创建颜色词显示组件
    - 创建颜色选择按钮组
    - 整合到 /stroop 页面
    - _Requirements: 3.1, 3.4, 3.6_

- [x] 6. 序列工作记忆训练模块
  - [x] 6.1 实现序列记忆核心逻辑
    - 实现 generateSequence() 生成序列
    - 实现 N-back 匹配检测逻辑
    - 实现自适应难度调节
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6_
  - [x] 6.2 编写序列记忆属性测试
    - **Property 10: Sequence Generation**
    - **Property 11: N-back Match Detection**
    - **Property 12: Adaptive Difficulty**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5, 4.6**
  - [x] 6.3 创建序列记忆 UI 组件和页面
    - 创建序列展示组件
    - 创建响应输入组件
    - 整合到 /sequence 页面
    - _Requirements: 4.1, 4.2_

- [x] 7. Checkpoint - 核心训练模块验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 8. 听觉选择性注意训练模块
  - [x] 8.1 实现听觉注意核心逻辑
    - 实现 generateAuditoryTrials() 生成试次
    - 实现响应记录和统计计算
    - 准备音频资源（中文语音）
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 8.2 编写听觉注意属性测试
    - **Property 13: Auditory Trial Distribution**
    - **Property 14: Auditory Response Recording**
    - **Property 15: Auditory Stats Calculation**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6**
  - [x] 8.3 创建听觉注意 UI 组件和页面
    - 创建音频播放控制组件
    - 创建响应按钮组件
    - 整合到 /auditory 页面
    - _Requirements: 5.1, 5.5_

- [x] 9. 双侧肢体镜像协调训练模块
  - [x] 9.1 实现双侧协调核心逻辑
    - 实现 generatePatterns() 生成图案
    - 实现镜像坐标计算
    - 实现触摸响应检测
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 9.2 编写双侧协调属性测试
    - **Property 16: Bilateral Pattern Generation**
    - **Property 17: Bilateral Response Recording**
    - **Property 18: Bilateral Difficulty Scaling**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
  - [x] 9.3 创建双侧协调 UI 组件和页面
    - 创建双触点目标显示组件
    - 创建多点触控检测
    - 整合到 /bilateral 页面
    - _Requirements: 6.1, 6.6_

- [x] 10. 规则导向分类逻辑训练模块
  - [x] 10.1 实现规则分类核心逻辑
    - 实现 generateItems() 生成分类项
    - 实现规则生成和切换逻辑
    - 实现连续正确计数和规则发现统计
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 10.2 编写规则分类属性测试
    - **Property 19: Classification Item Generation**
    - **Property 20: Classification Rule Determinism**
    - **Property 21: Classification Rule Switching**
    - **Property 22: Classification Difficulty Levels**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
  - [x] 10.3 创建规则分类 UI 组件和页面
    - 创建分类项显示组件（形状、颜色、大小）
    - 创建分类选择按钮
    - 整合到 /classification 页面
    - _Requirements: 7.1, 7.6_

- [x] 11. 情景联想记忆训练模块
  - [x] 11.1 实现情景记忆核心逻辑
    - 实现 generateScene() 生成场景元素
    - 实现测试问题生成（物品/空间）
    - 实现难度调节逻辑
    - _Requirements: 8.1, 8.3, 8.4, 8.5_
  - [x] 11.2 编写情景记忆属性测试
    - **Property 23: Scene Element Generation**
    - **Property 24: Scene Recall Recording**
    - **Property 25: Scene Difficulty Scaling**
    - **Validates: Requirements 8.1, 8.3, 8.4, 8.5**
  - [x] 11.3 创建情景记忆 UI 组件和页面
    - 创建场景显示组件
    - 创建测试问答组件
    - 整合到 /scene 页面
    - _Requirements: 8.1, 8.2, 8.6_

- [x] 12. Checkpoint - 所有训练模块验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 13. AI 服务集成
  - [x] 13.1 实现 AIService
    - 配置 OpenRouter API 调用
    - 实现 generateRecommendation() 和 generateFeedback()
    - 实现响应缓存机制
    - 实现失败回退到预定义模板
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [x] 13.2 编写 AIService 属性测试
    - **Property 26: AI Fallback Templates**
    - **Property 27: AI Response Caching**
    - **Validates: Requirements 9.4, 9.5**
  - [x] 13.3 集成 AI 功能到训练模块
    - 在训练结束后显示 AI 反馈
    - 在统计页面显示 AI 建议
    - _Requirements: 9.1, 9.2_

- [x] 14. 统计页面
  - [x] 14.1 创建统计页面 UI
    - 创建总体统计卡片
    - 创建各模块统计图表
    - 创建连续训练天数显示
    - 整合到 /stats 页面
    - _Requirements: 10.2, 10.3, 10.4_

- [x] 15. 最终集成与优化
  - [x] 15.1 完善首页和导航
    - 添加训练模块入口卡片
    - 添加快速统计摘要
    - 优化页面过渡动画
    - _Requirements: 1.1, 1.3_
  - [x] 15.2 移动端优化
    - 测试各种屏幕尺寸适配
    - 优化触摸交互体验
    - 添加 PWA 支持（可选）
    - _Requirements: 1.1_

- [x] 16. Final Checkpoint - 完整功能验证
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 所有任务都是必须执行的，包括属性测试
- 每个训练模块遵循相同模式：核心逻辑 → 属性测试 → UI组件 → 页面整合
- Checkpoint 任务用于阶段性验证，确保增量开发的稳定性
- 属性测试使用 fast-check 库，每个测试至少运行 100 次迭代
