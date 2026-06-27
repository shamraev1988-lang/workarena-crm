import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CASH_ACCOUNTS, CASH_FLOW_TYPES, EXPENSE_CATEGORIES } from '@/lib/constants';

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  type: 'income',
  cash_account: '',
  to_account: '',
  amount: '',
  basis: '',
  counterparty: '',
  responsible: '',
  category: '',
  notes: '',
};

function CashFlowForm({ flow, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(flow ? { ...EMPTY, ...flow } : EMPTY);
  const isEdit = !!flow?.id;
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = useMutation({
    mutationFn: d => isEdit ? entities.CashFlow.update(flow.id, d) : entities.CashFlow.create(d),
    onSuccess: () => { qc.invalidateQueries(['cash_flows']); toast.success(isEdit ? 'Обновлено' : 'Добавлено'); onClose(); },
    onError: e => toast.error(e.message),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Дата *</Label>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Тип операции</Label>
          <Select value={form.type} onValueChange={v => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CASH_FLOW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Касса {form.type === 'transfer' ? '(откуда)' : ''} *</Label>
          <Select value={form.cash_account} onValueChange={v => set('cash_account', v)}>
            <SelectTrigger><SelectValue placeholder="Выберите кассу" /></SelectTrigger>
            <SelectContent>{CASH_ACCOUNTS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {form.type === 'transfer' && (
          <div className="space-y-1.5">
            <Label>Касса (куда)</Label>
            <Select value={form.to_account} onValueChange={v => set('to_account', v)}>
              <SelectTrigger><SelectValue placeholder="Выберите кассу" /></SelectTrigger>
              <SelectContent>{CASH_ACCOUNTS.filter(a => a.value !== form.cash_account).map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Сумма (₽) *</Label>
          <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Кому / от кого</Label>
          <Input value={form.counterparty} onChange={e => set('counterparty', e.target.value)} placeholder="Название / ФИО" />
        </div>
        <div className="space-y-1.5">
          <Label>Основание</Label>
          <Input value={form.basis} onChange={e => set('basis', e.target.value)} placeholder="Оплата счёта / Выплата ЗП..." />
        </div>
        <div className="space-y-1.5">
          <Label>Категория</Label>
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Ответственный</Label>
          <Input value={form.responsible} onChange={e => set('responsible', e.target.value)} placeholder="Юлиан / Марина..." />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Комментарий</Label>
          <Input value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
        <Button type="submit" disabled={save.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
          {save.isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}

export default function Finance() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editFlow, setEditFlow] = useState(null);

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ['cash_flows'],
    queryFn: () => entities.CashFlow.list('-date'),
  });

  const del = useMutation({
    mutationFn: id => entities.CashFlow.delete(id),
    onSuccess: () => { qc.invalidateQueries(['cash_flows']); toast.success('Удалено'); },
  });

  // Остатки по кассам
  const balances = useMemo(() => {
    return CASH_ACCOUNTS.map(acc => {
      const income = flows.filter(f => f.cash_account === acc.value && f.type === 'income').reduce((s, f) => s + (f.amount || 0), 0);
      const transfers_in = flows.filter(f => f.to_account === acc.value && f.type === 'transfer').reduce((s, f) => s + (f.amount || 0), 0);
      const expense = flows.filter(f => f.cash_account === acc.value && (f.type === 'expense' || f.type === 'transfer')).reduce((s, f) => s + (f.amount || 0), 0);
      return { ...acc, balance: income + transfers_in - expense, income, expense };
    });
  }, [flows]);

  const totalBalance = balances.reduce((s, b) => s + b.balance, 0);

  const filtered = flows.filter(f => {
    const q = search.toLowerCase();
    const match = !q || f.counterparty?.toLowerCase().includes(q) || f.basis?.toLowerCase().includes(q) || f.notes?.toLowerCase().includes(q);
    const acc = accountFilter === 'all' || f.cash_account === accountFilter || f.to_account === accountFilter;
    const tp = typeFilter === 'all' || f.type === typeFilter;
    return match && acc && tp;
  });

  const TYPE_ICONS = { income: ArrowUpCircle, expense: ArrowDownCircle, transfer: ArrowRightLeft };

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Финансы / Кассы"
        subtitle="Учёт движения денег"
        action={
          <Button onClick={() => { setEditFlow(null); setFormOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Добавить операцию
          </Button>
        }
      />

      {/* Сводка касс */}
      <div className="px-6 py-4 bg-white border-b border-zinc-200">
        <div className="flex gap-4 overflow-x-auto pb-1">
          <div className="flex-shrink-0 bg-zinc-900 rounded-xl px-5 py-3 text-white min-w-[140px]">
            <p className="text-xs text-zinc-400">Итого</p>
            <p className="text-xl font-bold mt-0.5">{fmt(totalBalance)}</p>
          </div>
          {balances.map(b => (
            <div key={b.value} className="flex-shrink-0 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 min-w-[160px]">
              <p className="text-xs text-zinc-500 font-medium">{b.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${b.balance >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>{fmt(b.balance)}</p>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-emerald-600">↑ {fmt(b.income)}</span>
                <span className="text-xs text-red-500">↓ {fmt(b.expense)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Фильтры */}
      <div className="px-4 md:px-6 py-3 bg-white border-b border-zinc-200 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
        </div>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="h-9 w-52"><SelectValue placeholder="Все кассы" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все кассы</SelectItem>
            {CASH_ACCOUNTS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {CASH_FLOW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Таблица операций */}
      <div className="p-4 md:p-6">
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Дата</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Тип</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Касса</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Основание</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Кому/от кого</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Категория</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Сумма</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Ответств.</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {isLoading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-400">Загрузка...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-400">Операций нет</td></tr>
                ) : filtered.map(flow => {
                  const acc = CASH_ACCOUNTS.find(a => a.value === flow.cash_account);
                  const toAcc = CASH_ACCOUNTS.find(a => a.value === flow.to_account);
                  const typeInfo = CASH_FLOW_TYPES.find(t => t.value === flow.type);
                  const Icon = TYPE_ICONS[flow.type] || Wallet;
                  const catInfo = EXPENSE_CATEGORIES.find(c => c.value === flow.category);
                  return (
                    <tr key={flow.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                        {flow.date ? format(new Date(flow.date), 'dd.MM.yy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 text-sm font-medium ${typeInfo?.color || 'text-zinc-600'}`}>
                          <Icon className="w-4 h-4" />
                          {typeInfo?.label || flow.type}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-900 text-xs font-medium">{acc?.label || flow.cash_account}</div>
                        {toAcc && <div className="text-xs text-zinc-400">→ {toAcc.label}</div>}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{flow.basis || '—'}</td>
                      <td className="px-4 py-3 text-zinc-600">{flow.counterparty || '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{catInfo?.label || '—'}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${flow.type === 'income' ? 'text-emerald-600' : flow.type === 'expense' ? 'text-red-500' : 'text-blue-600'}`}>
                        {flow.type === 'income' ? '+' : flow.type === 'expense' ? '−' : ''}
                        {fmt(flow.amount)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{flow.responsible || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditFlow(flow); setFormOpen(true); }} className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => { if (confirm('Удалить?')) del.mutate(flow.id); }} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={() => setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editFlow ? 'Редактировать операцию' : 'Новая операция'}</DialogTitle>
          </DialogHeader>
          <CashFlowForm flow={editFlow} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
