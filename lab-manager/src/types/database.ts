export type ExperimentStatus = "active" | "completed" | "archived";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  google_refresh_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Protocol {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProtocolStep {
  id: string;
  protocol_id: string;
  relative_day: number;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Experiment {
  id: string;
  user_id: string;
  protocol_id: string | null;
  name: string;
  start_date: string;
  status: ExperimentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  experiment_id: string;
  step_id: string | null;
  title: string;
  description: string | null;
  relative_day: number;
  actual_date: string;
  is_completed: boolean;
  notes: string | null;
  image_url: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

// Join types for convenience
export interface ProtocolWithSteps extends Protocol {
  protocol_steps: ProtocolStep[];
}

export interface ExperimentWithTasks extends Experiment {
  tasks: Task[];
  protocol: Protocol | null;
}

export interface TaskWithExperiment extends Task {
  experiment: Experiment;
}

// Database types for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      protocols: {
        Row: Protocol;
        Insert: Omit<Protocol, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Protocol, "id" | "user_id" | "created_at">>;
      };
      protocol_steps: {
        Row: ProtocolStep;
        Insert: Omit<ProtocolStep, "id" | "created_at">;
        Update: Partial<Omit<ProtocolStep, "id" | "protocol_id" | "created_at">>;
      };
      experiments: {
        Row: Experiment;
        Insert: Omit<Experiment, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Experiment, "id" | "user_id" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id" | "experiment_id" | "created_at">>;
      };
    };
  };
}
