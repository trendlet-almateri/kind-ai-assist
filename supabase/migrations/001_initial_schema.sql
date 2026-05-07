-- ============================================================
-- 001_initial_schema.sql
-- Full schema for kind-ai-assist — multi-tenant SaaS platform
-- Run against: ysnheuddlfafaqfrwzxl.supabase.co
-- Column names match types/database.ts exactly.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "vector";

-- ── Enums ────────────────────────────────────────────────────
create type agent_role        as enum ('admin', 'agent');
create type agent_status      as enum ('active', 'suspended', 'archived');
create type conv_status       as enum ('open', 'assigned', 'resolved', 'closed');
create type conv_channel      as enum ('web', 'whatsapp');
create type message_role      as enum ('user', 'assistant', 'agent', 'system');
create type takeover_type     as enum ('human_took_over', 'ai_resumed');
create type llm_provider      as enum ('openai', 'openrouter');
create type knowledge_status  as enum ('uploading', 'processing', 'ready', 'failed', 'deleted');

-- ── Workspaces ───────────────────────────────────────────────
create table workspaces (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  slug        text        not null unique,
  plan        text        not null default 'starter',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Agent Profiles ────────────────────────────────────────────
create table agent_profiles (
  id            uuid         primary key references auth.users(id) on delete cascade,
  workspace_id  uuid         not null references workspaces(id) on delete cascade,
  full_name     text         not null,
  username      text         not null unique,
  email         text         not null unique,
  avatar_url    text,
  role          agent_role   not null default 'agent',
  status        agent_status not null default 'active',
  is_online     boolean      not null default false,
  last_seen_at  timestamptz,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

create index idx_agent_profiles_workspace on agent_profiles(workspace_id);

-- ── Workspace Settings ────────────────────────────────────────
create table workspace_settings (
  id                      uuid        primary key default uuid_generate_v4(),
  workspace_id            uuid        not null unique references workspaces(id) on delete cascade,
  ai_enabled              boolean     not null default true,
  auto_return_ai_minutes  integer     not null default 30,
  auto_return_enabled     boolean     not null default true,
  escalation_enabled      boolean     not null default true,
  escalation_keywords     text[]      not null default array['urgent','cancel','refund','lawsuit','angry','manager'],
  openai_vector_store_id  text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── System Prompts ────────────────────────────────────────────
create table system_prompts (
  id           uuid         primary key default uuid_generate_v4(),
  workspace_id uuid         not null references workspaces(id) on delete cascade,
  name         text         not null,
  content      text         not null,
  is_active    boolean      not null default false,
  model        text         not null default 'gpt-4o',
  provider     llm_provider not null default 'openai',
  temperature  numeric(3,2) not null default 0.3,
  created_by   uuid         references agent_profiles(id) on delete set null,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create index idx_system_prompts_workspace on system_prompts(workspace_id);
create index idx_system_prompts_active    on system_prompts(workspace_id, is_active) where is_active = true;

-- ── Conversations ─────────────────────────────────────────────
create table conversations (
  id                   uuid         primary key default uuid_generate_v4(),
  workspace_id         uuid         not null references workspaces(id) on delete cascade,
  channel              conv_channel not null default 'whatsapp',
  customer_name        text,
  customer_email       text,
  customer_phone       text,
  status               conv_status  not null default 'open',
  is_ai_active         boolean      not null default true,
  assigned_agent       uuid         references agent_profiles(id) on delete set null,
  auto_return_enabled  boolean      not null default true,
  agent_last_reply_at  timestamptz,
  needs_human_review   boolean      not null default false,
  escalation_reason    text,
  unread_count         integer      not null default 0,
  last_message_at      timestamptz,
  tags                 text[]       not null default '{}',
  metadata             jsonb        not null default '{}',
  deleted_at           timestamptz,
  created_at           timestamptz  not null default now(),
  updated_at           timestamptz  not null default now()
);

create index idx_conversations_workspace    on conversations(workspace_id);
create index idx_conversations_phone        on conversations(workspace_id, customer_phone);
create index idx_conversations_status       on conversations(workspace_id, status) where deleted_at is null;
create index idx_conversations_assigned     on conversations(assigned_agent) where assigned_agent is not null;
create index idx_conversations_last_message on conversations(workspace_id, last_message_at desc) where deleted_at is null;

-- ── Messages ──────────────────────────────────────────────────
create table messages (
  id               uuid         primary key default uuid_generate_v4(),
  workspace_id     uuid         not null references workspaces(id) on delete cascade,
  conversation_id  uuid         not null references conversations(id) on delete cascade,
  role             message_role not null,
  content          text         not null,
  sender_name      text,
  is_read          boolean      not null default false,
  model_used       text,
  tokens_used      integer,
  wa_message_id    text,        -- WhatsApp message ID for dedup
  metadata         jsonb        not null default '{}',
  created_at       timestamptz  not null default now()
);

create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_messages_workspace    on messages(workspace_id);
create index idx_messages_wa_id        on messages(wa_message_id) where wa_message_id is not null;

-- ── Takeover Events ───────────────────────────────────────────
create table takeover_events (
  id               uuid          primary key default uuid_generate_v4(),
  workspace_id     uuid          not null references workspaces(id) on delete cascade,
  conversation_id  uuid          not null references conversations(id) on delete cascade,
  agent_id         uuid          not null references agent_profiles(id),
  event_type       takeover_type not null default 'human_took_over',
  note             text,
  created_at       timestamptz   not null default now()
);

create index idx_takeover_conversation on takeover_events(conversation_id);
create index idx_takeover_workspace    on takeover_events(workspace_id);
create index idx_takeover_agent        on takeover_events(agent_id);

-- ── Knowledge Sources ─────────────────────────────────────────
create table knowledge_sources (
  id               uuid             primary key default uuid_generate_v4(),
  workspace_id     uuid             not null references workspaces(id) on delete cascade,
  name             text             not null,
  description      text,
  file_name        text             not null,
  file_type        text             not null,
  file_size        bigint,
  storage_path     text,
  openai_file_id   text,
  openai_vs_file_id text,
  status           knowledge_status not null default 'uploading',
  error_msg        text,
  metadata         jsonb            not null default '{}',
  uploaded_by      uuid             references agent_profiles(id) on delete set null,
  created_at       timestamptz      not null default now(),
  updated_at       timestamptz      not null default now()
);

create index idx_knowledge_workspace on knowledge_sources(workspace_id);
create index idx_knowledge_status    on knowledge_sources(workspace_id, status);

-- ── Raw WhatsApp Message Log ──────────────────────────────────
create table twilio_messages (
  id               uuid        primary key default uuid_generate_v4(),
  workspace_id     uuid        not null references workspaces(id) on delete cascade,
  message_sid      text,
  from_number      text,
  to_number        text,
  body             text,
  direction        text        not null default 'inbound',
  profile_name     text,
  status           text,
  conversation_id  uuid        references conversations(id) on delete set null,
  raw_payload      jsonb       not null default '{}',
  created_at       timestamptz not null default now()
);

create index idx_twilio_workspace   on twilio_messages(workspace_id);
create index idx_twilio_from_number on twilio_messages(from_number);

-- ════════════════════════════════════════════════════════════
-- TRIGGERS
-- ════════════════════════════════════════════════════════════

-- ── updated_at auto-stamp ─────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_workspaces_updated_at         before update on workspaces          for each row execute function set_updated_at();
create trigger trg_agent_profiles_updated_at     before update on agent_profiles      for each row execute function set_updated_at();
create trigger trg_workspace_settings_updated_at before update on workspace_settings  for each row execute function set_updated_at();
create trigger trg_system_prompts_updated_at     before update on system_prompts      for each row execute function set_updated_at();
create trigger trg_conversations_updated_at      before update on conversations       for each row execute function set_updated_at();
create trigger trg_knowledge_sources_updated_at  before update on knowledge_sources   for each row execute function set_updated_at();

-- ── Update conversation.last_message_at on new message ────────
create or replace function update_conversation_on_message()
returns trigger language plpgsql as $$
begin
  update conversations
  set
    last_message_at = new.created_at,
    unread_count    = case
      when new.role = 'user' then unread_count + 1
      else unread_count
    end
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_messages_update_conversation
after insert on messages
for each row execute function update_conversation_on_message();

-- ── Ensure only one active system prompt per workspace ────────
create or replace function enforce_single_active_prompt()
returns trigger language plpgsql as $$
begin
  if new.is_active = true then
    update system_prompts
    set is_active = false
    where workspace_id = new.workspace_id
      and id != new.id
      and is_active = true;
  end if;
  return new;
end;
$$;

create trigger trg_single_active_prompt
before insert or update on system_prompts
for each row when (new.is_active = true)
execute function enforce_single_active_prompt();

-- ── Auto-create workspace_settings when workspace is inserted ─
create or replace function create_workspace_defaults()
returns trigger language plpgsql as $$
begin
  insert into workspace_settings (workspace_id)
  values (new.id);
  return new;
end;
$$;

create trigger trg_workspace_defaults
after insert on workspaces
for each row execute function create_workspace_defaults();

-- ════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ════════════════════════════════════════════════════════════

create or replace function my_workspace_id()
returns uuid language sql stable security definer as $$
  select workspace_id from agent_profiles where id = auth.uid()
$$;

create or replace function my_role()
returns agent_role language sql stable security definer as $$
  select role from agent_profiles where id = auth.uid()
$$;

-- KPI summary
create or replace function get_kpi_summary(p_workspace_id uuid)
returns table (
  total_conversations   bigint,
  open_conversations    bigint,
  resolved_today        bigint,
  avg_response_minutes  numeric,
  ai_handled_pct        numeric
) language plpgsql stable as $$
begin
  return query
  select
    count(*)                                                   as total_conversations,
    count(*) filter (where status = 'open')                    as open_conversations,
    count(*) filter (
      where status = 'resolved'
        and updated_at >= date_trunc('day', now())
    )                                                          as resolved_today,
    0::numeric                                                 as avg_response_minutes,
    round(
      100.0 * count(*) filter (where is_ai_active = true)
        / nullif(count(*), 0),
      1
    )                                                          as ai_handled_pct
  from conversations
  where workspace_id = p_workspace_id
    and deleted_at is null;
end;
$$;

-- Conversations over time (last N days)
create or replace function get_conversations_over_time(
  p_workspace_id uuid,
  p_days         integer default 7
)
returns table (date text, count bigint)
language plpgsql stable as $$
begin
  return query
  select
    to_char(d.day, 'Mon DD') as date,
    count(c.id)              as count
  from generate_series(
    date_trunc('day', now()) - ((p_days - 1) * interval '1 day'),
    date_trunc('day', now()),
    interval '1 day'
  ) as d(day)
  left join conversations c
    on date_trunc('day', c.created_at) = d.day
   and c.workspace_id = p_workspace_id
   and c.deleted_at is null
  group by d.day
  order by d.day;
end;
$$;

-- Agent activity
create or replace function get_agent_activity(p_workspace_id uuid)
returns table (
  agent_id     uuid,
  agent_name   text,
  avatar_url   text,
  conv_count   bigint,
  is_online    boolean
) language plpgsql stable as $$
begin
  return query
  select
    ap.id,
    ap.full_name,
    ap.avatar_url,
    count(c.id) as conv_count,
    ap.is_online
  from agent_profiles ap
  left join conversations c
    on c.assigned_agent = ap.id
   and c.workspace_id = p_workspace_id
   and c.deleted_at is null
   and c.status not in ('resolved', 'closed')
  where ap.workspace_id = p_workspace_id
    and ap.status = 'active'
  group by ap.id, ap.full_name, ap.avatar_url, ap.is_online
  order by conv_count desc;
end;
$$;

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
alter table workspaces         enable row level security;
alter table agent_profiles     enable row level security;
alter table workspace_settings enable row level security;
alter table system_prompts     enable row level security;
alter table conversations      enable row level security;
alter table messages           enable row level security;
alter table takeover_events    enable row level security;
alter table knowledge_sources  enable row level security;
alter table twilio_messages    enable row level security;

-- workspaces
create policy "workspace: members read own"
  on workspaces for select
  using (id = my_workspace_id());

-- agent_profiles
create policy "profiles: members read workspace"
  on agent_profiles for select
  using (workspace_id = my_workspace_id());

create policy "profiles: admin write"
  on agent_profiles for all
  using (workspace_id = my_workspace_id() and my_role() = 'admin');

create policy "profiles: self update"
  on agent_profiles for update
  using (id = auth.uid());

-- workspace_settings
create policy "settings: members read"
  on workspace_settings for select
  using (workspace_id = my_workspace_id());

create policy "settings: admin update"
  on workspace_settings for update
  using (workspace_id = my_workspace_id() and my_role() = 'admin');

-- system_prompts
create policy "prompts: members read"
  on system_prompts for select
  using (workspace_id = my_workspace_id());

create policy "prompts: admin manage"
  on system_prompts for all
  using (workspace_id = my_workspace_id() and my_role() = 'admin');

-- conversations
create policy "conversations: members read"
  on conversations for select
  using (workspace_id = my_workspace_id() and deleted_at is null);

create policy "conversations: members write"
  on conversations for all
  using (workspace_id = my_workspace_id() and deleted_at is null);

-- messages
create policy "messages: members read"
  on messages for select
  using (workspace_id = my_workspace_id());

create policy "messages: members insert"
  on messages for insert
  with check (workspace_id = my_workspace_id());

-- takeover_events
create policy "takeovers: members read"
  on takeover_events for select
  using (workspace_id = my_workspace_id());

create policy "takeovers: members insert"
  on takeover_events for insert
  with check (workspace_id = my_workspace_id());

-- knowledge_sources
create policy "knowledge: members read"
  on knowledge_sources for select
  using (workspace_id = my_workspace_id() and status != 'deleted');

create policy "knowledge: admin manage"
  on knowledge_sources for all
  using (workspace_id = my_workspace_id() and my_role() = 'admin');

-- twilio_messages (admin-only raw log)
create policy "twilio: admin read"
  on twilio_messages for select
  using (workspace_id = my_workspace_id() and my_role() = 'admin');

-- ════════════════════════════════════════════════════════════
-- STORAGE
-- ════════════════════════════════════════════════════════════
-- Run in Supabase Dashboard → Storage → New bucket:
--   Name: knowledge-base, Public: false
--
-- Then add RLS policies:
--   INSERT: authenticated users can upload to {user_id}/* paths
--   SELECT: members of the same workspace can read

-- ════════════════════════════════════════════════════════════
-- SEED: Bootstrap instructions
-- ════════════════════════════════════════════════════════════
-- 1. Sign up the first admin user via Supabase Auth (email + password)
--    in the Supabase Dashboard → Authentication → Users → Invite user
--
-- 2. Then run this SQL (replace placeholders):
--
-- insert into workspaces (id, name, slug, plan) values
--   ('00000000-0000-0000-0000-000000000001', 'Kind AI', 'kind-ai', 'starter');
--
-- insert into agent_profiles
--   (id, workspace_id, full_name, username, email, role) values
--   ('<AUTH_USER_ID>', '00000000-0000-0000-0000-000000000001',
--    'Admin', 'admin', '<YOUR_EMAIL>', 'admin');
--
-- The trigger auto-creates workspace_settings for the new workspace.
