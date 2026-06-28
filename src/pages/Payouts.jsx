import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Banknote, Check, ChevronDown, ChevronRight, Wallet, Filter, CircleDollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAYOUT_STATUSES, CASH_ACCOUNTS, POSITIONS } from '@/lib/constants';

const fmt = (n) => !n ? '0 ₽' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
const posLabel = (v) => POSITIONS.find(p => p.value === v)?.label || v || '—';

export default function Payouts() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(() => new Set());
  const [method, setMethod] = useState('paid_cash');
  const [account, setAccount] = useState('cash');
  const [collapsed, setCollapsed] = useState({});
  const [onlyCompleted, setOnlyCompleted] = useState(true);

  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list('-date') });

  // К выплате: смены с payout_status pending и (опц.) завершённые
  const pending = useMemo(() => shifts.filter(s =>
    (s.payout_status === 'pending' || !s.payout_status) &&
    (s.employee_payout || 0) > 0 &&
    (!onlyCompleted || s.status === 'completed')
  ), [shifts, onlyCompleted]);

  // Группировка по сотруднику
  const groups = useMemo(() => {
    const map = new Map();
    for (const s of pending) {
      const k = s.employee_name || '—';
      if (!map.has(k)) map.set(k, { name: k, phone: s.employee_phone, items: [], sum: 0 });
      const g = map.get(k); g.items.push(s); g.sum += s.employee_payout || 0;
    }
    return [...map.values()].sort((a, b) => b.sum - a.sum);
  }, [pending]);

  const totalPending = pending.reduce((s, x) => s + (x.employee_payout || 0), 0);
  const selectedShifts = pending.filter(s => selected.has(s.id));
  const selectedSum = selectedShifts.reduce((s, x) => s + (x.employee_payout || 0), 0);

  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleGroup = (g) => setSelected(prev => {
    const n = new Set(prev);
    const allIn = g.items.every(i => n.has(i.id));
    g.items.forEach(i => allIn ? n.delete(i.id) : n.add(i.id));
    return n;
  });
  const selectAll = () => setSelected(new Set(pending.map(s => s.id)));
  const clearAll = () => setSelected(new Set());

  const payout = useMutation({
    mutationFn: async () => {
      const ids = [...selected];
      // 1. Обновляем статус выплаты по сменам
      await Promise.all(ids.map(id =>
        entities.Shift.update(id, { payout_status: method, payout_date: new Date().toISOString().slice(0, 10) })
      ));
      // 2. Один сводный расход в кассу
      await entities.CashFlow.create({
        date: new Date().toISOString().slice(0, 10),
        type: 'expense',
        cash_account: account,
        amount: selectedSum,
        basis: `Массовая выплата исполнителям (${ids.length} смен)`,
        category: 'salary_employee',
        counterparty: selectedShifts.length === 1 ? selectedShifts[0].employee_name : `${groups.filter(g => g.items.some(i => selected.has(i.id))).length} чел.`,
        notes: 'Создано из раздела «Выплаты»',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['cash_flows'] });
      toast.success(`Выплачено ${fmt(selectedSum)} (${selected.size} смен)`);
      clearAll();
    },
    onError: (e) => toast.error('Ошибка: ' + e.message),
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-32 md:pb-24">
      <PageHeader title="Выплаты" subtitle="Массовая выплата исполнителям" />

      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        {/* Сводка */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-[10px] md:text-xs text-zinc-500 font-semibold uppercase">К выплате всего</p>
            <p className="text-xl md:text-2xl font-bold text-zinc-900 mt-1">{fmt(totalPending)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{pending.length} смен · {groups.length} чел.</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <p className="text-[10px] md:text-xs text-amber-600 font-semibold uppercase">Выбрано</p>
            <p className="text-xl md:text-2xl font-bold text-amber-700 mt-1">{fmt(selectedSum)}</p>
            <p className="text-xs text-amber-500 mt-0.5">{selected.size} смен</p>
          </div>
        </div>

        {/* Управление выбором */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 font-medium">Выбрать всех</button>
          <button onClick={clearAll} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 font-medium">Снять выбор</button>
          <button onClick={() => setOnlyCompleted(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1 ${onlyCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-zinc-200 text-zinc-500'}`}>
            <Filter className="w-3 h-3" /> Только завершённые
          </button>
        </div>

        {/* Список по сотрудникам */}
        {groups.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">
            <CircleDollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Нет смен к выплате
          </div>
        ) : groups.map(g => {
          const allIn = g.items.every(i => selected.has(i.id));
          const someIn = !allIn && g.items.some(i => selected.has(i.id));
          const isCollapsed = collapsed[g.name];
          return (
            <div key={g.name} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
                <button onClick={() => toggleGroup(g)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    allIn ? 'bg-amber-500 border-amber-500 text-white' : someIn ? 'bg-amber-100 border-amber-300' : 'border-zinc-300 bg-white'}`}>
                  {allIn && <Check className="w-3.5 h-3.5" />}
                  {someIn && <div className="w-2 h-2 bg-amber-500 rounded-sm" />}
                </button>
                <button onClick={() => setCollapsed(c => ({ ...c, [g.name]: !c[g.name] }))} className="flex items-center gap-1.5 min-w-0 flex-1 text-left">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-300 shrink-0" />}
                  <span className="font-semibold text-sm text-zinc-900 truncate">{g.name}</span>
                  <span className="text-xs text-zinc-400 shrink-0">· {g.items.length} смен</span>
                </button>
                <span className="font-bold text-sm text-zinc-900 shrink-0">{fmt(g.sum)}</span>
              </div>

              {!isCollapsed && (
                <div className="divide-y divide-zinc-50">
                  {g.items.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 cursor-pointer">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)}
                        className="w-4 h-4 rounded accent-amber-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-700 truncate">{s.client_name} {s.object_name ? `· ${s.object_name}` : ''}</p>
                        <p className="text-xs text-zinc-400">{s.date ? format(new Date(s.date), 'dd.MM.yy') : '—'} · {posLabel(s.position)} · {s.hours || '—'}ч</p>
                      </div>
                      <span className="text-sm font-medium text-zinc-900 shrink-0">{fmt(s.employee_payout)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Нижняя панель действия */}
      {selected.size > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 md:left-[240px] right-0 bg-white border-t border-zinc-200 px-4 py-3 z-40 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-9 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYOUT_STATUSES.filter(p => p.value !== 'pending').map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger className="h-9 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{CASH_ACCOUNTS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => payout.mutate()} disabled={payout.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 font-semibold">
              <Banknote className="w-4 h-4 mr-1.5" />
              Выплатить {fmt(selectedSum)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
