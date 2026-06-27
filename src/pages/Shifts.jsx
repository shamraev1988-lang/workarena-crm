import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SHIFT_STATUSES, PAYMENT_STATUSES, POSITIONS } from '@/lib/constants';
import ShiftFormDialog from '@/components/shifts/ShiftFormDialog';
import ShiftDetailDialog from '@/components/shifts/ShiftDetailDialog';

function fmt(n) {
  if (!n) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ value, options }) {
  const s = options?.find(o => o.value === value);
  if (!s) return <span className="text-zinc-400 text-xs">—</span>;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${s.color}`}>{s.label}</span>;
}

/* Mobile card for one shift */
function ShiftCard({ shift, onView, onEdit, onDelete }) {
  const margin = (shift.client_total || 0) - (shift.employee_payout || 0);
  const status = SHIFT_STATUSES.find(s => s.value === shift.status);
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 text-sm truncate">{shift.client_name || '—'}</p>
          <p className="text-xs text-zinc-400 truncate">{shift.object_name || ''}</p>
        </div>
        <p className="text-xs text-zinc-500 shrink-0">
          {shift.date ? format(new Date(shift.date), 'dd.MM.yy') : '—'}
        </p>
      </div>

      {/* Employee + position */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-700">{shift.employee_name || '—'}</span>
        {shift.is_self_employed && (
          <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">СЗ</span>
        )}
        <span className="text-xs text-zinc-400">
          {POSITIONS.find(p => p.value === shift.position)?.label || shift.position || '—'}
        </span>
        {shift.hours && <span className="text-xs text-zinc-400">{shift.hours} ч</span>}
      </div>

      {/* Financials */}
      <div className="grid grid-cols-3 gap-2 bg-zinc-50 rounded-lg p-2.5">
        <div className="text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Сотруднику</p>
          <p className="text-xs font-semibold text-zinc-700 mt-0.5">{fmt(shift.employee_payout)}</p>
        </div>
        <div className="text-center border-x border-zinc-200">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Заказчику</p>
          <p className="text-xs font-semibold text-zinc-900 mt-0.5">{fmt(shift.client_total)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Маржа</p>
          <p className={`text-xs font-bold mt-0.5 ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {fmt(margin)}
          </p>
        </div>
      </div>

      {/* Status row + actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge value={shift.status}         options={SHIFT_STATUSES}   />
          <StatusBadge value={shift.payment_status} options={PAYMENT_STATUSES} />
          {shift.rating > 0 && (
            <span className="text-amber-400 text-xs">{'★'.repeat(shift.rating)}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onView(shift)}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(shift)}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(shift)}
            className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Shifts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payFilter, setPayFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [viewShift, setViewShift] = useState(null);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => entities.Shift.list('-date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Shift.delete(id),
    onSuccess: () => { qc.invalidateQueries(['shifts']); toast.success('Смена удалена'); },
    onError:   () => toast.error('Ошибка удаления'),
  });

  const filtered = shifts.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.client_name?.toLowerCase().includes(q)   ||
      s.employee_name?.toLowerCase().includes(q) ||
      s.object_name?.toLowerCase().includes(q)   ||
      s.position?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchPay    = payFilter    === 'all' || s.payment_status === payFilter;
    return matchSearch && matchStatus && matchPay;
  });

  const totalRevenue = filtered.reduce((s, sh) => s + (sh.client_total    || 0), 0);
  const totalPayroll = filtered.reduce((s, sh) => s + (sh.employee_payout || 0), 0);
  const totalMargin  = totalRevenue - totalPayroll;

  function handleEdit(shift)   { setEditShift(shift); setFormOpen(true); }
  function handleView(shift)   { setViewShift(shift); setDetailOpen(true); }
  function handleNew()         { setEditShift(null);  setFormOpen(true); }
  function handleDelete(shift) {
    if (confirm('Удалить смену?')) deleteMutation.mutate(shift.id);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Смены / Табель"
        subtitle={`${filtered.length} смен`}
        action={
          <Button onClick={handleNew} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Добавить смену</span>
            <span className="sm:hidden">Добавить</span>
          </Button>
        }
      />

      {/* Итоговая строка — scroll-x on tiny screens */}
      <div className="px-4 md:px-6 py-3 bg-white border-b border-zinc-200 overflow-x-auto">
        <div className="flex gap-4 md:gap-8 text-sm min-w-max">
          <div>
            <span className="text-zinc-500 text-xs">Выручка</span>
            <p className="font-semibold text-zinc-900">{fmt(totalRevenue)}</p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">ФОТ</span>
            <p className="font-semibold text-zinc-900">{fmt(totalPayroll)}</p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">Маржа</span>
            <p className={`font-bold ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(totalMargin)}</p>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="px-4 md:px-6 py-3 bg-white border-b border-zinc-200 flex gap-2 md:gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-36 md:w-44 text-sm">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {SHIFT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="h-10 w-36 md:w-44 text-sm">
            <SelectValue placeholder="Оплата" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все оплаты</SelectItem>
            {PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="py-20 text-center text-zinc-400 text-sm">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-400 text-sm">Смен не найдено</div>
        ) : (
          <>
            {/* ── Mobile: card list ── */}
            <div className="md:hidden space-y-3">
              {filtered.map(shift => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* ── Desktop: table ── */}
            <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      {['Дата','Заказчик / Объект','Сотрудник','Должность','Часы','Сотруднику','Заказчику','Маржа','Статус','Оплата','Рейтинг',''].map((h, i) => (
                        <th key={i} className={`px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap ${i >= 5 && i <= 7 ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filtered.map(shift => {
                      const margin = (shift.client_total || 0) - (shift.employee_payout || 0);
                      return (
                        <tr key={shift.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                            {shift.date ? format(new Date(shift.date), 'dd.MM.yy') : '—'}
                          </td>
                          <td className="px-4 py-3 max-w-[180px]">
                            <div className="font-medium text-zinc-900 truncate">{shift.client_name || '—'}</div>
                            <div className="text-xs text-zinc-400 truncate">{shift.object_name || ''}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-zinc-900 whitespace-nowrap">{shift.employee_name || '—'}</div>
                            {shift.is_self_employed && (
                              <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">СЗ</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                            {POSITIONS.find(p => p.value === shift.position)?.label || shift.position || '—'}
                          </td>
                          <td className="px-4 py-3 text-zinc-600 text-center">{shift.hours || '—'}</td>
                          <td className="px-4 py-3 text-right text-zinc-700 tabular-nums">{fmt(shift.employee_payout)}</td>
                          <td className="px-4 py-3 text-right font-medium text-zinc-900 tabular-nums">{fmt(shift.client_total)}</td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {fmt(margin)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge value={shift.status}         options={SHIFT_STATUSES}   />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge value={shift.payment_status} options={PAYMENT_STATUSES} />
                          </td>
                          <td className="px-4 py-3 text-amber-400 text-sm">
                            {shift.rating ? '★'.repeat(shift.rating) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleView(shift)}
                                className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEdit(shift)}
                                className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(shift)}
                                className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
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

      <ShiftFormDialog   open={formOpen}   onClose={() => setFormOpen(false)}   shift={editShift} />
      <ShiftDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} shift={viewShift} />
    </div>
  );
}
