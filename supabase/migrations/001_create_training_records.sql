-- 训练记录表
-- Requirements: 1.1.3
-- 
-- 运行此脚本在 Supabase SQL Editor 中创建训练记录表

-- 创建训练记录表
CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(64) NOT NULL,
  module_type VARCHAR(32) NOT NULL CHECK (module_type IN (
    'schulte',
    'stroop', 
    'sequence',
    'auditory',
    'bilateral',
    'classification',
    'scene'
  )),
  score INTEGER NOT NULL CHECK (score >= 0),
  accuracy DECIMAL(5,2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  duration INTEGER NOT NULL CHECK (duration >= 0),
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 10),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_training_records_device_id 
  ON training_records(device_id);

CREATE INDEX IF NOT EXISTS idx_training_records_module_type 
  ON training_records(module_type);

CREATE INDEX IF NOT EXISTS idx_training_records_created_at 
  ON training_records(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_records_device_module 
  ON training_records(device_id, module_type);

-- 启用 Row Level Security (RLS)
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
-- 允许任何人插入记录（因为我们使用设备ID而非用户认证）
CREATE POLICY "Allow insert for all" ON training_records
  FOR INSERT
  WITH CHECK (true);

-- 允许读取自己设备的记录
-- 注意：由于没有用户认证，我们允许读取所有记录
-- 在实际应用中，可以通过设备ID进行过滤
CREATE POLICY "Allow select for all" ON training_records
  FOR SELECT
  USING (true);

-- 允许更新自己设备的记录
CREATE POLICY "Allow update for all" ON training_records
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 允许删除自己设备的记录
CREATE POLICY "Allow delete for all" ON training_records
  FOR DELETE
  USING (true);

-- 添加注释
COMMENT ON TABLE training_records IS '认知训练记录表，存储用户的训练历史和成绩';
COMMENT ON COLUMN training_records.device_id IS '设备唯一标识符，基于浏览器指纹生成';
COMMENT ON COLUMN training_records.module_type IS '训练模块类型';
COMMENT ON COLUMN training_records.score IS '训练得分';
COMMENT ON COLUMN training_records.accuracy IS '准确率（百分比）';
COMMENT ON COLUMN training_records.duration IS '训练时长（秒）';
COMMENT ON COLUMN training_records.difficulty IS '难度等级（1-10）';
COMMENT ON COLUMN training_records.details IS '模块特定的详细数据（JSON格式）';
