import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, Search, Edit2, Trash2, Phone, History } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { POSITIONS, CITIZENSHIPS } from '@/lib/constants';
import { Can } from '@/lib/PermissionContext';

const STATUS_COLOR = { active:'bg-emerald-100 text-emerald-700', inactive:'bg-zinc-100 text-zinc-500', banned:'bg-red-100 text-red-600' };
const STATUS_LABEL = { active:'Активный', inactive:'Неактивный', banned:'Чёрный список' };
const EMPTY = {
  full_name:'', phone:'', telegram:'', position:'', citizenship:'',
  is_self_employed:false, self_employed_tin:'', docs_checked:false,
  status:'active', rating:'', reliability:'', notes:'',
};

function fmt(n) {
  return n ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n) : '—';
}

// Диалог истории смен сотрудника
function EmployeeHistoryDialog({ employee, onClose }) {
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => entities.Shift.list('-date'),
    enabled: !!employee,
  });

  if (!employee) return null;
  const empShifts = shifts.filter(s => s.employee_name === employee.full_name);
  const totalRevenue = empShifts.reduce((s, sh) => s + (sh.client_total || 0), 0);
  const totalPayout = empShifts.reduce((s, sh) => s + (sh.employee_payout || 0), 0);
  const avgRating = empShifts.filter(s => s.rating).length > 0
    ? (empShifts.reduce((s, sh) => s + (sh.rating || 0), 0) / empShifts.filter(s => s.rating).length).toFixed(1)
    : null;

  return (
    <Dialog open={!!employee} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>История смен — {employee.full_name}</DialogTitle>
        </DialogHeader>

        {/* Сводка */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-zinc-50 rounded-xl p-3 text-center">
            <p className="text-xs text-zinc-400 uppercase">Смен</p>
            <p className="text-xl font-bold text-zinc-900">{empShifts.length}</p>
          </div>
          <div className="bg-zinc-50 rounded-xl p-3 text-center">
            <p className="text-xs text-zinc-400 uppercase">Выплачено</p>
            <p className="text-xl font-bold text-red-500">{fmt(totalPayout)}</p>
          </div>
          <div className="bg-zinc-50 rounded-xl p-3 text-center">
            <p className="text-xs text-zinc-400 uppercase">Рейтинг</p>
            <p className="text-xl font-bold text-amber-500">{avgRating ? `★ ${avgRating}` : '—'}</p>
          </div>
        </div>

        {/* Список смен */}
        {empShifts.length === 0 ? (
          <div className="py-12 text-center text-zinc-400">Смен не найдено</div>
        ) : (
          <div className="space-y-2">
            {empShifts.map(s => (
              <div key={s.id} className="flex items-center gap-3 border border-zinc-100 rounded-xl px-4 py-3">
                <div className="shrink-0 text-xs text-zinc-400 w-16">{s.date ? format(new Date(s.date), 'dd.MM.yy') : '—'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{s.client_name || '—'}</p>
                  <p className="text-xs text-zinc-400 truncate">{s.object_name || ''} {POSITIONS.find(p => p.value === s.position)?.label || ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-zinc-900">{fmt(s.employee_payout)}</p>
                  {s.rating > 0 && <p className="text-xs text-amber-400">{'★'.repeat(s.rating)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmployeeForm({ employee, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(employee ? { ...EMPTY, ...employee } : EMPTY);
  const isEdit = !!employee?.id;
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = useMutation({
    mutationFn: d => isEdit ? entities.Employee.update(employee.id, d) : entities.Employee.create(d),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success(isEdit ? 'Обновлено' : 'Добавлено'); onClose(); },
    onError: e => toast.error(e.message),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5"><Label>ФИО *</Label><Input value={form.full_name} onChange={e => set('full_name', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Телефон</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+7..." /></div>
        <div className="space-y-1.5"><Label>Telegram</Label><Input value={form.telegram} onChange={e => set('telegram', e.target.value)} placeholder="@..." /></div>
        <div className="space-y-1.5"><Label>Должность</Label>
          <Select value={form.position} onValueChange={v => set('position', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Гражданство</Label>
          <Select value={form.citizenship} onValueChange={v => set('citizenship', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{CITIZENSHIPS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 py-1"><Switch checked={form.is_self_employed} onCheckedChange={v => set('is_self_employed', v)} /><Label>Самозанятый</Label></div>
        {form.is_self_employed && <div className="space-y-1.5"><Label>ИНН СЗ</Label><Input value={form.self_employed_tin} onChange={e => set('self_employed_tin', e.target.value)} /></div>}
        <div className="flex items-center gap-3 py-1"><Switch checked={form.docs_checked} onCheckedChange={v => set('docs_checked', v)} /><Label>Документы ✓</Label></div>
        <div className="space-y-1.5"><Label>Статус</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активный</SelectItem>
              <SelectItem value="inactive">Неактивный</SelectItem>
              <SelectItem value="banned">Чёрный список</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Рейтинг</Label>
          <Select value={String(form.rating || '')} onValueChange={v => set('rating', Number(v))}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{[5,4,3,2,1].map(r => <SelectItem key={r} value={String(r)}>{'★'.repeat(r)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5"><Label>Заметки</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
        <Button type="submit" disabled={save.isPending} className="flex-1">
          {save.isPending ? '...' : isEdit ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}

export default function Employees() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [szFilter, setSzFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [historyEmp, setHistoryEmp] = useState(null);

  const { data: employees = [], isLoading } = useQuery({ queryKey: ['employees'], queryFn: () => entities.Employee.list('-created_at') });
  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list() });

  const del = useMutation({
    mutationFn: id => entities.Employee.delete(id),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Удалено'); },
  });

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return (!q || e.full_name?.toLowerCase().includes(q) || e.phone?.includes(q)) &&
      (statusFilter === 'all' || e.status === statusFilter) &&
      (szFilter === 'all' || (szFilter === 'yes' ? e.is_self_employed : !e.is_self_employed));
  });

  function getEmpStats(name) {
    const es = shifts.filter(s => s.employee_name === name);
    const totalPayout = es.reduce((s, sh) => s + (sh.employee_payout || 0), 0);
    const rated = es.filter(s => s.rating);
    const avgRating = rated.length > 0 ? (rated.reduce((s, sh) => s + sh.rating, 0) / rated.length).toFixed(1) : null;
    return { count: es.length, totalPayout, avgRating };
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Сотрудники"
        subtitle={`${filtered.length} чел.`}
        action={
          <Can permission="employees.create">
            <Button size="sm" onClick={() => { setEditEmp(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Добавить</span>
            </Button>
          </Can>
        }
      />

      {/* Фильтры */}
      <div className="px-3 md:px-6 py-2 bg-white border-b border-zinc-100 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="inactive">Неактивные</SelectItem>
            <SelectItem value="banned">Чёрный список</SelectItem>
          </SelectContent>
        </Select>
        <Select value={szFilter} onValueChange={setSzFilter}>
          <SelectTrigger className="h-9 w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="yes">Самозанятые</SelectItem>
            <SelectItem value="no">Не самозанятые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Список */}
      <div className="p-3 md:p-6 space-y-2">
        {isLoading ? <div className="py-16 text-center text-zinc-400">Загрузка...</div>
        : filtered.length === 0 ? <div className="py-16 text-center text-zinc-400">Нет сотрудников</div>
        : filtered.map(emp => {
          const stats = getEmpStats(emp.full_name);
          return (
            <div key={emp.id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                {emp.full_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-zinc-900">{emp.full_name}</p>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[emp.status]}`}>{STATUS_LABEL[emp.status]}</span>
                  {emp.is_self_employed && <span className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">СЗ</span>}
                  {emp.docs_checked && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">✓</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {POSITIONS.find(p => p.value === emp.position)?.label || emp.position || '—'}
                  {emp.phone ? ` · ${emp.phone}` : ''}
                  {stats.count > 0 ? ` · ${stats.count} смен` : ''}
                </p>
                {emp.rating > 0 && <p className="text-amber-400 text-[10px]">{'★'.repeat(emp.rating)}{'☆'.repeat(5-emp.rating)}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                {/* История смен */}
                <button onClick={() => setHistoryEmp(emp)} title="История смен"
                  className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-indigo-600 hover:border-indigo-200">
                  <History className="w-3.5 h-3.5" />
                </button>
                <Can permission="employees.edit">
                  <button onClick={() => { setEditEmp(emp); setFormOpen(true); }}
                    className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-zinc-700">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </Can>
                <Can permission="employees.delete">
                  <button onClick={() => { if (confirm('Удалить?')) del.mutate(emp.id); }}
                    className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Can>
              </div>
            </div>
          );
        })}
      </div>

      {/* Форма */}
      <Dialog open={formOpen} onOpenChange={() => setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEmp ? 'Редактировать' : 'Новый сотрудник'}</DialogTitle></DialogHeader>
          <EmployeeForm employee={editEmp} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* История смен */}
      <EmployeeHistoryDialog employee={historyEmp} onClose={() => setHistoryEmp(null)} />
    </div>
  );
}
