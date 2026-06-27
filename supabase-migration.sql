-- ============================================================
-- Workarena CRM — Supabase Migration
-- ============================================================

-- 1. SHIFTS (Смены / Табель)
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  -- Основное
  date date not null,
  work_type text,
  status text default 'planned',
  -- Заказчик
  client_name text,
  object_name text,
  legal_entity text,
  -- Сотрудник
  employee_name text,
  employee_phone text,
  position text,
  is_self_employed boolean default false,
  -- Расчёт
  hours numeric,
  employee_rate numeric,
  adjustment numeric default 0,
  extra_amount numeric default 0,
  employee_payout numeric,
  client_rate numeric,
  client_extra numeric default 0,
  client_total numeric,
  hr_salary numeric default 0,
  -- Оплаты
  payment_status text default 'not_invoiced',
  payout_status text default 'pending',
  -- Оценка
  rating integer,
  notes text
);

-- 2. EMPLOYEES (Сотрудники)
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  full_name text not null,
  phone text,
  telegram text,
  position text,
  citizenship text,
  is_self_employed boolean default false,
  self_employed_tin text,
  docs_checked boolean default false,
  status text default 'active',
  rating integer,
  reliability text,
  notes text
);

-- 3. CLIENTS (Заказчики)
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  inn text,
  legal_entity text,
  contact_name text,
  phone text,
  email text,
  address text,
  default_object text,
  payment_terms text,
  payment_delay integer,
  client_rate_default numeric,
  status text default 'active',
  notes text
);

-- 4. CASH_FLOWS (Финансы / Кассы)
create table if not exists cash_flows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date not null,
  type text not null, -- income / expense / transfer
  cash_account text not null,
  to_account text, -- для transfer
  amount numeric not null,
  basis text,
  counterparty text,
  responsible text,
  category text,
  notes text
);

-- 5. INVOICES (Счета)
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date,
  client_name text,
  legal_entity text,
  amount numeric,
  status text default 'draft',
  period_start date,
  period_end date,
  notes text
);

-- 6. APP_ROLES
create table if not exists app_roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  role text default 'user',
  full_name text
);

-- RLS
alter table shifts enable row level security;
alter table employees enable row level security;
alter table clients enable row level security;
alter table cash_flows enable row level security;
alter table invoices enable row level security;
alter table app_roles enable row level security;

-- Политики
create policy "auth shifts" on shifts for all to authenticated using (true) with check (true);
create policy "auth employees" on employees for all to authenticated using (true) with check (true);
create policy "auth clients" on clients for all to authenticated using (true) with check (true);
create policy "auth cash_flows" on cash_flows for all to authenticated using (true) with check (true);
create policy "auth invoices" on invoices for all to authenticated using (true) with check (true);
create policy "auth app_roles" on app_roles for all to authenticated using (true) with check (true);

-- Storage
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true) on conflict do nothing;
create policy "upload" on storage.objects for insert to authenticated with check (bucket_id = 'uploads');
create policy "read uploads" on storage.objects for select to public using (bucket_id = 'uploads');

-- Индексы
create index if not exists idx_shifts_date on shifts(date desc);
create index if not exists idx_shifts_client on shifts(client_name);
create index if not exists idx_shifts_employee on shifts(employee_name);
create index if not exists idx_shifts_status on shifts(status);
create index if not exists idx_shifts_payment on shifts(payment_status);
create index if not exists idx_cash_flows_date on cash_flows(date desc);
create index if not exists idx_cash_flows_account on cash_flows(cash_account);
