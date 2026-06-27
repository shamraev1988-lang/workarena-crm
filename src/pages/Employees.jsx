import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, Search, Edit2, Trash2, Phone, Star } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { POSITIONS, CITIZENSHIPS } from '@/lib/constants';

const EMPTY = {
  full_name: '', phone: '', phone2: '', position: '', citizenship: '',
  is_self_employed: false, self_employed_tin: '', status: 'active',
  rating: '', reliability: '', notes: '', telegram: '', docs_checked: false,
};

function EmployeeForm({ employee, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(employee ? { ...EMPTY, ...employee } : EMPTY);
  const isEdit = !!employee?.id;

  const save = useMutation({
    mutationFn: d => isEdit ? entities.Employee.update(employee.id, d) : entities.Employee.create(d),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success(isEdit ? 'Обновлено' : 'Добавлено'); onClose(); },
    onError: e => toast.error(e.message),
  });

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); }

  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>ФИО *</Label>
          <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Телефон</Label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+7..." />
        </div>
        <div className="space-y-1.5">
          <Label>Telegram</Label>
          <Input value={form.telegram} onChange={e => set('telegram', e.target.value)} placeholder="@username" />
        </div>
        <div className="space-y-1.5">
          <Label>Основная должность</Label>
          <Select value={form.position} onValueChange={v => set('position', v)}>
            <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
            <SelectContent>{POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Гражданство</Label>
          <Select value={form.citizenship} onValueChange={v => set('citizenship', v)}>
            <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
            <SelectContent>{CITIZENSHIPS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 py-2">
          <Switch checked={form.is_self_employed} onCheckedChange={v => set('is_self_employed', v)} />
          <Label>Самозанятый</Label>
        </div>
        {form.is_self_employed && (
          <div className="space-y-1.5">
            <Label>ИНН самозанятого</Label>
            <Input value={form.self_employed_tin} onChange={e => set('self_employed_tin', e.target.value)} placeholder="ИНН" />
          </div>
        )}
        <div className="flex items-center gap-3 py-2">
          <Switch checked={form.docs_checked} onCheckedChange={v => set('docs_checked', v)} />
          <Label>Документы проверены</Label>
        </div>
        <div className="space-y-1.5">
          <Label>Статус</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активный</SelectItem>
              <SelectItem value="inactive">Неактивный</SelectItem>
              <SelectItem value="banned">Чёрный список</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Рейтинг (1–5)</Label>
          <Select value={String(form.rating)} onValueChange={v => set('rating', Number(v))}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {[5,4,3,2,1].map(r => <SelectItem key={r} value={String(r)}>{'★'.repeat(r)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Надёжность</Label>
          <Select value={form.reliability} onValueChange={v => set('reliability', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Высокая</SelectItem>
              <SelectItem value="medium">Средняя</SelectItem>
              <SelectItem value="low">Низкая</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Заметки</Label>
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
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

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-zinc-100 text-zinc-600',
  banned: 'bg-red-100 text-red-700',
};
const STATUS_LABELS = { active: 'Активный', inactive: 'Неактивный', banned: 'Чёрный список' };
const RELIABILITY_COLORS = { high: 'text-emerald-600', medium: 'text-amber-600', low: 'text-red-500' };
const RELIABILITY_LABELS = { high: 'Высокая', medium: 'Средняя', low: 'Низкая' };

export default function Employees() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [szFilter, setSzFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editEmp, setEditEmp] = useState(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => entities.Employee.list('-created_at'),
  });

  const del = useMutation({
    mutationFn: id => entities.Employee.delete(id),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Удалено'); },
  });

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const match = !q || e.full_name?.toLowerCase().includes(q) || e.phone?.includes(q);
    const st = statusFilter === 'all' || e.status === statusFilter;
    const sz = szFilter === 'all' || (szFilter === 'yes' ? e.is_self_employed : !e.is_self_employed);
    return match && st && sz;
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Сотрудники"
        subtitle={`${filtered.length} человек`}
        action={
          <Button onClick={() => { setEditEmp(null); setFormOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Добавить
          </Button>
        }
      />

      <div className="px-4 md:px-6 py-3 bg-white border-b border-zinc-200 flex gap-2 md:gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input placeholder="Поиск по ФИО, телефону..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-36 md:w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="inactive">Неактивные</SelectItem>
            <SelectItem value="banned">Чёрный список</SelectItem>
          </SelectContent>
        </Select>
        <Select value={szFilter} onValueChange={setSzFilter}>
          <SelectTrigger className="h-10 w-36 md:w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="yes">Самозанятые</SelectItem>
            <SelectItem value="no">Не самозанятые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-zinc-400">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-zinc-400">Сотрудников не найдено</div>
          ) : filtered.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-amber-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                  {emp.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditEmp(emp); setFormOpen(true); }} className="p-1 rounded hover:bg-zinc-100 text-zinc-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Удалить?')) del.mutate(emp.id); }} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-zinc-900 text-sm">{emp.full_name}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {POSITIONS.find(p => p.value === emp.position)?.label || emp.position || '—'}
              </p>
              {emp.phone && (
                <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                  <Phone className="w-3 h-3" /> {emp.phone}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[emp.status] || STATUS_COLORS.inactive}`}>
                  {STATUS_LABELS[emp.status] || emp.status}
                </span>
                {emp.is_self_employed && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">СЗ</span>
                )}
                {emp.docs_checked && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">✓ Docs</span>
                )}
              </div>
              {emp.rating > 0 && (
                <div className="text-amber-400 text-xs mt-2">{'★'.repeat(emp.rating)}{'☆'.repeat(5 - emp.rating)}</div>
              )}
              {emp.reliability && (
                <p className={`text-xs mt-1 font-medium ${RELIABILITY_COLORS[emp.reliability]}`}>
                  Надёжность: {RELIABILITY_LABELS[emp.reliability]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={() => setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEmp ? 'Редактировать сотрудника' : 'Новый сотрудник'}</DialogTitle>
          </DialogHeader>
          <EmployeeForm employee={editEmp} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
