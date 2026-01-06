/**
 * Supabase Database Types
 * 
 * Requirements: 1.1.3
 */

export type TrainingModuleType = 
  | 'schulte'       // 舒尔特表
  | 'stroop'        // Stroop训练
  | 'sequence'      // 序列记忆
  | 'auditory'      // 听觉注意
  | 'bilateral'     // 双侧协调
  | 'classification' // 规则分类
  | 'scene';        // 情景记忆

export interface TrainingRecord {
  id: string;
  device_id: string;
  module_type: TrainingModuleType;
  score: number;
  accuracy: number;
  duration: number;
  difficulty: number;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      training_records: {
        Row: TrainingRecord;
        Insert: Omit<TrainingRecord, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<TrainingRecord>;
      };
    };
  };
}
