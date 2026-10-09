export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN';
export type PlatformType = 'leetcode' | 'codeforces' | 'codechef' | 'atcoder' | 'geeksforgeeks' | 'hackerrank' | 'interviewbit' | 'code360';
export type BindingStatus = 'PENDING' | 'VERIFIED' | 'FAILED';
export type SyncStatus = 'OK' | 'STALE' | 'FAILED';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type JobType = 'USER_SYNC' | 'CONTEST_SYNC' | 'LEADERBOARD_RECOMPUTE' | 'PRUNE_RETENTION';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: UserRole
          name: string
          roll_number: string | null
          department: string
          section: string
          batch_year: number
          must_change_password: boolean
          is_active: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: UserRole
          name: string
          roll_number?: string | null
          department?: string
          section?: string
          batch_year?: number
          must_change_password?: boolean
          is_active?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          name?: string
          roll_number?: string | null
          department?: string
          section?: string
          batch_year?: number
          must_change_password?: boolean
          is_active?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      platform_accounts: {
        Row: {
          id: string
          user_id: string
          platform: PlatformType
          handle: string
          status: BindingStatus
          verify_token: string
          verified_at: string | null
          last_synced_at: string | null
          sync_status: SyncStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: PlatformType
          handle: string
          status?: BindingStatus
          verify_token: string
          verified_at?: string | null
          last_synced_at?: string | null
          sync_status?: SyncStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: PlatformType
          handle?: string
          status?: BindingStatus
          verify_token?: string
          verified_at?: string | null
          last_synced_at?: string | null
          sync_status?: SyncStatus
          created_at?: string
          updated_at?: string
        }
      }
      platform_snapshots: {
        Row: {
          id: string
          user_id: string
          platform: string
          snapshot_date: string
          rating: number
          max_rating: number
          global_rank: number
          country_rank: number
          total_solved: number
          easy_solved: number
          medium_solved: number
          hard_solved: number
          contests_attended: number
          current_streak: number
          max_streak: number
          compact_metrics: Json
          raw_payload: Json | null
          fetched_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          snapshot_date?: string
          rating?: number
          max_rating?: number
          global_rank?: number
          country_rank?: number
          total_solved?: number
          easy_solved?: number
          medium_solved?: number
          hard_solved?: number
          contests_attended?: number
          current_streak?: number
          max_streak?: number
          compact_metrics?: Json
          raw_payload?: Json | null
          fetched_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          snapshot_date?: string
          rating?: number
          max_rating?: number
          global_rank?: number
          country_rank?: number
          total_solved?: number
          easy_solved?: number
          medium_solved?: number
          hard_solved?: number
          contests_attended?: number
          current_streak?: number
          max_streak?: number
          compact_metrics?: Json
          raw_payload?: Json | null
          fetched_at?: string
          created_at?: string
        }
      }
      rating_histories: {
        Row: {
          id: string
          user_id: string
          platform: string
          contest_name: string
          contest_id: string | null
          rating: number
          rank: number | null
          rating_change: number
          contest_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          contest_name: string
          contest_id?: string | null
          rating: number
          rank?: number | null
          rating_change?: number
          contest_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          contest_name?: string
          contest_id?: string | null
          rating?: number
          rank?: number | null
          rating_change?: number
          contest_date?: string
          created_at?: string
        }
      }
      submission_days: {
        Row: {
          id: string
          user_id: string
          platform: string
          submission_date: string
          count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          submission_date: string
          count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          submission_date?: string
          count?: number
          created_at?: string
        }
      }
      contests: {
        Row: {
          id: string
          platform: string
          name: string
          url: string
          start_time: string
          end_time: string
          duration_seconds: number
          phase: 'BEFORE' | 'CODING' | 'FINISHED'
          updated_at: string
        }
        Insert: {
          id?: string
          platform: string
          name: string
          url: string
          start_time: string
          end_time: string
          duration_seconds: number
          phase?: 'BEFORE' | 'CODING' | 'FINISHED'
          updated_at?: string
        }
        Update: {
          id?: string
          platform?: string
          name?: string
          url?: string
          start_time?: string
          end_time?: string
          duration_seconds?: number
          phase?: 'BEFORE' | 'CODING' | 'FINISHED'
          updated_at?: string
        }
      }
      leaderboard_cache: {
        Row: {
          id: string
          scope: string
          filter_time: string
          department: string
          section: string
          batch_year: number
          rank: number
          user_id: string
          roll_number: string
          student_name: string
          total_solved: number
          rating_score: number
          overall_score: number
          rank_change_week: number
          computed_at: string
        }
        Insert: {
          id?: string
          scope: string
          filter_time?: string
          department?: string
          section?: string
          batch_year?: number
          rank: number
          user_id: string
          roll_number: string
          student_name: string
          total_solved?: number
          rating_score?: number
          overall_score?: number
          rank_change_week?: number
          computed_at?: string
        }
        Update: {
          id?: string
          scope?: string
          filter_time?: string
          department?: string
          section?: string
          batch_year?: number
          rank?: number
          user_id?: string
          roll_number?: string
          student_name?: string
          total_solved?: number
          rating_score?: number
          overall_score?: number
          rank_change_week?: number
          computed_at?: string
        }
      }
      score_configs: {
        Row: {
          id: string
          is_active: boolean
          weight_problems_solved: number
          weight_cf_rating: number
          weight_lc_rating: number
          weight_cc_rating: number
          weight_atcoder_rating: number
          weight_contests: number
          weight_streak: number
          inactive_days_threshold: number
          tier_elite_min_solved: number
          tier_advanced_min_solved: number
          tier_intermediate_min_solved: number
          anonymize_student_names: boolean
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          weight_problems_solved?: number
          weight_cf_rating?: number
          weight_lc_rating?: number
          weight_cc_rating?: number
          weight_atcoder_rating?: number
          weight_contests?: number
          weight_streak?: number
          inactive_days_threshold?: number
          tier_elite_min_solved?: number
          tier_advanced_min_solved?: number
          tier_intermediate_min_solved?: number
          anonymize_student_names?: boolean
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          is_active?: boolean
          weight_problems_solved?: number
          weight_cf_rating?: number
          weight_lc_rating?: number
          weight_cc_rating?: number
          weight_atcoder_rating?: number
          weight_contests?: number
          weight_streak?: number
          inactive_days_threshold?: number
          tier_elite_min_solved?: number
          tier_advanced_min_solved?: number
          tier_intermediate_min_solved?: number
          anonymize_student_names?: boolean
          updated_by?: string | null
          updated_at?: string
        }
      }
      sync_jobs: {
        Row: {
          id: string
          job_type: JobType
          payload: Json
          status: JobStatus
          attempts: number
          max_attempts: number
          next_run_at: string
          locked_at: string | null
          locked_by: string | null
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_type: JobType
          payload?: Json
          status?: JobStatus
          attempts?: number
          max_attempts?: number
          next_run_at?: string
          locked_at?: string | null
          locked_by?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_type?: JobType
          payload?: Json
          status?: JobStatus
          attempts?: number
          max_attempts?: number
          next_run_at?: string
          locked_at?: string | null
          locked_by?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      adapter_health: {
        Row: {
          platform: string
          is_healthy: boolean
          consecutive_failures: number
          failure_reason: string | null
          circuit_broken_until: string | null
          last_success_at: string | null
          last_checked_at: string
        }
        Insert: {
          platform: string
          is_healthy?: boolean
          consecutive_failures?: number
          failure_reason?: string | null
          circuit_broken_until?: string | null
          last_success_at?: string | null
          last_checked_at?: string
        }
        Update: {
          platform?: string
          is_healthy?: boolean
          consecutive_failures?: number
          failure_reason?: string | null
          circuit_broken_until?: string | null
          last_success_at?: string | null
          last_checked_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          actor_email: string
          actor_role: string
          action: string
          target_entity: string
          target_id: string | null
          details: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_email: string
          actor_role: string
          action: string
          target_entity: string
          target_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_email?: string
          actor_role?: string
          action?: string
          target_entity?: string
          target_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      login_attempts: {
        Row: {
          id: string
          email: string
          ip_address: string
          success: boolean
          attempted_at: string
        }
        Insert: {
          id?: string
          email: string
          ip_address: string
          success: boolean
          attempted_at?: string
        }
        Update: {
          id?: string
          email?: string
          ip_address?: string
          success?: boolean
          attempted_at?: string
        }
      }
      consent_records: {
        Row: {
          id: string
          user_id: string
          policy_version: string
          consented_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          user_id: string
          policy_version?: string
          consented_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          policy_version?: string
          consented_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
    }
    Views: {
      student_leaderboard_view: {
        Row: {
          id: string
          scope: string
          filter_time: string
          department: string
          section: string
          batch_year: number
          rank: number
          total_solved: number
          rating_score: number
          overall_score: number
          rank_change_week: number
          student_name: string
          is_current_user: boolean
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      request_user_sync: {
        Args: { target_user_id: string }
        Returns: Json
      }
    }
  }
}
