import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { POSITIONS, SHIFT_STATUSES, PAYMENT_STATUSES, PAYOUT_STATUSES, LEGAL_ENTITIES, RATINGS } from '@/lib/constants';
import { format } from 'date-fns';

function fmt(n) {
  if (!n) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between py-2 border-b border-zinc-50 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className={`text-sm font-medium ${highlight || 'text-zinc-900'}`}>{value || '—'}</span>
    </div>
  );
}

export default function ShiftDetailDialog({ open, onClose, shift }) {
  if (!shift) return null;
  const margin = (shift.client_total || 0) - (shift.employee_payout || 0);
  const status = SHIFT_STATUSES.find(s => s.value === shift.status);
  const payStatus = PAYMENT_STATUSES.find(s => s.value === shift.payment_status);
  const payoutStatus = PAYOUT_STATUSES.find(s => s.value === shift.payout_status);
  const position = POSITIONS.find(p => p.value === shift.position);
  const legal = LEGAL_ENTITIES.find(l => l.value === shift.legal_entity);
  const rating = RATINGS.find(r => r.value === shift.rating);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Смена — {shift.client_name || '—'}</DialogTitle>
          <p className="text-sm text-zinc-500">
            {shift.date ? format(new Date(shift.date), 'dd.MM.yyyy') : '—'}
            {shift.object_name && ` · ${shift.object_name}`}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Статусы */}
          <div className="flex gap-2 flex-wrap">
            {status && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>{status.label}</span>}
            {payStatus && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${payStatus.color}`}>{payStatus.label}</span>}
            {payoutStatus && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${payoutStatus.color}`}>{payoutStatus.label}</span>}
            {shift.is_self_employed && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-violet-100 text-violet-700">Самозанятый</span>}
          </div>

          {/* Сотрудник */}
          <div className="bg-zinc-50 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Сотрудник</h4>
            <Row label="ФИО" value={shift.employee_name} />
            <Row label="Телефон" value={shift.employee_phone} />
            <Row label="Должность" value={position?.label || shift.position} />
            {rating && <Row label="Оценка" value={rating.label} />}
          </div>

          {/* Заказчик */}
          <div className="bg-zinc-50 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Заказчик</h4>
            <Row label="Компания" value={shift.client_name} />
            <Row label="Объект" value={shift.object_name} />
            <Row label="Юр. лицо" value={legal?.label || shift.legal_entity} />
          </div>

          {/* Финансы */}
          <div className="bg-zinc-50 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Финансы</h4>
            <Row label="Часов" value={shift.hours} />
            <Row label="Ставка сотруднику" value={shift.employee_rate ? `${shift.employee_rate} ₽/ч` : null} />
            <Row label="Выплата сотруднику" value={fmt(shift.employee_payout)} />
            <Row label="Ставка заказчику" value={shift.client_rate ? `${shift.client_rate} ₽/ч` : null} />
            <Row label="Итого с заказчика" value={fmt(shift.client_total)} highlight="text-emerald-700" />
            <Row label="ЗП HR" value={fmt(shift.hr_salary)} />
            <Row label="Маржа" value={fmt(margin)} highlight={margin >= 0 ? 'text-emerald-700 font-bold' : 'text-red-500 font-bold'} />
          </div>

          {shift.notes && (
            <div className="bg-amber-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-1">Примечания</h4>
              <p className="text-sm text-zinc-700">{shift.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
