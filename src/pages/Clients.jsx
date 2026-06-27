import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, Search, Edit2, Trash2, Bell, BellOff } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LEGAL_ENTITIES } from '@/lib/constants';
import { Can } from '@/lib/PermissionContext';

const PAY_LABELS = { prepay:'Предоплата', postpay:'Постоплата', weekly:'Раз/нед', biweekly:'2р/мес', monthly:'Раз/мес' };
const EMPTY = {
  name:'', inn:'', legal_entity:'', contact_name:'', phone:'', email:'',
  address:'', default_object:'', payment_terms:'', payment_delay:'',
  client_rate_default:'', status:'active', notes:'', next_contact_date:'',
};

function fmt(n) {
  return n ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n) : '—';
}

function ClientForm({ client, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(client ? { ...EMPTY, ...client } : EMPTY);
  const isEdit = !!client?.id;
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const save = useMutation({
    mutationFn: d => isEdit ? entities.Client.update(client.id, d) : entities.Client.create(d),
    onSuccess: () => { qc.invalidateQueries(['clients']); toast.success(isEdit ? 'Обновлено' : 'Добавлено'); onClose(); },
    onError: e => toast.error(e.message),
  });

  // Быстрые кнопки напоминания
  const setReminder = (days) => {
    const d = addDays(new Date(), days);
    set('next_contact_date', d.toISOString().slice(0, 10));
  };

  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5"><Label>Название *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>ИНН</Label><Input value={form.inn} onChange={e => set('inn', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Наше юр. лицо</Label>
          <Select value={form.legal_entity} onValueChange={v => set('legal_entity', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{LEGAL_ENTITIES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Контактное лицо</Label><Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Телефон</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+7..." /></div>
        <div className="col-span-2 space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Адрес</Label><Input value={form.address} onChange={e => set('address', e.target.value)} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Объект по умолчанию</Label><Input value={form.default_object} onChange={e => set('default_object', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Условия оплаты</Label>
          <Select value={form.payment_terms} onValueChange={v => set('payment_terms', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prepay">Предоплата</SelectItem>
              <SelectItem value="postpay">Постоплата</SelectItem>
              <SelectItem value="weekly">Раз в неделю</SelectItem>
              <SelectItem value="biweekly">2 раза в месяц</SelectItem>
              <SelectItem value="monthly">Раз в месяц</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Ставка по умолч. (₽/ч)</Label><Input type="number" value={form.client_rate_default} onChange={e => set('client_rate_default', e.target.value)} /></div>

        {/* Напоминание перезвонить */}
        <div className="col-span-2 space-y-1.5">
          <Label>Напомнить перезвонить</Label>
          <div className="flex gap-2 mb-1.5">
            {[3, 7, 14, 30].map(d => (
              <button key={d} type="button" onClick={() => setReminder(d)}
                className="text-xs px-2 py-1 border border-zinc-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors">
                +{d}д
              </button>
            ))}
          </div>
          <Input type="date" value={form.next_contact_date} onChange={e => set('next_contact_date', e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5"><Label>Заметки / Условия</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>
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

export default function Clients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);

  const { data: clients = [], isLoading } = useQuery({ queryKey: ['clients'], queryFn: () => entities.Client.list('-created_at') });
  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list() });

  const del = useMutation({
    mutationFn: id => entities.Client.delete(id),
    onSuccess: () => { qc.invalidateQueries(['clients']); toast.success('Удалено'); },
  });

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.contact_name?.toLowerCase().includes(q);
  });

  // Просроченные напоминания
  const overdueReminders = clients.filter(c => c.next_contact_date && isBefore(new Date(c.next_contact_date), new Date()));
  const upcomingReminders = clients.filter(c => c.next_contact_date &&
    isAfter(new Date(c.next_contact_date), new Date()) &&
    isBefore(new Date(c.next_contact_date), addDays(new Date(), 3)));

  function getStats(name) {
    const cs = shifts.filter(s => s.client_name === name);
    return {
      count: cs.length,
      revenue: cs.reduce((s, sh) => s + (sh.client_total || 0), 0),
      unpaid: cs.filter(s => s.payment_status === 'not_invoiced' || s.payment_status === 'invoiced').length,
    };
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Заказчики"
        subtitle={`${filtered.length} компаний`}
        action={
          <Can permission="clients.create">
            <Button size="sm" onClick={() => { setEditClient(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Добавить</span>
            </Button>
          </Can>
        }
      />

      {/* Баннер напоминаний */}
      {(overdueReminders.length > 0 || upcomingReminders.length > 0) && (
        <div className={`mx-4 md:mx-6 mt-4 rounded-xl border px-4 py-3 ${overdueReminders.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Bell className={`w-4 h-4 ${overdueReminders.length > 0 ? 'text-red-500' : 'text-amber-500'}`} />
            <span className={`text-sm font-semibold ${overdueReminders.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>
              {overdueReminders.length > 0 ? `Просрочено звонков: ${overdueReminders.length}` : `Напоминания на ближайшие 3 дня: ${upcomingReminders.length}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...overdueReminders, ...upcomingReminders].slice(0, 5).map(c => (
              <button key={c.id} onClick={() => { setEditClient(c); setFormOpen(true); }}
                className={`text-xs px-2.5 py-1 rounded-full ${overdueReminders.includes(c) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {c.name} — {c.next_contact_date ? format(new Date(c.next_contact_date), 'dd.MM') : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 md:px-6 py-2 bg-white border-b border-zinc-100 mt-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
      </div>

      <div className="p-3 md:p-6 space-y-2">
        {isLoading ? <div className="py-16 text-center text-zinc-400">Загрузка...</div>
        : filtered.length === 0 ? <div className="py-16 text-center text-zinc-400">Нет заказчиков</div>
        : filtered.map(client => {
          const stats = getStats(client.name);
          const hasReminder = client.next_contact_date;
          const reminderOverdue = hasReminder && isBefore(new Date(client.next_contact_date), new Date());
          return (
            <div key={client.id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-zinc-900 truncate">{client.name}</p>
                    {hasReminder && (
                      <Bell className={`w-3.5 h-3.5 shrink-0 ${reminderOverdue ? 'text-red-500' : 'text-amber-400'}`} />
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{client.contact_name || '—'}{client.phone ? ` · ${client.phone}` : ''}</p>
                  {hasReminder && (
                    <p className={`text-xs mt-0.5 ${reminderOverdue ? 'text-red-500 font-medium' : 'text-amber-600'}`}>
                      📅 Перезвонить: {format(new Date(client.next_contact_date), 'dd.MM.yyyy')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <Can permission="clients.edit">
                    <button onClick={() => { setEditClient(client); setFormOpen(true); }}
                      className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-zinc-700">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </Can>
                  <Can permission="clients.delete">
                    <button onClick={() => { if (confirm('Удалить?')) del.mutate(client.id); }}
                      className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Can>
                </div>
              </div>
              {client.default_object && <p className="text-xs text-zinc-400 mb-2">{client.default_object}</p>}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                <div className="flex gap-3 text-xs text-zinc-500">
                  <span>{stats.count} смен</span>
                  <Can permission="clients.view_rates"><span className="font-medium text-zinc-700">{fmt(stats.revenue)}</span></Can>
                  {stats.unpaid > 0 && <span className="text-red-500 font-semibold">{stats.unpaid} без оплаты</span>}
                </div>
                {client.payment_terms && (
                  <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{PAY_LABELS[client.payment_terms] || client.payment_terms}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={formOpen} onOpenChange={() => setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editClient ? 'Редактировать' : 'Новый заказчик'}</DialogTitle></DialogHeader>
          <ClientForm client={editClient} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
