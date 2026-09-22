/**
 * Tipos do banco Lumi, escritos à mão a partir de supabase/migrations/.
 * Quando o projeto Supabase real existir, substituir por:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 */

export type AgeRange = 'kid' | 'teen' | 'adult' | 'senior';
export type XpReason =
  'daily_moment' | 'reflection' | 'prayer_logged' | 'achievement' | 'streak_milestone';
export type PrayerSource = 'user_written' | 'ai_generated';
export type BibleLicenseStatus = 'pending' | 'approved' | 'revoked';
export type NotificationIntensity = 'low' | 'normal' | 'high';
export type LumiMood =
  | 'normal'
  | 'happy'
  | 'celebrating'
  | 'sassy'
  | 'suspicious'
  | 'waiting'
  | 'missing_you'
  | 'surprised'
  | 'thoughtful'
  | 'sleepy'
  | 'determined'
  | 'proud'
  | 'sad';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          age_range: AgeRange | null;
          preferred_time: string | null;
          timezone: string | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_completed_date: string | null;
          grace_available: boolean;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['streaks']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['streaks']['Row']>;
      };
      bible_sources: {
        Row: {
          id: string;
          provider: string;
          version_code: string;
          version_name: string;
          language: string;
          license_status: BibleLicenseStatus;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['bible_sources']['Row']> & {
          version_code: string;
          version_name: string;
          language: string;
        };
        Update: Partial<Database['public']['Tables']['bible_sources']['Row']>;
      };
      content: {
        Row: {
          id: string;
          title: string;
          body: string;
          passage_reference: string | null;
          bible_source_id: string | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['content']['Row']> & {
          title: string;
          body: string;
        };
        Update: Partial<Database['public']['Tables']['content']['Row']>;
      };
      devotional_sessions: {
        Row: {
          id: string;
          user_id: string;
          content_id: string | null;
          started_at: string;
          completed_at: string | null;
          reflection_text: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['devotional_sessions']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['devotional_sessions']['Row']>;
      };
      xp_events: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: XpReason;
          devotional_session_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['xp_events']['Row']> & {
          user_id: string;
          amount: number;
          reason: XpReason;
        };
        Update: never;
      };
      achievements: {
        Row: {
          id: string;
          code: string;
          title: string;
          description: string;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['achievements']['Row']> & {
          code: string;
          title: string;
          description: string;
        };
        Update: Partial<Database['public']['Tables']['achievements']['Row']>;
      };
      user_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: Database['public']['Tables']['user_achievements']['Row'];
        Update: never;
      };
      prayer_entries: {
        Row: {
          id: string;
          user_id: string;
          devotional_session_id: string | null;
          source: PrayerSource;
          body: string;
          based_on_passage: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['prayer_entries']['Row']> & {
          user_id: string;
          source: PrayerSource;
          body: string;
        };
        Update: Partial<Database['public']['Tables']['prayer_entries']['Row']>;
      };
      lumi_state: {
        Row: {
          user_id: string;
          mood: LumiMood;
          equipped_cosmetic_id: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['lumi_state']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['lumi_state']['Row']>;
      };
      notification_preferences: {
        Row: {
          user_id: string;
          reminders_enabled: boolean;
          preferred_time: string | null;
          intensity: NotificationIntensity;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notification_preferences']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['notification_preferences']['Row']>;
      };
    };
  };
}
