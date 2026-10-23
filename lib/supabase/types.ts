export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          company_name: string;
          plan: 'TRIAL' | 'START' | 'BUSINESS' | 'PRO';
          token_balance: number;
          trial_expires_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          company_name?: string;
          plan?: 'TRIAL' | 'START' | 'BUSINESS' | 'PRO';
          token_balance?: number;
          trial_expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          company_name?: string;
          plan?: 'TRIAL' | 'START' | 'BUSINESS' | 'PRO';
          token_balance?: number;
          trial_expires_at?: string;
          created_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          niche: string;
          niche_id: string;
          system_prompt: string;
          price_list: string;
          qualification_questions: string[];
          telegram_token: string | null;
          google_calendar_enabled: boolean;
          auto_reminder_enabled: boolean;
          is_active: boolean;
          tokens_used: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          niche: string;
          niche_id: string;
          system_prompt: string;
          price_list?: string;
          qualification_questions?: string[];
          telegram_token?: string | null;
          google_calendar_enabled?: boolean;
          auto_reminder_enabled?: boolean;
          is_active?: boolean;
          tokens_used?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          niche?: string;
          niche_id?: string;
          system_prompt?: string;
          price_list?: string;
          qualification_questions?: string[];
          telegram_token?: string | null;
          google_calendar_enabled?: boolean;
          auto_reminder_enabled?: boolean;
          is_active?: boolean;
          tokens_used?: number;
          created_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          user_id: string;
          agent_id: string | null;
          client_name: string;
          channel: 'Telegram' | 'Instagram';
          status: 'Новый' | 'Квалифицирован' | 'Записан в календарь';
          appointment_date: string | null;
          tokens_spent: number;
          contact: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_id?: string | null;
          client_name: string;
          channel: 'Telegram' | 'Instagram';
          status: 'Новый' | 'Квалифицирован' | 'Записан в календарь';
          appointment_date?: string | null;
          tokens_spent?: number;
          contact?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          agent_id?: string | null;
          client_name?: string;
          channel?: 'Telegram' | 'Instagram';
          status?: 'Новый' | 'Квалифицирован' | 'Записан в календарь';
          appointment_date?: string | null;
          tokens_spent?: number;
          contact?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
