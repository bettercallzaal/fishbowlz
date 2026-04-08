-- ===========================================================================
-- FISHBOWLZ: Combined Idempotent Migration
-- ===========================================================================
-- This file combines ALL fishbowl migrations into a single idempotent script.
-- Safe to run on a fresh database OR one with some/all migrations applied.
--
-- Source migrations (in order):
--   1. 20260404_fishbowlz.sql              - Core tables (rooms, sessions, transcripts, event_log)
--   2. 20260405_fc_identity_gating.sql     - FC identity gating columns
--   3. 20260405_fishbowl_chat.sql          - Chat messages table
--   4. 20260405_fishbowl_hand_raise.sql    - Hand raises column
--   5. 20260405_fishbowl_rotation_timer.sql - Rotation interval column
--   6. 20260405_fishbowl_scheduled.sql     - Scheduling fields + state constraint update
--   7. 20260405_fishbowl_summary.sql       - AI summary columns
--   8. 20260405_fishbowl_token_gate.sql    - Token gate columns
--   9. 20260405_fishbowl_users.sql         - Users table
--  10. 20260407_fishbowl_indexes_rpcs.sql  - Performance indexes + atomic RPC functions
--
-- Generated: 2026-04-07
-- ===========================================================================

BEGIN;

-- =========================================================================
-- 1. CORE TABLES (from 20260404_fishbowlz.sql)
-- =========================================================================

-- fishbowl_rooms: persistent async fishbowl audio spaces
CREATE TABLE IF NOT EXISTS fishbowl_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  title text NOT NULL,
  description text,
  host_fid integer NOT NULL,
  host_name text NOT NULL,
  host_username text NOT NULL,
  host_pfp text,
  state text NOT NULL DEFAULT 'active',
  hot_seat_count integer NOT NULL DEFAULT 5,
  rotation_enabled boolean NOT NULL DEFAULT true,
  current_speakers jsonb NOT NULL DEFAULT '[]',
  current_listeners jsonb NOT NULL DEFAULT '[]',
  -- Audio source
  audio_source_type text CHECK (audio_source_type IN ('farcaster', 'external_url', 'native')),
  audio_source_url text,
  audio_source_meta jsonb,
  -- Stats
  total_sessions integer NOT NULL DEFAULT 0,
  total_speakers integer NOT NULL DEFAULT 0,
  total_listeners integer NOT NULL DEFAULT 0,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

-- Individual fishbowl sessions (one room can have many sessions over time)
CREATE TABLE IF NOT EXISTS fishbowl_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES fishbowl_rooms(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  -- Who was in the hot seat at any point
  speakers jsonb NOT NULL DEFAULT '[]',  -- [{fid, username, joined_at, left_at}]
  -- Listener count snapshots
  listener_count_snapshots jsonb NOT NULL DEFAULT '[]',  -- [{at, count}]
  -- Final transcript segment ID
  last_transcript_id uuid,
  state text NOT NULL DEFAULT 'live' CHECK (state IN ('live', 'paused', 'ended'))
);

-- Full transcripts with speaker attribution and timestamps
CREATE TABLE IF NOT EXISTS fishbowl_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES fishbowl_rooms(id) ON DELETE CASCADE,
  session_id uuid REFERENCES fishbowl_sessions(id) ON DELETE SET NULL,
  speaker_fid integer,
  speaker_name text NOT NULL,
  speaker_role text NOT NULL CHECK (speaker_role IN ('host', 'speaker', 'listener_rotated', 'agent')),
  text text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_ms integer,
  -- Source: 'audio_capture', 'manual', 'agent_summary'
  source text NOT NULL DEFAULT 'audio_capture',
  -- For cross-platform: source platform
  platform text CHECK (platform IN ('farcaster', 'twitter_x', 'native')),
  -- Hash for deduplication
  content_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- JSONL append log (strict logging for future tokenomics + compliance)
-- This is an append-only event log, NOT a relational table for queries
CREATE TABLE IF NOT EXISTS fishbowl_event_log (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  room_id uuid REFERENCES fishbowl_rooms(id) ON DELETE SET NULL,
  session_id uuid REFERENCES fishbowl_sessions(id) ON DELETE SET NULL,
  actor_fid integer,
  actor_type text CHECK (actor_type IN ('human', 'agent')),
  created_at timestamptz NOT NULL DEFAULT now()
);


-- =========================================================================
-- 2. COLUMNS FROM LATER MIGRATIONS
-- =========================================================================

-- From 20260405_fc_identity_gating.sql
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS gating_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS min_quality_score integer NOT NULL DEFAULT 0;
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS owner_fc_fid integer;

-- Update existing rooms to allow null owner_fc_fid
ALTER TABLE fishbowl_rooms ALTER COLUMN owner_fc_fid DROP NOT NULL;

-- From 20260405_fishbowl_hand_raise.sql
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS hand_raises jsonb NOT NULL DEFAULT '[]';

-- From 20260405_fishbowl_rotation_timer.sql
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS rotation_interval_ms integer;

-- From 20260405_fishbowl_scheduled.sql
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS auto_activate boolean NOT NULL DEFAULT false;

-- Update state check to include 'scheduled'
ALTER TABLE fishbowl_rooms DROP CONSTRAINT IF EXISTS fishbowl_rooms_state_check;
ALTER TABLE fishbowl_rooms ADD CONSTRAINT fishbowl_rooms_state_check
  CHECK (state IN ('scheduled', 'active', 'paused', 'ended'));

-- From 20260405_fishbowl_summary.sql
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS ai_summary_generated_at timestamptz;

-- From 20260405_fishbowl_token_gate.sql
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS token_gate_address text;
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS token_gate_min_balance text DEFAULT '0';
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS token_gate_chain_id integer DEFAULT 8453;
ALTER TABLE fishbowl_rooms ADD COLUMN IF NOT EXISTS token_gate_type text CHECK (token_gate_type IN ('erc20', 'erc721', 'erc1155'));


-- =========================================================================
-- 3. CHAT MESSAGES TABLE (from 20260405_fishbowl_chat.sql)
-- =========================================================================

CREATE TABLE IF NOT EXISTS fishbowl_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES fishbowl_rooms(id) ON DELETE CASCADE,
  sender_fid integer NOT NULL,
  sender_username text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- =========================================================================
-- 4. USERS TABLE (from 20260405_fishbowl_users.sql)
-- =========================================================================

CREATE TABLE IF NOT EXISTS fishbowl_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id text UNIQUE NOT NULL,
  fid integer,
  username text,
  display_name text,
  pfp_url text,
  wallet_address text,
  email text,
  login_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);


-- =========================================================================
-- 5. INDEXES
-- =========================================================================

-- Core indexes from 20260404_fishbowlz.sql (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_fishbowl_rooms_host ON fishbowl_rooms (host_fid);
CREATE INDEX IF NOT EXISTS idx_fishbowl_rooms_state ON fishbowl_rooms (state);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_fishbowl_sessions_room ON fishbowl_sessions (room_id);
CREATE INDEX IF NOT EXISTS idx_fishbowl_sessions_started ON fishbowl_sessions (started_at);

-- Transcripts indexes
CREATE INDEX IF NOT EXISTS idx_fishbowl_transcripts_room ON fishbowl_transcripts (room_id);
CREATE INDEX IF NOT EXISTS idx_fishbowl_transcripts_session ON fishbowl_transcripts (session_id);
CREATE INDEX IF NOT EXISTS idx_fishbowl_transcripts_speaker ON fishbowl_transcripts (speaker_fid);
CREATE INDEX IF NOT EXISTS idx_fishbowl_transcripts_started ON fishbowl_transcripts (started_at);

-- Event log indexes
CREATE INDEX IF NOT EXISTS idx_fishbowl_event_log_room ON fishbowl_event_log (room_id);
CREATE INDEX IF NOT EXISTS idx_fishbowl_event_log_type ON fishbowl_event_log (event_type);
CREATE INDEX IF NOT EXISTS idx_fishbowl_event_log_created ON fishbowl_event_log (created_at);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_fishbowl_chat_room ON fishbowl_chat_messages (room_id);
CREATE INDEX IF NOT EXISTS idx_fishbowl_chat_created ON fishbowl_chat_messages (created_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_fishbowl_users_privy ON fishbowl_users (privy_id);
CREATE INDEX IF NOT EXISTS idx_fishbowl_users_fid ON fishbowl_users (fid);
CREATE INDEX IF NOT EXISTS idx_fishbowl_users_wallet ON fishbowl_users (wallet_address);

-- FC identity gating index
CREATE INDEX IF NOT EXISTS idx_fishbowl_rooms_gated
  ON fishbowl_rooms (gating_enabled)
  WHERE gating_enabled = true;

-- Scheduled rooms index
CREATE INDEX IF NOT EXISTS idx_fishbowl_rooms_scheduled
  ON fishbowl_rooms (scheduled_at)
  WHERE state = 'scheduled';

-- Performance indexes from 20260407_fishbowl_indexes_rpcs.sql
CREATE INDEX IF NOT EXISTS idx_fishbowl_rooms_last_active_at
  ON fishbowl_rooms(last_active_at DESC);

-- Slug index (unique, partial - only non-null slugs)
DROP INDEX IF EXISTS idx_fishbowl_rooms_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fishbowl_rooms_slug
  ON fishbowl_rooms(slug) WHERE slug IS NOT NULL;

-- Composite indexes for ORDER BY queries
CREATE INDEX IF NOT EXISTS idx_fishbowl_transcripts_room_id
  ON fishbowl_transcripts(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fishbowl_chat_room_id
  ON fishbowl_chat_messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fishbowl_events_room_id
  ON fishbowl_event_log(room_id, created_at DESC);


-- =========================================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================================

ALTER TABLE fishbowl_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishbowl_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishbowl_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishbowl_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishbowl_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishbowl_users ENABLE ROW LEVEL SECURITY;


-- =========================================================================
-- 7. RLS POLICIES (wrapped in DO blocks for idempotency)
-- =========================================================================

-- fishbowl_rooms policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read fishbowl rooms' AND tablename = 'fishbowl_rooms') THEN
    CREATE POLICY "Anyone can read fishbowl rooms" ON fishbowl_rooms FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create rooms' AND tablename = 'fishbowl_rooms') THEN
    CREATE POLICY "Authenticated users can create rooms" ON fishbowl_rooms FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Hosts can update their own rooms' AND tablename = 'fishbowl_rooms') THEN
    CREATE POLICY "Hosts can update their own rooms" ON fishbowl_rooms FOR UPDATE USING (true);
  END IF;
END $$;

-- fishbowl_sessions policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read fishbowl sessions' AND tablename = 'fishbowl_sessions') THEN
    CREATE POLICY "Anyone can read fishbowl sessions" ON fishbowl_sessions FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert sessions' AND tablename = 'fishbowl_sessions') THEN
    CREATE POLICY "System can insert sessions" ON fishbowl_sessions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- fishbowl_transcripts policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read transcripts' AND tablename = 'fishbowl_transcripts') THEN
    CREATE POLICY "Anyone can read transcripts" ON fishbowl_transcripts FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert transcripts' AND tablename = 'fishbowl_transcripts') THEN
    CREATE POLICY "System can insert transcripts" ON fishbowl_transcripts FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- fishbowl_event_log policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read event log' AND tablename = 'fishbowl_event_log') THEN
    CREATE POLICY "Anyone can read event log" ON fishbowl_event_log FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can append event log' AND tablename = 'fishbowl_event_log') THEN
    CREATE POLICY "System can append event log" ON fishbowl_event_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- fishbowl_chat_messages policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read fishbowl chat' AND tablename = 'fishbowl_chat_messages') THEN
    CREATE POLICY "Anyone can read fishbowl chat" ON fishbowl_chat_messages FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert fishbowl chat' AND tablename = 'fishbowl_chat_messages') THEN
    CREATE POLICY "System can insert fishbowl chat" ON fishbowl_chat_messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- fishbowl_users policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read fishbowl users' AND tablename = 'fishbowl_users') THEN
    CREATE POLICY "Anyone can read fishbowl users" ON fishbowl_users FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert fishbowl users' AND tablename = 'fishbowl_users') THEN
    CREATE POLICY "System can insert fishbowl users" ON fishbowl_users FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can update fishbowl users' AND tablename = 'fishbowl_users') THEN
    CREATE POLICY "System can update fishbowl users" ON fishbowl_users FOR UPDATE USING (true);
  END IF;
END $$;


-- =========================================================================
-- 8. FUNCTIONS
-- =========================================================================

-- Function to log fishbowl events (from 20260404_fishbowlz.sql)
CREATE OR REPLACE FUNCTION log_fishbowl_event(
  p_event_type text,
  p_event_data jsonb,
  p_room_id uuid,
  p_session_id uuid,
  p_actor_fid integer,
  p_actor_type text
) RETURNS bigint AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO fishbowl_event_log (event_type, event_data, room_id, session_id, actor_fid, actor_type)
  VALUES (p_event_type, p_event_data, p_room_id, p_session_id, p_actor_fid, p_actor_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 9. ATOMIC RPC FUNCTIONS (from 20260407_fishbowl_indexes_rpcs.sql)
--    All functions are transactional - if any statement fails, the whole
--    function rolls back. This eliminates race conditions from
--    client-side read-modify-write patterns.
-- =========================================================================

-- ----- fishbowl_join_speaker -----
CREATE OR REPLACE FUNCTION fishbowl_join_speaker(
  p_room_id UUID,
  p_fid BIGINT,
  p_username TEXT,
  p_address TEXT
)
RETURNS fishbowl_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room fishbowl_rooms;
  v_speakers jsonb;
  v_listeners jsonb;
  v_speaker_count int;
  v_now timestamptz := now();
  v_new_speaker jsonb;
BEGIN
  -- Lock the row for update to prevent concurrent mutations
  SELECT * INTO v_room
    FROM fishbowl_rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  v_speakers := v_room.current_speakers;
  v_listeners := v_room.current_listeners;
  v_speaker_count := jsonb_array_length(v_speakers);

  -- Check if already a speaker
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_speakers) AS s
    WHERE (s->>'fid')::bigint = p_fid
  ) THEN
    RAISE EXCEPTION 'User % is already a speaker', p_fid;
  END IF;

  -- Check capacity (hot_seat_count is the max speakers)
  IF v_speaker_count >= v_room.hot_seat_count THEN
    RAISE EXCEPTION 'Room is full (% / % speakers)', v_speaker_count, v_room.hot_seat_count;
  END IF;

  -- Build the new speaker object
  v_new_speaker := jsonb_build_object(
    'fid', p_fid,
    'username', p_username,
    'address', p_address,
    'joined_at', v_now,
    'last_seen', v_now
  );

  -- Add to speakers
  v_speakers := v_speakers || jsonb_build_array(v_new_speaker);

  -- Remove from listeners if present
  SELECT jsonb_agg(l) INTO v_listeners
    FROM jsonb_array_elements(v_listeners) AS l
    WHERE (l->>'fid')::bigint != p_fid;
  v_listeners := COALESCE(v_listeners, '[]'::jsonb);

  -- Persist
  UPDATE fishbowl_rooms
    SET current_speakers = v_speakers,
        current_listeners = v_listeners,
        last_active_at = v_now
    WHERE id = p_room_id
    RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;


-- ----- fishbowl_leave_speaker -----
CREATE OR REPLACE FUNCTION fishbowl_leave_speaker(
  p_room_id UUID,
  p_fid BIGINT
)
RETURNS fishbowl_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room fishbowl_rooms;
  v_speakers jsonb;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_room
    FROM fishbowl_rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  -- Remove speaker with matching fid
  SELECT jsonb_agg(s) INTO v_speakers
    FROM jsonb_array_elements(v_room.current_speakers) AS s
    WHERE (s->>'fid')::bigint != p_fid;
  v_speakers := COALESCE(v_speakers, '[]'::jsonb);

  UPDATE fishbowl_rooms
    SET current_speakers = v_speakers,
        last_active_at = v_now
    WHERE id = p_room_id
    RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;


-- ----- fishbowl_join_listener -----
CREATE OR REPLACE FUNCTION fishbowl_join_listener(
  p_room_id UUID,
  p_fid BIGINT,
  p_username TEXT
)
RETURNS fishbowl_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room fishbowl_rooms;
  v_listeners jsonb;
  v_now timestamptz := now();
  v_new_listener jsonb;
BEGIN
  SELECT * INTO v_room
    FROM fishbowl_rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  v_listeners := v_room.current_listeners;

  -- Check if already a listener
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_listeners) AS l
    WHERE (l->>'fid')::bigint = p_fid
  ) THEN
    -- Already present, just update last_active_at and return
    UPDATE fishbowl_rooms
      SET last_active_at = v_now
      WHERE id = p_room_id
      RETURNING * INTO v_room;
    RETURN v_room;
  END IF;

  v_new_listener := jsonb_build_object(
    'fid', p_fid,
    'username', p_username,
    'joined_at', v_now,
    'last_seen', v_now
  );

  v_listeners := v_listeners || jsonb_build_array(v_new_listener);

  UPDATE fishbowl_rooms
    SET current_listeners = v_listeners,
        last_active_at = v_now
    WHERE id = p_room_id
    RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;


-- ----- fishbowl_leave_listener -----
CREATE OR REPLACE FUNCTION fishbowl_leave_listener(
  p_room_id UUID,
  p_fid BIGINT
)
RETURNS fishbowl_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room fishbowl_rooms;
  v_listeners jsonb;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_room
    FROM fishbowl_rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  SELECT jsonb_agg(l) INTO v_listeners
    FROM jsonb_array_elements(v_room.current_listeners) AS l
    WHERE (l->>'fid')::bigint != p_fid;
  v_listeners := COALESCE(v_listeners, '[]'::jsonb);

  UPDATE fishbowl_rooms
    SET current_listeners = v_listeners,
        last_active_at = v_now
    WHERE id = p_room_id
    RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;


-- ----- fishbowl_kick_speaker -----
CREATE OR REPLACE FUNCTION fishbowl_kick_speaker(
  p_room_id UUID,
  p_speaker_fid BIGINT,
  p_host_fid BIGINT
)
RETURNS fishbowl_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room fishbowl_rooms;
  v_speakers jsonb;
  v_listeners jsonb;
  v_kicked jsonb;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_room
    FROM fishbowl_rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  -- Verify caller is the host
  IF v_room.host_fid != p_host_fid THEN
    RAISE EXCEPTION 'Only the host (fid %) can kick speakers', v_room.host_fid;
  END IF;

  -- Find the speaker being kicked (to preserve their username for listener entry)
  SELECT s INTO v_kicked
    FROM jsonb_array_elements(v_room.current_speakers) AS s
    WHERE (s->>'fid')::bigint = p_speaker_fid
    LIMIT 1;

  -- Remove from speakers
  SELECT jsonb_agg(s) INTO v_speakers
    FROM jsonb_array_elements(v_room.current_speakers) AS s
    WHERE (s->>'fid')::bigint != p_speaker_fid;
  v_speakers := COALESCE(v_speakers, '[]'::jsonb);

  -- Add to listeners (remove first if somehow already there)
  SELECT jsonb_agg(l) INTO v_listeners
    FROM jsonb_array_elements(v_room.current_listeners) AS l
    WHERE (l->>'fid')::bigint != p_speaker_fid;
  v_listeners := COALESCE(v_listeners, '[]'::jsonb);

  v_listeners := v_listeners || jsonb_build_array(
    jsonb_build_object(
      'fid', p_speaker_fid,
      'username', COALESCE(v_kicked->>'username', 'unknown'),
      'joined_at', v_now,
      'last_seen', v_now
    )
  );

  UPDATE fishbowl_rooms
    SET current_speakers = v_speakers,
        current_listeners = v_listeners,
        last_active_at = v_now
    WHERE id = p_room_id
    RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;


-- ----- fishbowl_rotate_speaker -----
CREATE OR REPLACE FUNCTION fishbowl_rotate_speaker(
  p_room_id UUID,
  p_new_fid BIGINT,
  p_new_username TEXT,
  p_old_fid BIGINT,
  p_host_fid BIGINT
)
RETURNS fishbowl_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room fishbowl_rooms;
  v_speakers jsonb;
  v_listeners jsonb;
  v_old_speaker jsonb;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_room
    FROM fishbowl_rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  -- Verify caller is the host
  IF v_room.host_fid != p_host_fid THEN
    RAISE EXCEPTION 'Only the host (fid %) can rotate speakers', v_room.host_fid;
  END IF;

  -- Find old speaker to preserve their username
  SELECT s INTO v_old_speaker
    FROM jsonb_array_elements(v_room.current_speakers) AS s
    WHERE (s->>'fid')::bigint = p_old_fid
    LIMIT 1;

  -- Remove old speaker from speakers
  SELECT jsonb_agg(s) INTO v_speakers
    FROM jsonb_array_elements(v_room.current_speakers) AS s
    WHERE (s->>'fid')::bigint != p_old_fid;
  v_speakers := COALESCE(v_speakers, '[]'::jsonb);

  -- Add new speaker to speakers
  v_speakers := v_speakers || jsonb_build_array(
    jsonb_build_object(
      'fid', p_new_fid,
      'username', p_new_username,
      'address', NULL,
      'joined_at', v_now,
      'last_seen', v_now
    )
  );

  -- Remove new speaker from listeners
  SELECT jsonb_agg(l) INTO v_listeners
    FROM jsonb_array_elements(v_room.current_listeners) AS l
    WHERE (l->>'fid')::bigint != p_new_fid;
  v_listeners := COALESCE(v_listeners, '[]'::jsonb);

  -- Add old speaker to listeners
  v_listeners := v_listeners || jsonb_build_array(
    jsonb_build_object(
      'fid', p_old_fid,
      'username', COALESCE(v_old_speaker->>'username', 'unknown'),
      'joined_at', v_now,
      'last_seen', v_now
    )
  );

  UPDATE fishbowl_rooms
    SET current_speakers = v_speakers,
        current_listeners = v_listeners,
        last_active_at = v_now
    WHERE id = p_room_id
    RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;


-- ----- fishbowl_approve_hand -----
CREATE OR REPLACE FUNCTION fishbowl_approve_hand(
  p_room_id UUID,
  p_fid BIGINT,
  p_username TEXT,
  p_host_fid BIGINT
)
RETURNS fishbowl_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room fishbowl_rooms;
  v_speakers jsonb;
  v_listeners jsonb;
  v_hand_raises jsonb;
  v_speaker_count int;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_room
    FROM fishbowl_rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  -- Verify caller is the host
  IF v_room.host_fid != p_host_fid THEN
    RAISE EXCEPTION 'Only the host (fid %) can approve hand raises', v_room.host_fid;
  END IF;

  v_speakers := v_room.current_speakers;
  v_speaker_count := jsonb_array_length(v_speakers);

  -- Check capacity
  IF v_speaker_count >= v_room.hot_seat_count THEN
    RAISE EXCEPTION 'Room is full (% / % speakers)', v_speaker_count, v_room.hot_seat_count;
  END IF;

  -- Remove from hand_raises
  SELECT jsonb_agg(h) INTO v_hand_raises
    FROM jsonb_array_elements(v_room.hand_raises) AS h
    WHERE (h->>'fid')::bigint != p_fid;
  v_hand_raises := COALESCE(v_hand_raises, '[]'::jsonb);

  -- Remove from listeners if present
  SELECT jsonb_agg(l) INTO v_listeners
    FROM jsonb_array_elements(v_room.current_listeners) AS l
    WHERE (l->>'fid')::bigint != p_fid;
  v_listeners := COALESCE(v_listeners, '[]'::jsonb);

  -- Add to speakers
  v_speakers := v_speakers || jsonb_build_array(
    jsonb_build_object(
      'fid', p_fid,
      'username', p_username,
      'address', NULL,
      'joined_at', v_now,
      'last_seen', v_now
    )
  );

  UPDATE fishbowl_rooms
    SET current_speakers = v_speakers,
        current_listeners = v_listeners,
        hand_raises = v_hand_raises,
        last_active_at = v_now
    WHERE id = p_room_id
    RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;


-- ----- fishbowl_heartbeat -----
CREATE OR REPLACE FUNCTION fishbowl_heartbeat(
  p_room_id UUID,
  p_fid BIGINT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room fishbowl_rooms;
  v_speakers jsonb;
  v_listeners jsonb;
  v_now timestamptz := now();
  v_found boolean := false;
BEGIN
  SELECT * INTO v_room
    FROM fishbowl_rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_speakers := v_room.current_speakers;
  v_listeners := v_room.current_listeners;

  -- Try to update last_seen in speakers
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_speakers) AS s
    WHERE (s->>'fid')::bigint = p_fid
  ) THEN
    SELECT jsonb_agg(
      CASE
        WHEN (s->>'fid')::bigint = p_fid
        THEN s || jsonb_build_object('last_seen', v_now)
        ELSE s
      END
    ) INTO v_speakers
    FROM jsonb_array_elements(v_speakers) AS s;
    v_found := true;
  END IF;

  -- Try to update last_seen in listeners
  IF NOT v_found AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_listeners) AS l
    WHERE (l->>'fid')::bigint = p_fid
  ) THEN
    SELECT jsonb_agg(
      CASE
        WHEN (l->>'fid')::bigint = p_fid
        THEN l || jsonb_build_object('last_seen', v_now)
        ELSE l
      END
    ) INTO v_listeners
    FROM jsonb_array_elements(v_listeners) AS l;
    v_found := true;
  END IF;

  IF v_found THEN
    UPDATE fishbowl_rooms
      SET current_speakers = v_speakers,
          current_listeners = v_listeners,
          last_active_at = v_now
      WHERE id = p_room_id;
  END IF;

  RETURN v_found;
END;
$$;


COMMIT;
