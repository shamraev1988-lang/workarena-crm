-- ============================================================
-- Workarena CRM — Phase 1: Воронка ЗАЯВОК + Прозвон-чекин
-- Запускать ПОСЛЕ supabase-migration.sql
-- ============================================================

-- 1. ORDERS (Заявки / заказы) — связывает клиента и смены
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  -- Что за заявка
  order_no       serial,                 -- человеко-читаемый номер
  date           date not null,          -- дата выхода
  client_name    text not null,
  object_name    text,
  -- Потребность
  positions_needed jsonb default '[]',   -- [{position, count, rate}]
  staff_needed   integer default 0,      -- сколько всего нужно людей
  staff_assigned integer default 0,      -- сколько назначено (denormalized)
  reserve_needed integer default 0,      -- +30% резерв
  -- Воронка заявки
  stage          text default 'new',     -- new | staffing | assigned | checkin | on_shift | done | closed
  source         text default 'manual',  -- manual | client_form | phone
  -- Тайминги
  shift_start    text,                   -- '09:00'
  shift_end      text,                   -- '18:00'
  -- Деньги (план)
  client_total_plan numeric default 0,
  payout_plan       numeric default 0,
  notes          text
);

-- 2. Привязка смены к заявке + поля чекина
alter table shifts add column if not exists order_id uuid references orders(id) on delete set null;
alter table shifts add column if not exists checkin_status text default 'pending';  -- pending | confirmed | no_answer | replaced
alter table shifts add column if not exists checkin_at timestamptz;
alter table shifts add column if not exists is_reserve boolean default false;
alter table shifts add column if not exists source text default 'manual';

-- 3. Счётчики отказов/резерва у сотрудника
alter table employees add column if not exists declines_count integer default 0;
alter table employees add column if not exists reserve_saves integer default 0;
alter table employees add column if not exists pipeline_stage text default 'ready_to_go';

-- RLS
alter table orders enable row level security;
create policy "auth orders" on orders for all to authenticated using (true) with check (true);

-- Индексы
create index if not exists idx_orders_date on orders(date desc);
create index if not exists idx_orders_stage on orders(stage);
create index if not exists idx_orders_client on orders(client_name);
create index if not exists idx_shifts_order on shifts(order_id);
create index if not exists idx_shifts_checkin on shifts(checkin_status);

-- Триггер: пересчёт staff_assigned при изменении смен
create or replace function recalc_order_assigned() returns trigger as $$
begin
  update orders set staff_assigned = (
    select count(*) from shifts
    where order_id = coalesce(new.order_id, old.order_id)
      and coalesce(is_reserve, false) = false
  )
  where id = coalesce(new.order_id, old.order_id);
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_recalc_assigned on shifts;
create trigger trg_recalc_assigned
  after insert or update or delete on shifts
  for each row execute function recalc_order_assigned();

-- ============================================================
-- Phase 2: дата выплаты для массовых выплат
-- ============================================================
alter table shifts add column if not exists payout_date date;
create index if not exists idx_shifts_payout_status on shifts(payout_status);
