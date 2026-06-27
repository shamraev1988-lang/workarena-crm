import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, Search, Edit2, Trash2, Phone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LEGAL_ENTITIES } from '@/lib/constants';

const EMPTY = {
  name: '', inn: '', legal_entity: '', contact_name: '', phone: '', email: '',
  address: '', default_object: '', payment_terms: '', payment_delay: '',
  client_rate_default: '', notes: '', status: 'active',
};

const PAYMENT_LABELS = {
  prepay: 'Предоплата', postpay: 'Постоплата',
  weekly: 'Раз в неделю', biweekly: '2 раза в месяц', monthly: 'Раз в месяц',
};

function fmt(n) {
  if (!n) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function ClientForm({ client, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(client ? { ...EMPTY, ...client } : EMPTY);
  const isEdit = !!client?.id;
  const save = useMutation({
    mutationFn: d => isEdit ? entities.Client.update(client.id, d) : entities.Client.create(d),
    onSuccess: () => { qc.invalidateQueries(['clients']); toast.success(isEdit ? 'Обновлено' : 'Добавлено'); onClose(); },
    onError: e => toast.error(e.message),
  });
  function set(f, v) { setForm(p => ({ ...p, [f]: v })); }

  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Название компании *</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>ИНН</Label>
          <Input value={form.inn} onChange={e => set('inn', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Наше юр. лицо</Label>
          <Select value={form.legal_entity} onValueChange={v => set('legal_entity', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{LEGAL_ENTITIES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Контактное лицо</Label>
          <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Телефон</Label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+7..." />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Адрес / объект по умолчанию</Label>
          <Input value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Название объекта</Label>
          <Input value={form.default_object} onChange={e => set('default_object', e.target.value)} placeholder="Ресторан Остров Мечты" />
        </div>
        <div className="space-y-1.5">
          <Label>Условия оплаты</Label>
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
        <div className="space-y-1.5">
          <Label>Отсрочка (дней)</Label>
          <Input type="number" value={form.payment_delay} onChange={e => set('payment_delay', e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Ставка по умолчанию (₽/ч)</Label>
          <Input type="number" value={form.client_rate_default} onChange={e => set('client_rate_default', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Статус</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Активный</SelectItem>
              <SelectItem value="inactive">Неактивный</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Заметки / Условия</Label>
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

/* ── Mobile card ── */
function ClientCard({ client, stats, onEdit, onDelete }) {
  const legal = LEGAL_ENTITIES.find(l => l.value === client.legal_entity);
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900 text-sm leading-tight">{client.name}</p>
              {legal && <p className="text-xs text-zinc-400">{legal.label}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(client)}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(client)}
            className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contact */}
      {(client.contact_name || client.phone) && (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          {client.contact_name && <span className="truncate">{client.contact_name}</span>}
          {client.phone && (
            <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-zinc-400 shrink-0">
              <Phone className="w-3 h-3" />
              <span className="text-xs">{client.phone}</span>
            </a>
          )}
        </div>
      )}

      {/* Object */}
      {client.default_object && (
        <p className="text-xs text-zinc-500 truncate">{client.default_object}</p>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 bg-zinc-50 rounded-lg p-2.5">
        <div className="text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Смен</p>
          <p className="text-sm font-bold text-zinc-900 mt-0.5">{stats.count}</p>
        </div>
        <div className="text-center border-x border-zinc-200">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Выручка</p>
          <p className="text-xs font-bold text-zinc-900 mt-0.5">{fmt(stats.revenue)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Без оплаты</p>
          <p className={`text-sm font-bold mt-0.5 ${stats.unpaid > 0 ? 'text-red-500' : 'text-zinc-400'}`}>
            {stats.unpaid || '—'}
          </p>
        </div>
      </div>

      {/* Payment terms */}
      {client.payment_terms && (
        <p className="text-xs text-zinc-500">
          Оплата: <span className="font-medium text-zinc-700">{PAYMENT_LABELS[client.payment_terms] || client.payment_terms}</span>
          {client.payment_delay ? ` · отсрочка ${client.payment_delay} дн.` : ''}
        </p>
      )}
    </div>
  );
}

export default function Clients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => entities.Client.list('-created_at'),
  });
  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list() });

  const del = useMutation({
    mutationFn: id => entities.Client.delete(id),
    onSuccess: () => { qc.invalidateQueries(['clients']); toast.success('Удалено'); },
  });

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.contact_name?.toLowerCase().includes(q);
  });

  function getClientStats(clientName) {
    const cs = shifts.filter(s => s.client_name === clientName);
    const revenue = cs.reduce((s, sh) => s + (sh.client_total || 0), 0);
    const unpaid  = cs.filter(s => s.payment_status === 'not_invoiced' || s.payment_status === 'invoiced').length;
    return { count: cs.length, revenue, unpaid };
  }

  function handleEdit(client)   { setEditClient(client); setFormOpen(true); }
  function handleDelete(client) { if (confirm('Удалить?')) del.mutate(client.id); }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Заказчики"
        subtitle={`${filtered.length} компаний`}
        action={
          <Button onClick={() => { setEditClient(null); setFormOpen(true); }} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Добавить
          </Button>
        }
      />

      <div className="px-4 md:px-6 py-3 bg-white border-b border-zinc-200">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input placeholder="Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 text-sm" />
        </div>
      </div>

      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="py-20 text-center text-zinc-400 text-sm">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-400 text-sm">Заказчиков нет</div>
        ) : (
          <>
            {/* ── Mobile: карточки ── */}
            <div className="md:hidden space-y-3">
              {filtered.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  stats={getClientStats(client.name)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* ── Desktop: таблица ── */}
            <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    {['Компания','Контакт','Объект','Условия оплаты','Смен','Выручка','Без оплаты',''].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap ${i >= 4 && i <= 6 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filtered.map(client => {
                    const stats = getClientStats(client.name);
                    const legal = LEGAL_ENTITIES.find(l => l.value === client.legal_entity);
                    return (
                      <tr key={client.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-900">{client.name}</div>
                          {legal && <div className="text-xs text-zinc-400">{legal.label}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-700">{client.contact_name || '—'}</div>
                          {client.phone && <div className="text-xs text-zinc-400">{client.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 max-w-[140px] truncate">{client.default_object || '—'}</td>
                        <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                          {PAYMENT_LABELS[client.payment_terms] || client.payment_terms || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-700">{stats.count}</td>
                        <td className="px-4 py-3 text-right font-medium text-zinc-900 tabular-nums">{fmt(stats.revenue)}</td>
                        <td className="px-4 py-3 text-right">
                          {stats.unpaid > 0
                            ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{stats.unpaid}</span>
                            : <span className="text-zinc-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEdit(client)} className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(client)} className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
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
          </>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={() => setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editClient ? 'Редактировать заказчика' : 'Новый заказчик'}</DialogTitle>
          </DialogHeader>
          <ClientForm client={editClient} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
