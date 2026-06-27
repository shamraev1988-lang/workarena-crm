import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, Search, Edit2, Trash2, Eye, Copy, Download, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SHIFT_STATUSES, PAYMENT_STATUSES, POSITIONS } from '@/lib/constants';
import ShiftFormDialog from '@/components/shifts/ShiftFormDialog';
import ShiftDetailDialog from '@/components/shifts/ShiftDetailDialog';
import { Can, usePermission } from '@/lib/PermissionContext';

function fmt(n) {
  if (!n) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ value, options }) {
  const s = options?.find(o => o.value === value);
  if (!s) return null;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${s.color}`}>{s.label}</span>;
}

function ShiftCard({ shift, onView, onEdit, onDuplicate, onDelete, canFinance, canEdit }) {
  const margin = (shift.client_total || 0) - (shift.employee_payout || 0);
  const status = SHIFT_STATUSES.find(s => s.value === shift.status);
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3 active:bg-zinc-50" onClick={() => onView(shift)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 text-sm truncate">{shift.client_name || '—'}</p>
          <p className="text-xs text-zinc-400">{shift.date ? format(new Date(shift.date), 'dd.MM.yy') : '—'} {shift.object_name ? `· ${shift.object_name}` : ''}</p>
        </div>
        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {canEdit && (
            <>
              <button onClick={() => onDuplicate(shift)} title="Дублировать"
                className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-indigo-600 hover:border-indigo-200">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onEdit(shift)}
                className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-zinc-700">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { if (confirm('Удалить смену?')) onDelete(shift.id) }}
                className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-700">{shift.employee_name || '—'}</span>
        {shift.is_self_employed && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">СЗ</span>}
        <span className="text-xs text-zinc-400">{POSITIONS.find(p => p.value === shift.position)?.label || shift.position || '—'}</span>
        {shift.hours && <span className="text-xs text-zinc-400">{shift.hours} ч</span>}
      </div>
      {canFinance && (
        <div className="grid grid-cols-3 gap-2 bg-zinc-50 rounded-lg p-2.5">
          <div className="text-center">
            <p className="text-[10px] text-zinc-400 uppercase">Сотруднику</p>
            <p className="text-xs font-semibold text-zinc-700 mt-0.5">{fmt(shift.employee_payout)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-zinc-400 uppercase">Заказчику</p>
            <p className="text-xs font-semibold text-emerald-700 mt-0.5">{fmt(shift.client_total)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-zinc-400 uppercase">Маржа</p>
            <p className={`text-xs font-semibold mt-0.5 ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(margin)}</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {status && <StatusBadge value={shift.status} options={SHIFT_STATUSES} />}
          <StatusBadge value={shift.payment_status} options={PAYMENT_STATUSES} />
        </div>
        {shift.rating > 0 && <span className="text-amber-400 text-xs">{'★'.repeat(shift.rating)}</span>}
      </div>
    </div>
  );
}

export default function Shifts() {
  const qc = useQueryClient();
  const { can } = usePermission();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payFilter, setPayFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [duplicateShift, setDuplicateShift] = useState(null);
  const [viewShift, setViewShift] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const canFinance = can('shifts.view_finance');
  const canEdit = can('shifts.edit') || can('shifts.create');

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'], queryFn: () => entities.Shift.list('-date'),
  });

  const del = useMutation({
    mutationFn: id => entities.Shift.delete(id),
    onSuccess: () => { qc.invalidateQueries(['shifts']); toast.success('Смена удалена'); },
  });

  const filtered = shifts.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.client_name?.toLowerCase().includes(q) || s.employee_name?.toLowerCase().includes(q) || s.object_name?.toLowerCase().includes(q)) &&
      (statusFilter === 'all' || s.status === statusFilter) &&
      (payFilter === 'all' || s.payment_status === payFilter);
  });

  const totalRevenue = filtered.reduce((s, sh) => s + (sh.client_total || 0), 0);
  const totalPayroll = filtered.reduce((s, sh) => s + (sh.employee_payout || 0), 0);
  const totalMargin = totalRevenue - totalPayroll;

  // Экспорт в Excel
  function exportExcel() {
    const rows = filtered.map(s => ({
      'Дата': s.date ? format(new Date(s.date), 'dd.MM.yyyy') : '',
      'Заказчик': s.client_name || '',
      'Объект': s.object_name || '',
      'Юр. лицо': s.legal_entity || '',
      'Сотрудник': s.employee_name || '',
      'Должность': POSITIONS.find(p => p.value === s.position)?.label || s.position || '',
      'СЗ': s.is_self_employed ? 'Да' : 'Нет',
      'Тип работ': s.work_type || '',
      'Часов': s.hours || '',
      'Ставка сотруднику': s.employee_rate || '',
      'Выплата сотруднику': s.employee_payout || '',
      'Ставка заказчику': s.client_rate || '',
      'Итого с заказчика': s.client_total || '',
      'Маржа': (s.client_total || 0) - (s.employee_payout || 0),
      'ЗП HR': s.hr_salary || '',
      'Статус смены': SHIFT_STATUSES.find(st => st.value === s.status)?.label || s.status || '',
      'Оплата': PAYMENT_STATUSES.find(st => st.value === s.payment_status)?.label || '',
      'Выплата': s.payout_status || '',
      'Оценка': s.rating || '',
      'Примечания': s.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Ширины колонок
    ws['!cols'] = [
      {wch:12},{wch:20},{wch:20},{wch:18},{wch:22},{wch:16},{wch:5},{wch:14},
      {wch:7},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12},{wch:8},
      {wch:16},{wch:16},{wch:12},{wch:7},{wch:30},
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Табель');
    const month = format(new Date(), 'MM-yyyy');
    XLSX.writeFile(wb, `Workarena_табель_${month}.xlsx`);
    toast.success('Табель скачан');
  }

  function handleNew() { setEditShift(null); setDuplicateShift(null); setFormOpen(true); }
  function handleEdit(s) { setEditShift(s); setDuplicateShift(null); setFormOpen(true); }
  function handleDuplicate(s) { setEditShift(null); setDuplicateShift(s); setFormOpen(true); }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Смены / Табель"
        subtitle={`${filtered.length} смен`}
        action={
          <div className="flex gap-2">
            <Can permission="shifts.export">
              <Button variant="outline" size="sm" onClick={exportExcel} title="Экспорт в Excel">
                <Download className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Excel</span>
              </Button>
            </Can>
            <Can permission="shifts.create">
              <Button size="sm" onClick={handleNew}>
                <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Добавить</span>
              </Button>
            </Can>
          </div>
        }
      />

      {/* Итоги */}
      {canFinance && (
        <div className="flex gap-3 px-3 md:px-6 py-2 bg-white border-b border-zinc-100 text-xs overflow-x-auto scrollbar-hide">
          <span className="shrink-0"><span className="text-zinc-400">Выручка </span><span className="font-bold">{fmt(totalRevenue)}</span></span>
          <span className="text-zinc-200">|</span>
          <span className="shrink-0"><span className="text-zinc-400">ФОТ </span><span className="font-bold">{fmt(totalPayroll)}</span></span>
          <span className="text-zinc-200">|</span>
          <span className="shrink-0"><span className="text-zinc-400">Маржа </span><span className={`font-bold ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(totalMargin)}</span></span>
        </div>
      )}

      {/* Фильтры */}
      <div className="px-3 md:px-6 py-2 bg-white border-b border-zinc-100 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <Button variant="outline" size="sm" className={`h-9 px-3 ${showFilters ? 'bg-indigo-50 border-indigo-300' : ''}`}
            onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </Button>
        </div>
        {showFilters && (
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {SHIFT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={payFilter} onValueChange={setPayFilter}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Оплата" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все оплаты</SelectItem>
                {PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Мобиль: карточки */}
      <div className="md:hidden px-3 pt-3 pb-2 space-y-2">
        {isLoading ? <div className="py-16 text-center text-zinc-400">Загрузка...</div>
        : filtered.length === 0 ? <div className="py-16 text-center text-zinc-400">Смен не найдено</div>
        : filtered.map(shift => (
          <ShiftCard key={shift.id} shift={shift} canFinance={canFinance} canEdit={canEdit}
            onView={s => { setViewShift(s); setDetailOpen(true); }}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={id => del.mutate(id)}
          />
        ))}
      </div>

      {/* Десктоп: таблица */}
      <div className="hidden md:block p-6">
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  {['Дата','Заказчик / Объект','Сотрудник','Должность','Ч',
                    ...(canFinance ? ['Сотруднику','Заказчику','Маржа'] : []),
                    'Статус','Оплата','★',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {isLoading ? <tr><td colSpan={13} className="px-4 py-12 text-center text-zinc-400">Загрузка...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={13} className="px-4 py-12 text-center text-zinc-400">Нет смен</td></tr>
                : filtered.map(shift => {
                  const margin = (shift.client_total || 0) - (shift.employee_payout || 0);
                  return (
                    <tr key={shift.id} className="hover:bg-zinc-50 cursor-pointer" onClick={() => { setViewShift(shift); setDetailOpen(true); }}>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{shift.date ? format(new Date(shift.date), 'dd.MM.yy') : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900">{shift.client_name}</div>
                        <div className="text-xs text-zinc-400">{shift.object_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-900">{shift.employee_name}</div>
                        {shift.is_self_employed && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">СЗ</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{POSITIONS.find(p => p.value === shift.position)?.label || shift.position}</td>
                      <td className="px-4 py-3 text-center text-zinc-600">{shift.hours || '—'}</td>
                      {canFinance && <>
                        <td className="px-4 py-3 text-right text-zinc-700">{fmt(shift.employee_payout)}</td>
                        <td className="px-4 py-3 text-right font-medium text-zinc-900">{fmt(shift.client_total)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(margin)}</td>
                      </>}
                      <td className="px-4 py-3"><StatusBadge value={shift.status} options={SHIFT_STATUSES} /></td>
                      <td className="px-4 py-3"><StatusBadge value={shift.payment_status} options={PAYMENT_STATUSES} /></td>
                      <td className="px-4 py-3 text-amber-400 text-xs">{shift.rating ? '★'.repeat(shift.rating) : '—'}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {canEdit && (
                            <>
                              <button onClick={() => handleDuplicate(shift)} title="Дублировать" className="p-1 rounded hover:bg-indigo-50 text-zinc-400 hover:text-indigo-600"><Copy className="w-4 h-4" /></button>
                              <button onClick={() => handleEdit(shift)} className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"><Edit2 className="w-4 h-4" /></button>
                            </>
                          )}
                          <Can permission="shifts.delete">
                            <button onClick={() => { if (confirm('Удалить?')) del.mutate(shift.id) }} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </Can>
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

      <ShiftFormDialog open={formOpen} onClose={() => { setFormOpen(false); setDuplicateShift(null); }} shift={editShift} duplicateFrom={duplicateShift} />
      <ShiftDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} shift={viewShift} />
    </div>
  );
}
