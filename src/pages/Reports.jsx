import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { format, getMonth, getYear, isThisMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Download, Target } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { POSITIONS, LEGAL_ENTITIES } from '@/lib/constants';
import { Can } from '@/lib/PermissionContext';

function fmt(n) {
  if (!n) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function KPI({ label, value, sub, color = 'text-zinc-900' }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 md:p-5">
      <p className="text-[10px] md:text-xs text-zinc-500 font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-xl md:text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Reports() {
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date());
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));
  const [planTarget, setPlanTarget] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // summary | objects | employees | selfemployed | annual

  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list('-date') });

  const years = [currentYear, currentYear - 1].map(String);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: format(new Date(2024, i, 1), 'LLLL', { locale: ru }),
  }));

  const periodShifts = useMemo(() =>
    shifts.filter(s => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return getYear(d) === Number(year) && getMonth(d) === Number(month);
    }), [shifts, year, month]);

  const revenue = periodShifts.reduce((s, sh) => s + (sh.client_total || 0), 0);
  const payroll = periodShifts.reduce((s, sh) => s + (sh.employee_payout || 0), 0);
  const hrSalary = periodShifts.reduce((s, sh) => s + (sh.hr_salary || 0), 0);
  // Налог по юр. лицу
  const taxes = periodShifts.reduce((s, sh) => {
    const rate = LEGAL_ENTITIES.find(e => e.value === sh.legal_entity)?.tax_rate || 0;
    return s + Math.round((sh.client_total || 0) * rate);
  }, 0);
  const margin = revenue - payroll - hrSalary - taxes;
  const marginPct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
  const plan = parseFloat(planTarget) || 0;
  const planPct = plan > 0 ? Math.min(100, Math.round((revenue / plan) * 100)) : 0;

  // P&L по объектам
  const byObject = useMemo(() => {
    const map = {};
    periodShifts.forEach(s => {
      const key = s.object_name || s.client_name || 'Без объекта';
      if (!map[key]) map[key] = { count: 0, revenue: 0, payroll: 0, hr: 0, taxes: 0 };
      const taxRate = LEGAL_ENTITIES.find(e => e.value === s.legal_entity)?.tax_rate || 0;
      map[key].count++;
      map[key].revenue += s.client_total || 0;
      map[key].payroll += s.employee_payout || 0;
      map[key].hr += s.hr_salary || 0;
      map[key].taxes += Math.round((s.client_total || 0) * taxRate);
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, margin: d.revenue - d.payroll - d.hr - d.taxes }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodShifts]);

  // Топ сотрудников
  const byEmployee = useMemo(() => {
    const map = {};
    periodShifts.forEach(s => {
      const k = s.employee_name || '—';
      if (!map[k]) map[k] = { count: 0, revenue: 0, payout: 0, ratingSum: 0, ratingCount: 0 };
      map[k].count++;
      map[k].revenue += s.client_total || 0;
      map[k].payout += s.employee_payout || 0;
      if (s.rating) { map[k].ratingSum += s.rating; map[k].ratingCount++; }
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, avg: d.ratingCount ? (d.ratingSum / d.ratingCount).toFixed(1) : null }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 15);
  }, [periodShifts]);

  // Отчёт для самозанятых
  const selfEmployed = useMemo(() => {
    const map = {};
    periodShifts.filter(s => s.is_self_employed).forEach(s => {
      const k = s.employee_name || '—';
      if (!map[k]) map[k] = { shifts: [], total: 0 };
      map[k].shifts.push(s);
      map[k].total += s.employee_payout || 0;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total);
  }, [periodShifts]);

  // Годовая динамика
  const yearlyData = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const ms = shifts.filter(s => s.date && getYear(new Date(s.date)) === Number(year) && getMonth(new Date(s.date)) === i);
    const r = ms.reduce((s, sh) => s + (sh.client_total || 0), 0);
    const p = ms.reduce((s, sh) => s + (sh.employee_payout || 0), 0);
    const t = ms.reduce((s, sh) => {
      const rate = LEGAL_ENTITIES.find(e => e.value === sh.legal_entity)?.tax_rate || 0;
      return s + Math.round((sh.client_total || 0) * rate);
    }, 0);
    return { month: format(new Date(2024, i, 1), 'LLL', { locale: ru }), revenue: r, payroll: p, taxes: t, margin: r - p - t, count: ms.length };
  }), [shifts, year]);

  const maxRevenue = Math.max(...yearlyData.map(d => d.revenue), 1);

  // Экспорт СЗ в Excel
  function exportSelfEmployed() {
    const rows = [];
    selfEmployed.forEach(emp => {
      emp.shifts.forEach(s => {
        rows.push({
          'ФИО': emp.name,
          'Дата': s.date ? format(new Date(s.date), 'dd.MM.yyyy') : '',
          'Объект': s.object_name || s.client_name || '',
          'Должность': POSITIONS.find(p => p.value === s.position)?.label || s.position || '',
          'Часов': s.hours || '',
          'Ставка ₽/ч': s.employee_rate || '',
          'Сумма': s.employee_payout || '',
        });
      });
      rows.push({ 'ФИО': `ИТОГО ${emp.name}`, 'Сумма': emp.total });
      rows.push({});
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:25},{wch:12},{wch:20},{wch:16},{wch:7},{wch:10},{wch:12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Самозанятые');
    XLSX.writeFile(wb, `Workarena_СЗ_${months[month]?.label}_${year}.xlsx`);
    toast.success('Отчёт СЗ скачан');
  }

  const tabs = [
    { key: 'summary', label: 'Сводка' },
    { key: 'objects', label: 'По объектам' },
    { key: 'employees', label: 'Сотрудники' },
    { key: 'selfemployed', label: 'Самозанятые' },
    { key: 'annual', label: 'Год' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader title="Аналитика" />

      {/* Фильтры */}
      <div className="px-4 md:px-6 py-3 bg-white border-b border-zinc-200 flex flex-wrap gap-2 items-center">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-24 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <Target className="w-4 h-4 text-zinc-400" />
          <Input type="number" placeholder="План выручки ₽" value={planTarget} onChange={e => setPlanTarget(e.target.value)} className="w-40 h-9 text-sm" />
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-0 border-b border-zinc-200 bg-white overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}>{t.label}</button>
        ))}
      </div>

      <div className="p-4 md:p-6 space-y-4">

        {/* СВОДКА */}
        {activeTab === 'summary' && (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KPI label="Выручка" value={fmt(revenue)} sub={`${periodShifts.length} смен`} />
              <KPI label="ФОТ + HR" value={fmt(payroll + hrSalary)} color="text-red-500" />
              <KPI label="Налоги" value={fmt(taxes)} sub="авто по юр. лицу" color="text-amber-600" />
              <KPI label="Маржа" value={fmt(margin)} sub={`${marginPct}%`} color={margin >= 0 ? 'text-emerald-600' : 'text-red-500'} />
              <KPI label="Смен" value={periodShifts.length} sub={`${new Set(periodShifts.map(s => s.employee_name)).size} сотруд.`} />
            </div>

            {/* План/факт */}
            {plan > 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-zinc-700">План выручки</p>
                  <p className="text-sm font-bold text-zinc-900">{fmt(revenue)} / {fmt(plan)} ({planPct}%)</p>
                </div>
                <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${planPct >= 100 ? 'bg-emerald-500' : planPct >= 70 ? 'bg-amber-500' : 'bg-red-400'}`}
                    style={{ width: `${planPct}%` }} />
                </div>
                <p className="text-xs text-zinc-400 mt-1.5">
                  {planPct >= 100 ? `✓ Перевыполнено на ${fmt(revenue - plan)}` : `Осталось ${fmt(plan - revenue)}`}
                </p>
              </div>
            )}

            {/* P&L сводная */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100">
                <h2 className="font-semibold text-sm text-zinc-900">P&L отчёт</h2>
              </div>
              <div className="divide-y divide-zinc-50">
                {[
                  { label: 'Выручка от заказчиков', value: revenue, color: 'text-zinc-900' },
                  { label: '— ФОТ (выплаты сотрудникам)', value: -payroll, color: 'text-red-500' },
                  { label: '— ЗП HR', value: -hrSalary, color: 'text-red-400' },
                  { label: '— Налоги (УСН)', value: -taxes, color: 'text-amber-600' },
                  { label: '= Чистая маржа', value: margin, color: margin >= 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center px-5 py-3">
                    <span className="text-sm text-zinc-600">{row.label}</span>
                    <span className={`text-sm ${row.color}`}>{fmt(Math.abs(row.value))}{row.value < 0 && row.label !== '= Чистая маржа' ? ' ↓' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ПО ОБЪЕКТАМ */}
        {activeTab === 'objects' && (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100"><h2 className="font-semibold text-sm">P&L по объектам</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-100 bg-zinc-50">
                  {['Объект','Смен','Выручка','ФОТ + HR','Налог','Маржа','Маржа %'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-zinc-50">
                  {byObject.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">Нет данных</td></tr>
                  ) : byObject.map(o => {
                    const pct = o.revenue > 0 ? Math.round((o.margin / o.revenue) * 100) : 0;
                    return (
                      <tr key={o.name} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-medium text-zinc-900">{o.name}</td>
                        <td className="px-4 py-3 text-zinc-600">{o.count}</td>
                        <td className="px-4 py-3 font-medium">{fmt(o.revenue)}</td>
                        <td className="px-4 py-3 text-red-500">{fmt(o.payroll + o.hr)}</td>
                        <td className="px-4 py-3 text-amber-600">{fmt(o.taxes)}</td>
                        <td className={`px-4 py-3 font-semibold ${o.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(o.margin)}</td>
                        <td className={`px-4 py-3 ${pct >= 30 ? 'text-emerald-600' : pct >= 10 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* СОТРУДНИКИ */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100"><h2 className="font-semibold text-sm">Топ сотрудников</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-100 bg-zinc-50">
                  {['Сотрудник','Смен','Выручка','Выплачено','Рейтинг'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-zinc-50">
                  {byEmployee.map(e => (
                    <tr key={e.name} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{e.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{e.count}</td>
                      <td className="px-4 py-3">{fmt(e.revenue)}</td>
                      <td className="px-4 py-3 text-red-500">{fmt(e.payout)}</td>
                      <td className="px-4 py-3 text-amber-500">{e.avg ? `★ ${e.avg}` : '—'}</td>
                    </tr>
                  ))}
                  {byEmployee.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">Нет данных</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* САМОЗАНЯТЫЕ */}
        {activeTab === 'selfemployed' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-zinc-600">{selfEmployed.length} самозанятых, {selfEmployed.reduce((s, e) => s + e.shifts.length, 0)} смен</p>
              <Button variant="outline" size="sm" onClick={exportSelfEmployed} disabled={selfEmployed.length === 0}>
                <Download className="w-4 h-4 mr-1" /> Скачать Excel
              </Button>
            </div>
            {selfEmployed.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 bg-white rounded-xl border border-zinc-200">Самозанятых в этом периоде нет</div>
            ) : selfEmployed.map(emp => (
              <div key={emp.name} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="flex justify-between items-center px-5 py-3 bg-zinc-50 border-b border-zinc-100">
                  <span className="font-semibold text-sm text-zinc-900">{emp.name}</span>
                  <span className="text-sm font-bold text-emerald-700">{fmt(emp.total)}</span>
                </div>
                <div className="divide-y divide-zinc-50">
                  {emp.shifts.map(s => (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-2.5 text-xs text-zinc-600">
                      <span className="w-20 shrink-0">{s.date ? format(new Date(s.date), 'dd.MM.yyyy') : '—'}</span>
                      <span className="flex-1 truncate">{s.object_name || s.client_name}</span>
                      <span>{POSITIONS.find(p => p.value === s.position)?.label || s.position}</span>
                      <span className="w-16 text-right font-medium text-zinc-900">{fmt(s.employee_payout)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ГОДОВАЯ ДИНАМИКА */}
        {activeTab === 'annual' && (
          <div className="space-y-4">
            {/* Столбцы */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h2 className="font-semibold text-sm text-zinc-900 mb-4">Выручка по месяцам — {year}</h2>
              <div className="flex items-end gap-1.5 h-36">
                {yearlyData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end" style={{ height: '108px' }}>
                      <div
                        className={`w-full rounded-t transition-all ${Number(month) === i ? 'bg-indigo-600' : 'bg-indigo-200'}`}
                        style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 108)}px` }}
                        title={fmt(d.revenue)}
                      />
                    </div>
                    <span className="text-[9px] text-zinc-400">{d.month}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Таблица */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-100 bg-zinc-50">
                    {['Месяц','Смен','Выручка','ФОТ','Налоги','Маржа'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-50">
                    {yearlyData.map((d, i) => (
                      <tr key={i} className={`hover:bg-zinc-50 cursor-pointer ${Number(month) === i ? 'bg-indigo-50/50' : ''}`}
                        onClick={() => { setMonth(String(i)); setActiveTab('summary'); }}>
                        <td className="px-4 py-2.5 font-medium text-zinc-900">{d.month}</td>
                        <td className="px-4 py-2.5 text-zinc-600">{d.count}</td>
                        <td className="px-4 py-2.5">{d.revenue > 0 ? fmt(d.revenue) : '—'}</td>
                        <td className="px-4 py-2.5 text-red-500">{d.payroll > 0 ? fmt(d.payroll) : '—'}</td>
                        <td className="px-4 py-2.5 text-amber-600">{d.taxes > 0 ? fmt(d.taxes) : '—'}</td>
                        <td className={`px-4 py-2.5 font-semibold ${d.margin > 0 ? 'text-emerald-600' : d.margin < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                          {d.margin !== 0 ? fmt(d.margin) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
