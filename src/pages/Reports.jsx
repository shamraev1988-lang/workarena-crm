import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { format, getMonth, getYear, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import PageHeader from '@/components/layout/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { POSITIONS, LEGAL_ENTITIES } from '@/lib/constants';

function fmt(n) {
  if (!n) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function KPI({ label, value, sub, color = 'text-zinc-900' }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Reports() {
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));

  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list('-date') });

  const years = [currentYear, currentYear - 1].map(String);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: format(new Date(2024, i, 1), 'LLLL', { locale: ru }),
  }));

  // Фильтрация по периоду
  const periodShifts = useMemo(() => {
    return shifts.filter(s => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return getYear(d) === Number(year) && getMonth(d) === Number(month);
    });
  }, [shifts, year, month]);

  const revenue = periodShifts.reduce((s, sh) => s + (sh.client_total || 0), 0);
  const payroll = periodShifts.reduce((s, sh) => s + (sh.employee_payout || 0), 0);
  const hrSalary = periodShifts.reduce((s, sh) => s + (sh.hr_salary || 0), 0);
  const margin = revenue - payroll - hrSalary;
  const marginPct = revenue > 0 ? ((margin / revenue) * 100).toFixed(1) : 0;

  // По должностям
  const byPosition = useMemo(() => {
    const map = {};
    periodShifts.forEach(s => {
      const pos = s.position || 'other';
      if (!map[pos]) map[pos] = { count: 0, revenue: 0, payroll: 0 };
      map[pos].count++;
      map[pos].revenue += s.client_total || 0;
      map[pos].payroll += s.employee_payout || 0;
    });
    return Object.entries(map)
      .map(([pos, d]) => ({ pos, label: POSITIONS.find(p => p.value === pos)?.label || pos, ...d }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodShifts]);

  // По заказчикам
  const byClient = useMemo(() => {
    const map = {};
    periodShifts.forEach(s => {
      const cl = s.client_name || 'Не указан';
      if (!map[cl]) map[cl] = { count: 0, revenue: 0, payroll: 0 };
      map[cl].count++;
      map[cl].revenue += s.client_total || 0;
      map[cl].payroll += s.employee_payout || 0;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, margin: d.revenue - d.payroll }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodShifts]);

  // По сотрудникам (топ)
  const byEmployee = useMemo(() => {
    const map = {};
    periodShifts.forEach(s => {
      const emp = s.employee_name || 'Не указан';
      if (!map[emp]) map[emp] = { count: 0, revenue: 0, payout: 0, ratingSum: 0, ratingCount: 0 };
      map[emp].count++;
      map[emp].revenue += s.client_total || 0;
      map[emp].payout += s.employee_payout || 0;
      if (s.rating) { map[emp].ratingSum += s.rating; map[emp].ratingCount++; }
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, avgRating: d.ratingCount ? (d.ratingSum / d.ratingCount).toFixed(1) : null }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [periodShifts]);

  // Годовая динамика (для текущего года)
  const yearlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const ms = shifts.filter(s => {
        if (!s.date) return false;
        const d = new Date(s.date);
        return getYear(d) === Number(year) && getMonth(d) === i;
      });
      return {
        month: format(new Date(2024, i, 1), 'LLL', { locale: ru }),
        revenue: ms.reduce((s, sh) => s + (sh.client_total || 0), 0),
        payroll: ms.reduce((s, sh) => s + (sh.employee_payout || 0), 0),
        count: ms.length,
      };
    });
  }, [shifts, year]);

  const maxRevenue = Math.max(...yearlyData.map(d => d.revenue), 1);

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader title="Аналитика" subtitle="Финансовые показатели по периодам" />

      {/* Фильтры */}
      <div className="px-4 md:px-6 py-3 bg-white border-b border-zinc-200 flex gap-3">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPI label="Выручка" value={fmt(revenue)} sub={`${periodShifts.length} смен`} />
          <KPI label="ФОТ" value={fmt(payroll)} sub="Выплаты сотрудникам" color="text-red-500" />
          <KPI label="ЗП HR" value={fmt(hrSalary)} color="text-orange-500" />
          <KPI label="Маржа" value={fmt(margin)} sub={`${marginPct}% от выручки`} color={margin >= 0 ? 'text-emerald-600' : 'text-red-500'} />
          <KPI label="Смен" value={periodShifts.length} sub={`Сотрудников: ${new Set(periodShifts.map(s => s.employee_name).filter(Boolean)).size}`} />
        </div>

        {/* Годовая динамика */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="font-semibold text-zinc-900 text-sm mb-4">Выручка по месяцам — {year}</h2>
          <div className="flex items-end gap-2 h-32">
            {yearlyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                  <div
                    className={`w-full rounded-t transition-all ${Number(month) === i ? 'bg-amber-500' : 'bg-amber-200'}`}
                    style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 96)}px` }}
                    title={fmt(d.revenue)}
                  />
                </div>
                <span className="text-xs text-zinc-400">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* По заказчикам */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="font-semibold text-zinc-900 text-sm">По заказчикам</h2>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-50 bg-zinc-50">
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Заказчик</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Смен</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Выручка</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Маржа</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-50">
                {byClient.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 text-sm">Нет данных</td></tr>
                ) : byClient.map(c => (
                  <tr key={c.name} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 font-medium text-zinc-900">{c.name}</td>
                    <td className="px-4 py-2.5 text-right text-zinc-600">{c.count}</td>
                    <td className="px-4 py-2.5 text-right text-zinc-900">{fmt(c.revenue)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${c.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(c.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* По должностям */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="font-semibold text-zinc-900 text-sm">По должностям</h2>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-50 bg-zinc-50">
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Должность</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Смен</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Выручка</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">ФОТ</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-50">
                {byPosition.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 text-sm">Нет данных</td></tr>
                ) : byPosition.map(p => (
                  <tr key={p.pos} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 font-medium text-zinc-900">{p.label}</td>
                    <td className="px-4 py-2.5 text-right text-zinc-600">{p.count}</td>
                    <td className="px-4 py-2.5 text-right text-zinc-900">{fmt(p.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-red-500">{fmt(p.payroll)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Топ сотрудников */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="font-semibold text-zinc-900 text-sm">Топ сотрудников по выручке</h2>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-50 bg-zinc-50">
              <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Сотрудник</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Смен</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Выручка</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Выплачено</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Рейтинг</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-50">
              {byEmployee.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">Нет данных</td></tr>
              ) : byEmployee.map(e => (
                <tr key={e.name} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-medium text-zinc-900">{e.name}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-600">{e.count}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-900">{fmt(e.revenue)}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{fmt(e.payout)}</td>
                  <td className="px-4 py-2.5 text-right text-amber-500">
                    {e.avgRating ? `★ ${e.avgRating}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
