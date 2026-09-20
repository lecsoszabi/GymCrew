/** Az adatbázis típusai — kézzel karbantartva, a supabase/schema.sql tükre. */

export type Vote = "yes" | "maybe" | "no";
export type SessionStatus = "proposed" | "confirmed" | "cancelled" | "done";
export type Sex = "male" | "female" | "other";
export type Goal = "muscle" | "strength" | "fat_loss" | "fitness" | "health" | "other";
export type Level = "beginner" | "intermediate" | "advanced";

export type Gym = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  osm_ref: string | null;
  active: boolean;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  group_id: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  sex: Sex | null;
  goal: Goal | null;
  experience_level: Level | null;
  onboarded: boolean;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  gym_id: string | null;
  created_at: string;
};

export type GroupInvite = {
  id: string;
  group_id: string;
  invited_email: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  created_at: string;
};

export type TrainingSession = {
  id: string;
  group_id: string;
  gym_id: string | null;
  starts_at: string;
  duration_min: number;
  created_by: string;
  status: SessionStatus;
  note: string | null;
  created_at: string;
};

export type SessionVote = {
  session_id: string;
  user_id: string;
  vote: Vote;
  reason: string | null;
  updated_at: string;
};

export type Availability = {
  id: string;
  user_id: string;
  weekday: number;
  start_min: number;
  end_min: number;
};

export type DailyCheckin = {
  id: string;
  user_id: string;
  group_id: string;
  day: string;
  going: boolean;
  from_time: string | null;
  to_time: string | null;
  reason: string | null;
  created_at: string;
};

export type CheckIn = {
  id: string;
  session_id: string | null;
  user_id: string;
  gym_id: string | null;
  arrived_at: string;
  source: "auto" | "manual";
};

/** Élő pozíció — csak broadcast üzenetként létezik, adatbázisba nem kerül. */
export type LivePing = {
  userId: string;
  name: string;
  avatar: string | null;
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  distanceM: number | null;
  arrived: boolean;
  at: number;
};

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row>;
  Relationships: Rel[];
};

export type Database = {
  public: {
    Tables: {
      gyms: Table<Gym>;
      profiles: Table<Profile> & {
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: Table<Group> & {
        Relationships: [
          {
            foreignKeyName: "groups_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
        ];
      };
      group_invites: Table<GroupInvite> & {
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: Table<TrainingSession> & {
        Relationships: [
          {
            foreignKeyName: "sessions_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
        ];
      };
      session_votes: Table<SessionVote>;
      availability: Table<Availability>;
      daily_checkins: Table<DailyCheckin>;
      check_ins: Table<CheckIn>;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_group: { Args: { p_name: string; p_gym_id: string | null }; Returns: string };
      join_group_by_code: { Args: { p_code: string }; Returns: string };
      accept_invite: { Args: { p_invite: string }; Returns: string };
      leave_group: { Args: Record<string, never>; Returns: undefined };
      remove_member: { Args: { p_user: string }; Returns: undefined };
      transfer_ownership: { Args: { p_user: string }; Returns: undefined };
      my_group_id: { Args: Record<string, never>; Returns: string | null };
      is_group_owner: { Args: { p_group: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
