-- ============================================================
-- Workarena CRM — Настройки системы (редактируемые справочники + параметры)
-- ============================================================
create table if not exists settings (
  id text primary key default 'main',
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table settings enable row level security;

-- Чтение разрешено всем аутентифицированным; запись тоже (роли разграничиваются в UI)
drop policy if exists "read settings" on settings;
create policy "read settings" on settings for select to authenticated using (true);
drop policy if exists "write settings" on settings;
create policy "write settings" on settings for all to authenticated using (true) with check (true);

-- Стартовая строка (пустой объект → фронт подставит дефолты из constants.js)
insert into settings (id, data) values ('main', '{}') on conflict (id) do nothing;
