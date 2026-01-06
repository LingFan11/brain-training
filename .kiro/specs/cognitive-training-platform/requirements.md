# Requirements Document

## Introduction

认知训练平台是一个面向移动端用户的中文网站，提供多种科学的认知能力训练工具。平台包含舒尔特表、Stroop训练、序列工作记忆、听觉选择性注意、双侧肢体镜像协调、规则导向分类逻辑和情景联想记忆七大训练模块。通过集成AI API实现智能难度调节和个性化训练建议，部署于Vercel免费服务器。

## Glossary

- **Training_Platform**: 认知训练平台主系统
- **Schulte_Table**: 舒尔特表训练模块，用于提升视觉搜索和注意力集中能力
- **Stroop_Trainer**: Stroop训练模块，用于提升认知控制和抑制能力
- **Sequence_Memory**: 序列工作记忆训练模块，用于提升工作记忆容量
- **Auditory_Attention**: 听觉选择性注意训练模块，用于提升听觉注意力
- **Bilateral_Coordination**: 双侧肢体镜像协调训练模块，用于提升运动协调能力
- **Rule_Classification**: 规则导向分类逻辑训练模块，用于提升逻辑推理能力
- **Scene_Memory**: 情景联想记忆训练模块，用于提升情景记忆能力
- **AI_Service**: AI服务层，通过OpenRouter API提供智能功能
- **User**: 使用平台进行认知训练的用户
- **Training_Session**: 单次训练会话，包含开始、进行、结束的完整过程
- **Training_Record**: 训练记录，存储用户的训练历史和成绩
- **Cloud_Storage**: 云端存储服务，使用Supabase免费层存储用户数据
- **Device_ID**: 设备标识符，基于浏览器指纹生成的唯一ID，用于关联用户数据

## Requirements

### Requirement 1: 平台基础架构

**User Story:** As a User, I want to access a mobile-friendly cognitive training website, so that I can train my cognitive abilities anytime on my phone.

#### Acceptance Criteria

1. WHEN a User visits the platform on a mobile device, THE Training_Platform SHALL display a responsive interface optimized for touch interaction
2. WHEN a User visits the platform, THE Training_Platform SHALL display all content in Chinese
3. WHEN a User selects a training module, THE Training_Platform SHALL navigate to the corresponding training interface within 2 seconds
4. THE Training_Platform SHALL be deployed on Vercel and accessible via public URL
5. THE Training_Platform SHALL use Next.js framework for server-side rendering and optimal performance

### Requirement 1.1: 设备识别与云端存储

**User Story:** As a User, I want my training data saved automatically without login, so that I can continue my progress on the same device.

#### Acceptance Criteria

1. WHEN a User first visits the platform, THE Training_Platform SHALL generate a unique Device_ID based on browser fingerprint
2. THE Training_Platform SHALL store the Device_ID in localStorage for persistent identification
3. WHEN a User completes any training session, THE Cloud_Storage SHALL persist the record to Supabase database using Device_ID
4. WHEN a User returns to the platform, THE Cloud_Storage SHALL fetch all training records associated with their Device_ID
5. IF cloud storage fails, THEN THE Training_Platform SHALL cache data locally and retry sync when connection restores

### Requirement 2: 舒尔特表训练

**User Story:** As a User, I want to practice with Schulte tables, so that I can improve my visual search speed and attention focus.

#### Acceptance Criteria

1. WHEN a User starts Schulte table training, THE Schulte_Table SHALL display a grid of randomly arranged numbers
2. WHEN a User taps numbers in correct sequential order, THE Schulte_Table SHALL highlight the tapped number and advance to the next target
3. WHEN a User taps an incorrect number, THE Schulte_Table SHALL provide visual feedback indicating the error
4. WHEN a User completes the table, THE Schulte_Table SHALL display completion time and accuracy statistics
5. THE Schulte_Table SHALL support configurable grid sizes (3x3, 4x4, 5x5, 6x6)
6. WHEN a User completes multiple sessions, THE Schulte_Table SHALL track and display performance trends

### Requirement 3: Stroop训练

**User Story:** As a User, I want to practice Stroop tasks, so that I can improve my cognitive control and inhibition abilities.

#### Acceptance Criteria

1. WHEN a User starts Stroop training, THE Stroop_Trainer SHALL display color words printed in conflicting ink colors
2. WHEN a User selects the correct ink color, THE Stroop_Trainer SHALL record a correct response and advance
3. WHEN a User selects an incorrect color, THE Stroop_Trainer SHALL provide feedback and record the error
4. WHEN a training session ends, THE Stroop_Trainer SHALL display accuracy rate and average response time
5. THE Stroop_Trainer SHALL support multiple difficulty levels with varying congruent/incongruent ratios
6. WHEN displaying stimuli, THE Stroop_Trainer SHALL use Chinese color words (红、蓝、绿、黄等)

### Requirement 4: 序列工作记忆训练

**User Story:** As a User, I want to practice sequence memory tasks, so that I can expand my working memory capacity.

#### Acceptance Criteria

1. WHEN a User starts sequence memory training, THE Sequence_Memory SHALL display a sequence of items one at a time
2. WHEN the sequence presentation ends, THE Sequence_Memory SHALL prompt the User to recall the sequence
3. WHEN a User inputs the recalled sequence, THE Sequence_Memory SHALL compare it with the original and provide feedback
4. THE Sequence_Memory SHALL support N-back tasks where User identifies items matching N positions back
5. WHEN a User performs well, THE Sequence_Memory SHALL increase sequence length or N-back level
6. WHEN a User struggles, THE Sequence_Memory SHALL decrease difficulty to maintain engagement

### Requirement 5: 听觉选择性注意训练

**User Story:** As a User, I want to practice auditory attention tasks, so that I can improve my ability to focus on specific sounds.

#### Acceptance Criteria

1. WHEN a User starts auditory attention training, THE Auditory_Attention SHALL play audio stimuli through the device speakers
2. WHEN target sounds are played among distractors, THE Auditory_Attention SHALL require User to identify targets
3. WHEN a User correctly identifies a target sound, THE Auditory_Attention SHALL record a hit
4. WHEN a User misses a target or false alarms, THE Auditory_Attention SHALL record the error type
5. THE Auditory_Attention SHALL support Chinese speech stimuli for language-based attention tasks
6. WHEN a session ends, THE Auditory_Attention SHALL display hit rate, false alarm rate, and response times

### Requirement 6: 双侧肢体镜像协调训练

**User Story:** As a User, I want to practice bilateral coordination tasks, so that I can improve my motor coordination abilities.

#### Acceptance Criteria

1. WHEN a User starts bilateral coordination training, THE Bilateral_Coordination SHALL display visual patterns requiring simultaneous two-hand touch responses
2. WHEN a User performs correct bilateral touch gestures, THE Bilateral_Coordination SHALL provide positive feedback
3. WHEN a User performs asymmetric or incorrect gestures, THE Bilateral_Coordination SHALL indicate the error
4. THE Bilateral_Coordination SHALL support mirror-image patterns where left and right hands perform symmetric movements
5. WHEN difficulty increases, THE Bilateral_Coordination SHALL introduce more complex patterns and faster timing
6. WHEN a session ends, THE Bilateral_Coordination SHALL display coordination accuracy and timing precision

### Requirement 7: 规则导向分类逻辑训练

**User Story:** As a User, I want to practice rule-based classification tasks, so that I can improve my logical reasoning abilities.

#### Acceptance Criteria

1. WHEN a User starts classification training, THE Rule_Classification SHALL present items with multiple attributes (shape, color, size, etc.)
2. THE Rule_Classification SHALL establish a hidden classification rule that User must discover
3. WHEN a User classifies an item, THE Rule_Classification SHALL provide feedback on correctness
4. WHEN a User demonstrates rule mastery, THE Rule_Classification SHALL switch to a new rule
5. THE Rule_Classification SHALL support single-attribute and multi-attribute rules at different difficulty levels
6. WHEN a session ends, THE Rule_Classification SHALL display rules discovered and classification accuracy

### Requirement 8: 情景联想记忆训练

**User Story:** As a User, I want to practice scene-based memory tasks, so that I can improve my episodic memory abilities.

#### Acceptance Criteria

1. WHEN a User starts scene memory training, THE Scene_Memory SHALL present a scene with multiple elements to memorize
2. WHEN the study phase ends, THE Scene_Memory SHALL test recall of scene elements
3. WHEN a User correctly recalls elements, THE Scene_Memory SHALL record successful retrievals
4. THE Scene_Memory SHALL support both item memory (what was there) and spatial memory (where it was)
5. WHEN difficulty increases, THE Scene_Memory SHALL add more elements or reduce study time
6. WHEN a session ends, THE Scene_Memory SHALL display recall accuracy for different element types

### Requirement 9: AI智能功能集成

**User Story:** As a User, I want AI-powered features, so that I can receive personalized training recommendations and adaptive difficulty.

#### Acceptance Criteria

1. WHEN a User completes training sessions, THE AI_Service SHALL analyze performance patterns
2. WHEN a User requests recommendations, THE AI_Service SHALL suggest which training modules to focus on
3. THE AI_Service SHALL call OpenRouter API for generating personalized feedback messages
4. IF the AI_Service API call fails, THEN THE Training_Platform SHALL fall back to pre-defined feedback templates
5. WHEN generating content, THE AI_Service SHALL cache responses to minimize API calls
6. THE AI_Service SHALL provide difficulty adjustment suggestions based on User performance trends

### Requirement 10: 训练记录与统计

**User Story:** As a User, I want to track my training history and progress, so that I can see my cognitive improvement over time.

#### Acceptance Criteria

1. WHEN a User completes any training session, THE Cloud_Storage SHALL save the session record with timestamp and scores to Supabase
2. WHEN a User views statistics, THE Training_Platform SHALL fetch records from cloud and display performance charts and trends
3. THE Training_Platform SHALL calculate and display streak days for consistent training
4. WHEN a User views a specific module's history, THE Training_Platform SHALL show detailed session-by-session records
5. WHEN a User is offline, THE Training_Platform SHALL cache records locally and sync when online
6. WHEN syncing data, THE Cloud_Storage SHALL use JSON format for data serialization
