import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { CalendarDays, Users, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { format, isThisMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SHIFT_STATUSES, PAYMENT_STATUSES, CASH_ACCOUNTS } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import DayBoard from '@/components/DayBoard';

function StatCard({ title, value, sub, icon: Icon, trend, color = 'amber' }) {
  const colors = {
    amber:   'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue:    'bg-blue-50 text-blue-600',
    violet:  'bg-violet-50 text-violet-600',
  };
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs text-zinc-500 font-semibold uppercase tracking-wide leading-tight">
            {title}
          </p>
          <p className="text-xl md:text-2xl font-bold text-zinc-900 mt-1 leading-tight">{value}</p>
          {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}% к прошлому месяцу
        </div>
      )}
    </div>
  );
}

function fmt(n) {
  if (!n) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

export default function Dashboard() {
  const { data: shifts = [] }    = useQuery({ queryKey: ['shifts'],     queryFn: () => entities.Shift.list('-date') });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'],  queryFn: () => entities.Employee.list('-created_at') });
  const { data: clients = [] }   = useQuery({ queryKey: ['clients'],    queryFn: () => entities.Client.list('-created_at') });
  const { data: cashFlows = [] } = useQuery({ queryKey: ['cash_flows'], queryFn: () => entities.CashFlow.list('-date') });

  const thisMonthShifts = shifts.filter(s => s.date && isThisMonth(new Date(s.date)));
  const revenue  = thisMonthShifts.reduce((s, sh) => s + (sh.client_total    || 0), 0);
  const payroll  = thisMonthShifts.reduce((s, sh) => s + (sh.employee_payout || 0), 0);
  const margin   = revenue - payroll;
  const activeEmployees = employees.filter(e => e.status === 'active').length;

  const recentShifts = shifts.slice(0, 8);

  const cashBalances = CASH_ACCOUNTS.map(acc => {
    const income  = cashFlows.filter(f => f.cash_account === acc.value && f.type === 'income' ).reduce((s, f) => s + (f.amount || 0), 0);
    const expense = cashFlows.filter(f => f.cash_account === acc.value && f.type === 'expense').reduce((s, f) => s + (f.amount || 0), 0);
    return { ...acc, balance: income - expense };
  });

  const totalBalance = cashBalances.reduce((s, c) => s + c.balance, 0);
  const unpaidShifts = shifts.filter(s => s.payment_status === 'not_invoiced' || s.payment_status === 'invoiced').length;

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Дашборд"
        subtitle={format(new Date(), 'LLLL yyyy', { locale: ru })}
      />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Операционный экран дня */}
        <DayBoard />

        {/* KPI grid: 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Выручка (месяц)"    value={fmt(revenue)}         icon={TrendingUp}   color="amber"   />
          <StatCard title="Маржа (месяц)"      value={fmt(margin)}          sub={`ФОТ: ${fmt(payroll)}`} icon={ArrowUpRight} color="emerald" />
          <StatCard title="Смены в месяце"     value={thisMonthShifts.length} sub={`${unpaidShifts} без оплаты`} icon={CalendarDays} color="blue" />
          <StatCard title="Активных сотрудников" value={activeEmployees}    sub={`Всего: ${employees.length}`} icon={Users} color="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Последние смены */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900 text-sm md:text-base">Последние смены</h2>
              <a href="/shifts" className="text-xs text-amber-600 hover:underline">Все смены →</a>
            </div>
            <div className="divide-y divide-zinc-50">
              {recentShifts.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-sm">Нет смен</div>
              ) : recentShifts.map(shift => {
                const status    = SHIFT_STATUSES.find(s => s.value === shift.status);
                const payStatus = PAYMENT_STATUSES.find(s => s.value === shift.payment_status);
                return (
                  <div key={shift.id} className="px-4 md:px-5 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{shift.client_name || '—'}</p>
                        <p className="text-xs text-zinc-400 truncate">
                          {shift.employee_name || '—'} · {shift.position || '—'} · {shift.date ? format(new Date(shift.date), 'dd.MM') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {/* Hide badge on very small screens */}
                      {status && (
                        <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-zinc-900 tabular-nums">{fmt(shift.client_total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Остатки касс */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-4 md:px-5 py-3 md:py-4 border-b border-zinc-100">
                <h2 className="font-semibold text-zinc-900 text-sm md:text-base">Остатки касс</h2>
                <p className="text-xl md:text-2xl font-bold text-zinc-900 mt-1">{fmt(totalBalance)}</p>
                <p className="text-xs text-zinc-400">Итого по всем кассам</p>
              </div>
              <div className="divide-y divide-zinc-50">
                {cashBalances.map(acc => (
                  <div key={acc.value} className="px-4 md:px-5 py-3 flex items-center justify-between">
                    <p className="text-xs md:text-sm font-medium text-zinc-700">{acc.label}</p>
                    <span className={`text-sm font-semibold tabular-nums ${acc.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {fmt(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ожидают оплаты */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">Ожидают оплаты</h3>
              </div>
              <p className="text-2xl font-bold text-amber-900">{unpaidShifts}</p>
              <p className="text-xs text-amber-600 mt-0.5">смен без оплаты от заказчиков</p>
              <a href="/shifts?filter=unpaid" className="text-xs text-amber-700 font-medium hover:underline mt-2 block">
                Смотреть →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
