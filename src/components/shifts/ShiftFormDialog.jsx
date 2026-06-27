import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Copy } from 'lucide-react';
import { POSITIONS, WORK_TYPES, SHIFT_STATUSES, PAYMENT_STATUSES, PAYOUT_STATUSES, RATINGS, LEGAL_ENTITIES } from '@/lib/constants';

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  client_name: '', object_name: '', legal_entity: '',
  employee_name: '', employee_phone: '', position: '', work_type: '',
  is_self_employed: false,
  hours: '', employee_rate: '', employee_payout: '',
  adjustment: '', extra_amount: '',
  client_rate: '', client_extra: '', client_total: '',
  hr_salary: '',
  status: 'planned', payment_status: 'not_invoiced', payout_status: 'pending',
  rating: '', notes: '',
};

function fmtMoney(n) {
  if (!n) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

export default function ShiftFormDialog({ open, onClose, shift, duplicateFrom }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const isEdit = !!shift?.id;
  const isDuplicate = !!duplicateFrom;

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => entities.Client.list() });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => entities.Employee.list() });

  useEffect(() => {
    if (shift) {
      setForm({ ...EMPTY, ...shift });
    } else if (duplicateFrom) {
      // Дублирование: копируем всё кроме id и дат оплаты, обновляем дату на сегодня
      const { id, created_at, updated_at, ...rest } = duplicateFrom;
      setForm({
        ...EMPTY,
        ...rest,
        date: new Date().toISOString().slice(0, 10),
        status: 'planned',
        payment_status: 'not_invoiced',
        payout_status: 'pending',
      });
    } else {
      setForm(EMPTY);
    }
  }, [shift, duplicateFrom, open]);

  // Автоподстановка сотрудника (ставки из базы)
  function handleEmployeeSelect(name) {
    const emp = employees.find(e => e.full_name === name);
    setForm(f => recalc({
      ...f,
      employee_name: name,
      employee_phone: emp?.phone || f.employee_phone,
      is_self_employed: emp?.is_self_employed ?? f.is_self_employed,
    }));
  }

  // Автоподстановка заказчика (ставки из базы)
  function handleClientSelect(name) {
    const client = clients.find(c => c.name === name);
    setForm(f => recalc({
      ...f,
      client_name: name,
      legal_entity: client?.legal_entity || f.legal_entity,
      object_name: client?.default_object || f.object_name,
      client_rate: client?.client_rate_default || f.client_rate,
    }));
  }

  // Авторасчёт: ФОТ, итог заказчику, маржа, налог
  function recalc(updated) {
    const hours = parseFloat(updated.hours) || 0;
    const empRate = parseFloat(updated.employee_rate) || 0;
    const adjustment = parseFloat(updated.adjustment) || 0;
    const extra = parseFloat(updated.extra_amount) || 0;
    const clientRate = parseFloat(updated.client_rate) || 0;
    const clientExtra = parseFloat(updated.client_extra) || 0;

    const empPayout = hours * empRate + adjustment + extra;
    const clientTotal = hours * clientRate + clientExtra;

    return { ...updated, employee_payout: empPayout || '', client_total: clientTotal || '' };
  }

  function set(field, value) {
    setForm(f => recalc({ ...f, [field]: value }));
  }

  // Живой расчёт маржи и налога для превью
  const clientTotal = parseFloat(form.client_total) || 0;
  const empPayout = parseFloat(form.employee_payout) || 0;
  const hrSalary = parseFloat(form.hr_salary) || 0;
  const taxRate = LEGAL_ENTITIES.find(e => e.value === form.legal_entity)?.tax_rate || 0;
  const taxAmount = Math.round(clientTotal * taxRate);
  const margin = clientTotal - empPayout - hrSalary - taxAmount;
  const marginPct = clientTotal > 0 ? Math.round((margin / clientTotal) * 100) : 0;

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? entities.Shift.update(shift.id, data) : entities.Shift.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['shifts']);
      toast.success(isEdit ? 'Смена обновлена' : isDuplicate ? 'Смена продублирована' : 'Смена добавлена');
      onClose();
    },
    onError: (e) => toast.error('Ошибка: ' + e.message),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.date || !form.client_name) { toast.error('Заполните дату и заказчика'); return; }
    saveMutation.mutate(form);
  }

  const clientNames = [...new Set(clients.map(c => c.name).filter(Boolean))];
  const employeeNames = [...new Set(employees.map(e => e.full_name).filter(Boolean))];

  const titleLabel = isDuplicate ? '📋 Дублировать смену' : isEdit ? 'Редактировать смену' : 'Новая смена';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleLabel}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основное */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Основное</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Дата *</Label>
                <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Тип работ</Label>
                <Select value={form.work_type} onValueChange={v => set('work_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
                  <SelectContent>{WORK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Заказчик *</Label>
                <Select value={form.client_name} onValueChange={handleClientSelect}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{clientNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
                {!clientNames.includes(form.client_name) && (
                  <Input placeholder="Введите вручную" value={form.client_name} onChange={e => set('client_name', e.target.value)} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Объект / Адрес</Label>
                <Input value={form.object_name} onChange={e => set('object_name', e.target.value)} placeholder="Название объекта" />
              </div>
              <div className="space-y-1.5">
                <Label>Юр. лицо</Label>
                <Select value={form.legal_entity} onValueChange={v => set('legal_entity', v)}>
                  <SelectTrigger><SelectValue placeholder="Юр. лицо" /></SelectTrigger>
                  <SelectContent>{LEGAL_ENTITIES.map(e => <SelectItem key={e.value} value={e.value}>{e.label} ({(e.tax_rate*100).toFixed(0)}%)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Статус смены</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SHIFT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Сотрудник */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Сотрудник</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ФИО сотрудника</Label>
                <Select value={form.employee_name} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{employeeNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
                {!employeeNames.includes(form.employee_name) && (
                  <Input placeholder="Введите вручную" value={form.employee_name} onChange={e => set('employee_name', e.target.value)} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Телефон</Label>
                <Input value={form.employee_phone} onChange={e => set('employee_phone', e.target.value)} placeholder="+7..." />
              </div>
              <div className="space-y-1.5">
                <Label>Должность</Label>
                <Select value={form.position} onValueChange={v => set('position', v)}>
                  <SelectTrigger><SelectValue placeholder="Должность" /></SelectTrigger>
                  <SelectContent>{POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_self_employed} onCheckedChange={v => set('is_self_employed', v)} />
                <Label>Самозанятый (СЗ)</Label>
              </div>
            </div>
          </div>

          {/* Расчёт */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Расчёт смены</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Часов</Label>
                <Input type="number" value={form.hours} onChange={e => set('hours', e.target.value)} placeholder="8" />
              </div>
              <div className="space-y-1.5">
                <Label>Ставка сотруднику (₽/ч)</Label>
                <Input type="number" value={form.employee_rate} onChange={e => set('employee_rate', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Корректировка (±₽)</Label>
                <Input type="number" value={form.adjustment} onChange={e => set('adjustment', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Доп. сумма сотруднику</Label>
                <Input type="number" value={form.extra_amount} onChange={e => set('extra_amount', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Выплата сотруднику (итог)</Label>
                <Input type="number" value={form.employee_payout} onChange={e => set('employee_payout', e.target.value)} className="font-semibold" />
              </div>
              <div className="space-y-1.5">
                <Label>Ставка заказчику (₽/ч)</Label>
                <Input type="number" value={form.client_rate} onChange={e => set('client_rate', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Доп. сумма заказчику</Label>
                <Input type="number" value={form.client_extra} onChange={e => set('client_extra', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Итого с заказчика</Label>
                <Input type="number" value={form.client_total} onChange={e => set('client_total', e.target.value)} className="font-semibold text-emerald-700" />
              </div>
              <div className="space-y-1.5">
                <Label>ЗП HR</Label>
                <Input type="number" value={form.hr_salary} onChange={e => set('hr_salary', e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Автокалькулятор маржи */}
            {(clientTotal > 0 || empPayout > 0) && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-zinc-400 uppercase">Выручка</p>
                  <p className="text-sm font-bold text-zinc-900 mt-0.5">{fmtMoney(clientTotal)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-zinc-400 uppercase">ФОТ + HR</p>
                  <p className="text-sm font-bold text-red-600 mt-0.5">{fmtMoney(empPayout + hrSalary)}</p>
                </div>
                {taxAmount > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-zinc-400 uppercase">Налог {(taxRate*100).toFixed(0)}%</p>
                    <p className="text-sm font-bold text-amber-600 mt-0.5">{fmtMoney(taxAmount)}</p>
                  </div>
                )}
                <div className={`rounded-lg p-3 text-center col-span-${taxAmount > 0 ? 1 : 2} ${margin >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <p className="text-[10px] text-zinc-400 uppercase">Маржа</p>
                  <p className={`text-sm font-bold mt-0.5 ${margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {fmtMoney(margin)} <span className="text-xs font-normal">({marginPct}%)</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Оплаты и оценка */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Оплата и оценка</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Оплата от заказчика</Label>
                <Select value={form.payment_status} onValueChange={v => set('payment_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Выплата сотруднику</Label>
                <Select value={form.payout_status} onValueChange={v => set('payout_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYOUT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Оценка работы</Label>
                <Select value={String(form.rating)} onValueChange={v => set('rating', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Оценка" /></SelectTrigger>
                  <SelectContent>{RATINGS.map(r => <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Примечания</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Любые заметки..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : isDuplicate ? 'Создать копию' : 'Добавить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
