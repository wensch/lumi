export type CircleSummary = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  invite_code: string;
  member_count: number;
  /** Quantas pessoas do círculo já fizeram o momento de hoje (presença, nunca ranking). */
  did_today_count: number;
};

export type CircleMember = {
  user_id: string;
  name: string;
  role: 'owner' | 'member';
  is_me: boolean;
  did_today: boolean;
  cheered_by_me: boolean;
};

export type CircleDetail = {
  id: string;
  name: string;
  invite_code: string;
  my_role: 'owner' | 'member';
  /** Total coletivo de momentos dos últimos 7 dias, sem nomes. */
  week_moments: number;
  cheers_received_today: number;
  members: CircleMember[];
};

export type PrayerRequest = {
  id: string;
  body: string;
  author_name: string;
  is_mine: boolean;
  prayed_count: number;
  i_prayed: boolean;
  resolved: boolean;
  created_at: string;
};

export const MAX_CIRCLE_MEMBERS = 12;
export const MAX_CIRCLES_PER_USER = 5;
export const PRAYER_REQUEST_MAX_LENGTH = 280;
