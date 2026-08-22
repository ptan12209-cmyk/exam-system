/**
 * Supabase Database types ??core-exam schema.
 *
 * Hand-authored from `supabase-core-exam.sql` (v2026-08-16 + security
 * hardening migration). When the schema changes, regenerate with:
 *
 *   npx supabase gen types typescript \
 *     --project-id <ref> --schema public > src/types/database.ts
 *
 * (requires SUPABASE_ACCESS_TOKEN) and reconcile this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["profile_role"]
          account_status: Database["public"]["Enums"]["account_status"]
          account_source: Database["public"]["Enums"]["account_source"]
          created_by: string | null
          email: string | null
          full_name: string | null
          nickname: string | null
          class: string | null
          grade: number | null
          class_suffix: string | null
          phone: string | null
          avatar_url: string | null
          bio: string | null
          discord_id: string | null
          discord_study_channel_id: string | null
          discord_streak: number
          last_discord_study_date: string | null
          email_verified_at: string | null
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: Database["public"]["Enums"]["profile_role"]
          account_status?: Database["public"]["Enums"]["account_status"]
          account_source?: Database["public"]["Enums"]["account_source"]
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          nickname?: string | null
          class?: string | null
          grade?: number | null
          class_suffix?: string | null
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
        }
        Update: {
          role?: Database["public"]["Enums"]["profile_role"]
          account_status?: Database["public"]["Enums"]["account_status"]
          full_name?: string | null
          nickname?: string | null
          class?: string | null
          grade?: number | null
          class_suffix?: string | null
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          discord_id?: string | null
          email_verified_at?: string | null
          last_login_at?: string | null
        }
        Relationships: []
      }
      exams: {
        Row: {
          id: string
          teacher_id: string
          created_by: string
          title: string
          description: string | null
          subject: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          pdf_url: string | null
          duration: number
          total_questions: number
          status: Database["public"]["Enums"]["exam_status"]
          assigned_to: Database["public"]["Enums"]["assigned_to"]
          target_grade: number | null
          target_classes: string[] | null
          is_advanced: boolean
          max_attempts: number
          is_scheduled: boolean
          start_time: string | null
          end_time: string | null
          score_visibility_mode: Database["public"]["Enums"]["score_visibility_mode"]
          score_visibility_threshold: number | null
          security_level: number
          answer_key: string | null
          correct_answers: string[]
          mc_answers: Json
          tf_answers: Json
          sa_answers: Json
          questions: Json | null
          config: Json
          chapter_id: string | null
          lesson_id: string | null
          section_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          created_by: string
          title: string
          description?: string | null
          subject?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          pdf_url?: string | null
          duration?: number
          total_questions?: number
          status?: Database["public"]["Enums"]["exam_status"]
          assigned_to?: Database["public"]["Enums"]["assigned_to"]
          target_grade?: number | null
          target_classes?: string[] | null
          is_advanced?: boolean
          max_attempts?: number
          is_scheduled?: boolean
          start_time?: string | null
          end_time?: string | null
          score_visibility_mode?: Database["public"]["Enums"]["score_visibility_mode"]
          score_visibility_threshold?: number | null
          security_level?: number
          answer_key?: string | null
          correct_answers?: string[]
          mc_answers?: Json
          tf_answers?: Json
          sa_answers?: Json
          questions?: Json | null
          config?: Json
          chapter_id?: string | null
          lesson_id?: string | null
          section_id?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          subject?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          pdf_url?: string | null
          duration?: number
          total_questions?: number
          status?: Database["public"]["Enums"]["exam_status"]
          assigned_to?: Database["public"]["Enums"]["assigned_to"]
          target_grade?: number | null
          target_classes?: string[] | null
          is_advanced?: boolean
          max_attempts?: number
          is_scheduled?: boolean
          start_time?: string | null
          end_time?: string | null
          score_visibility_mode?: Database["public"]["Enums"]["score_visibility_mode"]
          score_visibility_threshold?: number | null
          security_level?: number
          answer_key?: string | null
          correct_answers?: string[]
          mc_answers?: Json
          tf_answers?: Json
          sa_answers?: Json
          questions?: Json | null
          config?: Json
          chapter_id?: string | null
          lesson_id?: string | null
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_participants: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          role: "student" | "moderator"
          status: "joined" | "active" | "taking" | "submitted" | "disconnected" | "left"
          student_name: string | null
          progress: number
          started_at: string
          joined_at: string
          last_active: string
        }
        Insert: {
          id?: string
          exam_id: string
          user_id: string
          role?: "student" | "moderator"
          status?: "joined" | "active" | "taking" | "submitted" | "disconnected" | "left"
          student_name?: string | null
          progress?: number
        }
        Update: {
          status?: "joined" | "active" | "taking" | "submitted" | "disconnected" | "left"
          student_name?: string | null
          progress?: number
          started_at?: string
          joined_at?: string
          last_active?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_participants_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          id: string
          exam_id: string
          student_id: string
          session_number: number
          started_at: string
          ended_at: string | null
          status: "in_progress" | "completed" | "abandoned"
          is_ranked: boolean
          browser_fingerprint: string | null
          tab_switch_count: number
          visibility_changes: number
          multi_browser_detected: boolean
          time_spent: number
          last_active_at: string
          answers_snapshot: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          student_id: string
          session_number?: number
          started_at?: string
          status?: "in_progress" | "completed" | "abandoned"
          is_ranked?: boolean
          browser_fingerprint?: string | null
          tab_switch_count?: number
          visibility_changes?: number
          multi_browser_detected?: boolean
          answers_snapshot?: Json
        }
        Update: {
          ended_at?: string | null
          status?: "in_progress" | "completed" | "abandoned"
          is_ranked?: boolean
          tab_switch_count?: number
          visibility_changes?: number
          multi_browser_detected?: boolean
          time_spent?: number
          answers_snapshot?: Json
          last_active_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          id: string
          exam_id: string
          student_id: string
          session_id: string | null
          attempt_number: number
          student_answers: (string | null)[]
          mc_student_answers: Json
          tf_student_answers: Json
          sa_student_answers: Json
          score: number
          correct_count: number
          mc_correct: number
          tf_correct: number
          sa_correct: number
          time_spent: number
          is_ranked: boolean
          cheat_flags: Json
          started_at: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          student_id: string
          session_id?: string | null
          attempt_number?: number
          student_answers?: (string | null)[]
          mc_student_answers?: Json
          tf_student_answers?: Json
          sa_student_answers?: Json
          score?: number
          correct_count?: number
          mc_correct?: number
          tf_correct?: number
          sa_correct?: number
          time_spent?: number
          is_ranked?: boolean
          cheat_flags?: Json
          started_at?: string | null
          submitted_at?: string
        }
        Update: {
          score?: number
          correct_count?: number
          mc_correct?: number
          tf_correct?: number
          sa_correct?: number
          time_spent?: number
          is_ranked?: boolean
          cheat_flags?: Json
          session_id?: string | null
          started_at?: string | null
          submitted_at?: string
          attempt_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_audit_log: {
        Row: {
          id: string
          submission_id: string | null
          exam_id: string
          student_id: string
          action: string
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          submission_id?: string | null
          exam_id: string
          student_id: string
          action: string
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "submission_audit_log_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_audit_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_banks: {
        Row: {
          id: string
          teacher_id: string
          name: string
          subject: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          name: string
          subject: string
          description?: string | null
        }
        Update: {
          name?: string
          subject?: string
          description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_banks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          id: string
          bank_id: string | null
          exam_id: string | null
          teacher_id: string
          subject: string
          question_type: "mc" | "tf" | "sa"
          difficulty: number
          content: string | null
          question_text: string | null
          options: Json | null
          correct_answer: Json
          explanation: string | null
          tags: string[]
          source: string | null
          is_verified: boolean
          use_count: number
          order_index: number
          chapter_id: string | null
          lesson_id: string | null
          section_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bank_id?: string | null
          exam_id?: string | null
          teacher_id: string
          subject?: string
          question_type?: "mc" | "tf" | "sa"
          difficulty?: number
          content?: string | null
          question_text?: string | null
          options?: Json | null
          correct_answer: Json
          explanation?: string | null
          tags?: string[]
          source?: string | null
          is_verified?: boolean
          use_count?: number
          order_index?: number
        }
        Update: {
          bank_id?: string | null
          exam_id?: string | null
          subject?: string
          question_type?: "mc" | "tf" | "sa"
          difficulty?: number
          content?: string | null
          question_text?: string | null
          options?: Json | null
          correct_answer?: Json
          explanation?: string | null
          tags?: string[]
          source?: string | null
          is_verified?: boolean
          use_count?: number
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          exam_id: string
          question_id: string
          order_index: number
        }
        Insert: {
          exam_id: string
          question_id: string
          order_index: number
        }
        Update: {
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          id: string
          parent_id: string
          student_id: string
          relationship: "teacher" | "parent" | "guardian"
          created_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          student_id: string
          relationship?: "teacher" | "parent" | "guardian"
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string | null
          type: string
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message?: string | null
          type?: string
          link?: string | null
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_feedback: {
        Row: {
          id: string
          user_id: string
          category: "bug" | "idea" | "praise" | "other"
          body: string
          subject_key: string | null
          lesson_id: string | null
          page_path: string | null
          status: "new" | "seen" | "in_progress" | "done" | "archived"
          teacher_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: "bug" | "idea" | "praise" | "other"
          body: string
          subject_key?: string | null
          lesson_id?: string | null
          page_path?: string | null
        }
        Update: {
          status?: "new" | "seen" | "in_progress" | "done" | "archived"
          teacher_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_device_bindings: {
        Row: {
          user_id: string
          device_id: string
          device_label: string | null
          user_agent: string | null
          bound_at: string
          last_seen_at: string
        }
        Insert: {
          user_id: string
          device_id: string
          device_label?: string | null
          user_agent?: string | null
        }
        Update: {
          device_id?: string
          device_label?: string | null
          user_agent?: string | null
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_device_bindings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_stats: {
        Row: {
          id: string
          user_id: string
          xp: number
          level: number
          streak_days: number
          last_exam_date: string | null
          exams_completed: number
          perfect_scores: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          xp?: number
          level?: number
          streak_days?: number
          exams_completed?: number
          perfect_scores?: number
        }
        Update: {
          xp?: number
          level?: number
          streak_days?: number
          last_exam_date?: string | null
          exams_completed?: number
          perfect_scores?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          xp_reward: number
          condition_type: "first_exam" | "exams_completed" | "streak" | "perfect_score"
          condition_value: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          xp_reward?: number
          condition_type: "first_exam" | "exams_completed" | "streak" | "perfect_score"
          condition_value?: number
        }
        Update: never
        Relationships: []
      }
      student_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "student_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logins: {
        Row: {
          id: string
          user_id: string
          login_date: string
          xp_earned: number
          streak_day: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          login_date?: string
          xp_earned?: number
          streak_day?: number
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "daily_logins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      /**
       * Safe student-facing exam projection ??NO answer-key columns.
       * Students read exams exclusively through this view.
       */
      exams_public: {
        Row: Omit<
          Database["public"]["Tables"]["exams"]["Row"],
          | "teacher_id"
          | "created_by"
          | "answer_key"
          | "correct_answers"
          | "mc_answers"
          | "tf_answers"
          | "sa_answers"
          | "questions"
          | "config"
        >
        Relationships: []
      }
      /** Safe question projection ??no correct_answer / explanation. */
      questions_public: {
        Row: Pick<
          Database["public"]["Tables"]["questions"]["Row"],
          | "id"
          | "bank_id"
          | "exam_id"
          | "subject"
          | "question_type"
          | "difficulty"
          | "content"
          | "question_text"
          | "options"
          | "tags"
          | "order_index"
          | "created_at"
        >
        Relationships: []
      }
    }
    Functions: {
      get_exam_leaderboard: {
        Args: { exam_uuid: string }
        Returns: {
          student_id: string
          student_name: string | null
          score: number
          time_spent: number
          submitted_at: string
          rank: number
        }[]
      }
      get_exam_for_student: {
        Args: { exam_uuid: string }
        Returns: {
          id: string
          title: string
          subject: string
          duration: number
          total_questions: number
          pdf_url: string | null
          is_scheduled: boolean
          start_time: string | null
          end_time: string | null
          max_attempts: number
          security_level: number
        }[]
      }
      get_graded_exam_for_student: {
        Args: { exam_uuid: string }
        Returns: Json
      }
      get_unsubmitted_exam_count: {
        Args: Record<string, never>
        Returns: number
      }
      manages_student: {
        Args: { p_student_id: string; p_manager_id?: string }
        Returns: boolean
      }
      owns_exam: {
        Args: { p_exam_id: string; p_user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      profile_role: "student" | "teacher" | "admin" | "parent"
      account_status: "active" | "disabled"
      account_source: "teacher" | "system" | "legacy" | "direct_signup"
      exam_type: "pdf" | "digital"
      exam_status: "draft" | "published" | "archived"
      assigned_to: "normal" | "x"
      score_visibility_mode: "always" | "never" | "threshold"
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Row"]

export type Views<
  ViewName extends keyof Database["public"]["Views"],
> = Database["public"]["Views"][ViewName]["Row"]

/** Convenience aliases for the most-used rows. */
export type ExamRow = Tables<"exams">
export type ExamPublicRow = Views<"exams_public">
export type QuestionPublicRow = Views<"questions_public">
export type SubmissionRow = Tables<"submissions">
export type ProfileRow = Tables<"profiles">
