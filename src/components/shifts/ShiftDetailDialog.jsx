import { X } from 'lucide-react';
import { POSITIONS, SHIFT_STATUSES, PAYMENT_STATUSES, PAYOUT_STATUSES, LEGAL_ENTITIES, RATINGS } from '@/lib/constants';
import { format } from 'date-fns';

function fmt(n) {
  if (!n) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-zinc-100 last:border-0 gap-3">
      <span className="text-sm text-zinc-500 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${highlight || 'text-zinc-900'}`}>{value || '—'}</span>
    </div>
  );
}

export default function ShiftDetailDialog({ open, onClose, shift }) {
  if (!open || !shift) return null;

  const margin = (shift.client_total || 0) - (shift.employee_payout || 0);
  const status       = SHIFT_STATUSES.find(s => s.value === shift.status);
  const payStatus    = PAYMENT_STATUSES.find(s => s.value === shift.payment_status);
  const payoutStatus = PAYOUT_STATUSES.find(s => s.value === shift.payout_status);
  const position     = POSITIONS.find(p => p.value === shift.position);
  const legal        = LEGAL_ENTITIES.find(l => l.value === shift.legal_entity);
  const rating       = RATINGS.find(r => r.value === shift.rating);

  return (
    /* Fullscreen overlay */
    <div className="fixed inset-0 z-50 flex flex-col bg-white md:bg-black/50 md:items-center md:justify-center">
      {/* Modal container */}
      <div className="flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-2xl md:overflow-hidden bg-white">

        {/* ── Sticky header with close button ── */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-zinc-100 shrink-0 bg-white">
          <div className="min-w-0 pr-2">
            <h2 className="text-base font-bold text-zinc-900 leading-tight">
              Смена — {shift.client_name || '—'}
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {shift.date ? format(new Date(shift.date), 'dd.MM.yyyy') : '—'}
              {shift.object_name && ` · ${shift.object_name}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Статусы */}
          <div className="flex gap-2 flex-wrap">
            {status      && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>{status.label}</span>}
            {payStatus   && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${payStatus.color}`}>{payStatus.label}</span>}
            {payoutStatus && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${payoutStatus.color}`}>{payoutStatus.label}</span>}
            {shift.is_self_employed && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-violet-100 text-violet-700">Самозанятый</span>}
          </div>

          {/* Сотрудник */}
          <div className="bg-zinc-50 rounded-xl p-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Сотрудник</h4>
            <Row label="ФИО"       value={shift.employee_name} />
            <Row label="Телефон"   value={shift.employee_phone} />
            <Row label="Должность" value={position?.label || shift.position} />
            {rating && <Row label="Оценка" value={rating.label} />}
          </div>

          {/* Заказчик */}
          <div className="bg-zinc-50 rounded-xl p-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Заказчик</h4>
            <Row label="Компания" value={shift.client_name} />
            <Row label="Объект"   value={shift.object_name} />
            <Row label="Юр. лицо" value={legal?.label || shift.legal_entity} />
          </div>

          {/* Финансы */}
          <div className="bg-zinc-50 rounded-xl p-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Финансы</h4>
            <Row label="Часов"              value={shift.hours} />
            <Row label="Ставка сотруднику"  value={shift.employee_rate ? `${shift.employee_rate} ₽/ч` : null} />
            <Row label="Выплата сотруднику" value={fmt(shift.employee_payout)} />
            <Row label="Ставка заказчику"   value={shift.client_rate ? `${shift.client_rate} ₽/ч` : null} />
            <Row label="Итого с заказчика"  value={fmt(shift.client_total)} highlight="text-emerald-700 font-semibold" />
            <Row label="ЗП HR"              value={fmt(shift.hr_salary)} />
            <Row
              label="Маржа"
              value={fmt(margin)}
              highlight={margin >= 0 ? 'text-emerald-700 font-bold text-base' : 'text-red-500 font-bold text-base'}
            />
          </div>

          {shift.notes && (
            <div className="bg-amber-50 rounded-xl p-3">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Примечания</h4>
              <p className="text-sm text-zinc-700">{shift.notes}</p>
            </div>
          )}

          {/* Bottom padding so content clears the safe area */}
          <div className="h-4" />
        </div>

        {/* ── Bottom close button (mobile UX) ── */}
        <div className="shrink-0 px-4 py-3 border-t border-zinc-100 bg-white md:hidden">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold active:bg-zinc-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
