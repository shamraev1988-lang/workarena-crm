import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, Search, Edit2, Trash2, Building2, MapPin, Phone } from 'lucide-react';
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
          <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Адрес основного объекта" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Название объекта по умолчанию</Label>
          <Input value={form.default_object} onChange={e => set('default_object', e.target.value)} placeholder="Например: Ресторан Остров Мечты" />
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
    const unpaid = cs.filter(s => s.payment_status === 'not_invoiced' || s.payment_status === 'invoiced').length;
    return { count: cs.length, revenue, unpaid };
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Заказчики"
        subtitle={`${filtered.length} компаний`}
        action={
          <Button onClick={() => { setEditClient(null); setFormOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white">
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
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Компания</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Контакт</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Объект</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Условия оплаты</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Смен</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Выручка</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Без оплаты</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-400">Загрузка...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-400">Заказчиков нет</td></tr>
              ) : filtered.map(client => {
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
                    <td className="px-4 py-3 text-zinc-600">{client.default_object || '—'}</td>
                    <td className="px-4 py-3 text-zinc-600 text-sm">{client.payment_terms || '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-700">{stats.count}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {stats.revenue ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(stats.revenue) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {stats.unpaid > 0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{stats.unpaid}</span> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditClient(client); setFormOpen(true); }} className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('Удалить?')) del.mutate(client.id); }} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500">
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
