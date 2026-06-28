import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Wallet, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CASH_ACCOUNTS as CASH_ACCOUNTS_DEFAULT, CASH_FLOW_TYPES, EXPENSE_CATEGORIES as EXPENSE_CATEGORIES_DEFAULT } from '@/lib/constants';
import { useDict } from '@/lib/SettingsContext';

const CASH_ACCOUNTS = CASH_ACCOUNTS_DEFAULT;
const EXPENSE_CATEGORIES = EXPENSE_CATEGORIES_DEFAULT;

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  type: 'income', cash_account: '', to_account: '',
  amount: '', basis: '', counterparty: '', responsible: '', category: '', notes: '',
};

function CashFlowForm({ flow, onClose }) {
  const qc = useQueryClient();
  const _dict = useDict();
  const CASH_ACCOUNTS = _dict.cash_accounts;
  const EXPENSE_CATEGORIES = _dict.expense_categories;
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

/* Mobile card for one cash flow operation */
function FlowCard({ flow, onEdit, onDelete }) {
  const acc     = CASH_ACCOUNTS.find(a => a.value === flow.cash_account);
  const toAcc   = CASH_ACCOUNTS.find(a => a.value === flow.to_account);
  const typeInfo = CASH_FLOW_TYPES.find(t => t.value === flow.type);
  const catInfo  = EXPENSE_CATEGORIES.find(c => c.value === flow.category);
  const Icon = { income: ArrowUpCircle, expense: ArrowDownCircle, transfer: ArrowRightLeft }[flow.type] || Wallet;
  const amountColor = flow.type === 'income' ? 'text-emerald-600' : flow.type === 'expense' ? 'text-red-500' : 'text-blue-600';
  const sign = flow.type === 'income' ? '+' : flow.type === 'expense' ? '−' : '';

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
            flow.type === 'income' ? 'bg-emerald-50' : flow.type === 'expense' ? 'bg-red-50' : 'bg-blue-50'
          }`}>
            <Icon className={`w-4 h-4 ${amountColor}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">
              {flow.basis || typeInfo?.label || '—'}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {flow.date ? format(new Date(flow.date), 'dd.MM.yy') : '—'}
              {flow.counterparty && ` · ${flow.counterparty}`}
            </p>
          </div>
        </div>
        <p className={`text-base font-bold shrink-0 ${amountColor}`}>
          {sign}{fmt(flow.amount)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
            {acc?.label || flow.cash_account || '—'}
          </span>
          {toAcc && (
            <span className="text-xs text-zinc-400">→ {toAcc.label}</span>
          )}
          {catInfo && (
            <span className="text-xs text-zinc-400">{catInfo.label}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(flow)}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(flow)}
            className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Finance() {
  const qc = useQueryClient();
  const CASH_ACCOUNTS = useDict().cash_accounts;
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

  const balances = useMemo(() => {
    return CASH_ACCOUNTS.map(acc => {
      const income       = flows.filter(f => f.cash_account === acc.value && f.type === 'income').reduce((s, f) => s + (f.amount || 0), 0);
      const transfers_in = flows.filter(f => f.to_account   === acc.value && f.type === 'transfer').reduce((s, f) => s + (f.amount || 0), 0);
      const expense      = flows.filter(f => f.cash_account === acc.value && (f.type === 'expense' || f.type === 'transfer')).reduce((s, f) => s + (f.amount || 0), 0);
      return { ...acc, balance: income + transfers_in - expense, income, expense };
    });
  }, [flows]);

  const totalBalance = balances.reduce((s, b) => s + b.balance, 0);

  const filtered = flows.filter(f => {
    const q = search.toLowerCase();
    const match = !q || f.counterparty?.toLowerCase().includes(q) || f.basis?.toLowerCase().includes(q) || f.notes?.toLowerCase().includes(q);
    const acc = accountFilter === 'all' || f.cash_account === accountFilter || f.to_account === accountFilter;
    const tp  = typeFilter    === 'all' || f.type === typeFilter;
    return match && acc && tp;
  });

  function handleEdit(flow)   { setEditFlow(flow); setFormOpen(true); }
  function handleDelete(flow) { if (confirm('Удалить?')) del.mutate(flow.id); }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Финансы / Кассы"
        subtitle="Учёт движения денег"
        action={
          <Button onClick={() => { setEditFlow(null); setFormOpen(true); }} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Добавить операцию</span>
            <span className="sm:hidden">Добавить</span>
          </Button>
        }
      />

      {/* ── Остатки касс: вертикально на мобиле, горизонтально на десктопе ── */}
      <div className="px-4 md:px-6 py-4 bg-white border-b border-zinc-200">
        {/* Итого — всегда сверху */}
        <div className="bg-zinc-900 rounded-xl px-5 py-4 text-white mb-3">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Итого по всем кассам</p>
          <p className={`text-2xl font-bold mt-1 ${totalBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
            {fmt(totalBalance)}
          </p>
        </div>
        {/* Кассы: 2 колонки на мобиле, ряд на десктопе */}
        <div className="grid grid-cols-2 md:flex md:gap-3 gap-2">
          {balances.map(b => (
            <div key={b.value} className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 md:min-w-[160px]">
              <p className="text-xs text-zinc-500 font-medium leading-tight">{b.label}</p>
              <p className={`text-lg font-bold mt-1 ${b.balance >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>
                {fmt(b.balance)}
              </p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs text-emerald-600">↑ {fmt(b.income)}</span>
                <span className="text-xs text-red-500">↓ {fmt(b.expense)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Фильтры */}
      <div className="px-4 md:px-6 py-3 bg-white border-b border-zinc-200 flex gap-2 md:gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
        </div>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="h-10 w-36 md:w-48 text-sm"><SelectValue placeholder="Все кассы" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все кассы</SelectItem>
            {CASH_ACCOUNTS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-10 w-36 md:w-40 text-sm"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {CASH_FLOW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="py-20 text-center text-zinc-400 text-sm">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-400 text-sm">Операций нет</div>
        ) : (
          <>
            {/* ── Mobile: карточки ── */}
            <div className="md:hidden space-y-3">
              {filtered.map(flow => (
                <FlowCard key={flow.id} flow={flow} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>

            {/* ── Desktop: таблица ── */}
            <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      {['Дата','Тип','Касса','Основание','Кому/от кого','Категория','Сумма','Ответств.',''].map((h, i) => (
                        <th key={i} className={`px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap ${i === 6 ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filtered.map(flow => {
                      const acc      = CASH_ACCOUNTS.find(a => a.value === flow.cash_account);
                      const toAcc    = CASH_ACCOUNTS.find(a => a.value === flow.to_account);
                      const typeInfo = CASH_FLOW_TYPES.find(t => t.value === flow.type);
                      const catInfo  = EXPENSE_CATEGORIES.find(c => c.value === flow.category);
                      const Icon     = { income: ArrowUpCircle, expense: ArrowDownCircle, transfer: ArrowRightLeft }[flow.type] || Wallet;
                      const amtColor = flow.type === 'income' ? 'text-emerald-600' : flow.type === 'expense' ? 'text-red-500' : 'text-blue-600';
                      const sign     = flow.type === 'income' ? '+' : flow.type === 'expense' ? '−' : '';
                      return (
                        <tr key={flow.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                            {flow.date ? format(new Date(flow.date), 'dd.MM.yy') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className={`flex items-center gap-1.5 font-medium ${typeInfo?.color || 'text-zinc-600'}`}>
                              <Icon className="w-4 h-4" />
                              {typeInfo?.label || flow.type}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-zinc-900 text-xs font-medium whitespace-nowrap">{acc?.label || flow.cash_account}</div>
                            {toAcc && <div className="text-xs text-zinc-400">→ {toAcc.label}</div>}
                          </td>
                          <td className="px-4 py-3 text-zinc-700 max-w-[140px] truncate">{flow.basis || '—'}</td>
                          <td className="px-4 py-3 text-zinc-600 max-w-[120px] truncate">{flow.counterparty || '—'}</td>
                          <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{catInfo?.label || '—'}</td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums ${amtColor}`}>
                            {sign}{fmt(flow.amount)}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs">{flow.responsible || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEdit(flow)}
                                className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(flow)}
                                className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
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
          </>
        )}
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
