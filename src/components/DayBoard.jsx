import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Link } from 'react-router-dom';
import { Phone, AlertTriangle, CheckCircle2, Layers, Shield, Target } from 'lucide-react';
import { format, isToday, startOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

function Stat({ label, value, sub, tone = 'zinc', alert }) {
  const tones = {
    zinc:    'text-zinc-900',
    emerald: 'text-emerald-600',
    red:     'text-red-600',
    amber:   'text-amber-600',
  };
  return (
    <div className={`rounded-xl border p-3 md:p-4 ${alert ? 'border-red-200 bg-red-50/60' : 'border-zinc-200 bg-white'}`}>
      <p className="text-[10px] md:text-xs text-zinc-500 font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-xl md:text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DayBoard() {
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: () => entities.Order.list('-date') });
  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list('-date') });

  const todayOrders = orders.filter(o => o.date && isToday(new Date(o.date)));
  const todayShifts = shifts.filter(s => s.date && isToday(new Date(s.date)) && !s.is_reserve);

  const confirmed   = todayShifts.filter(s => s.checkin_status === 'confirmed').length;
  const noAnswer    = todayShifts.filter(s => s.checkin_status === 'no_answer').length;
  const totalToday  = todayShifts.length;
  const confirmPct  = totalToday ? Math.round((confirmed / totalToday) * 100) : 0;
  const reserveUsed = shifts.filter(s => s.date && isToday(new Date(s.date)) && s.is_reserve).length;

  // SLA месяца: доля заявок, закрытых вовремя (stage done/closed без флага проблем)
  const monthStart = startOfMonth(new Date());
  const monthOrders = orders.filter(o => o.date && new Date(o.date) >= monthStart);
  const slaOk = monthOrders.filter(o => ['done', 'closed', 'on_shift'].includes(o.stage)).length;
  const slaPct = monthOrders.length ? Math.round((slaOk / monthOrders.length) * 100) : 100;

  const monthShifts = shifts.filter(s => s.date && new Date(s.date) >= monthStart && !s.is_reserve);
  const noShows = monthShifts.filter(s => s.status === 'no_show' || s.checkin_status === 'no_answer').length;
  const noShowPct = monthShifts.length ? ((noShows / monthShifts.length) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-4 md:px-5 py-3 md:py-4 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-zinc-900 text-sm md:text-base">
            Сегодня: {format(new Date(), 'd MMMM', { locale: ru })}
          </h2>
        </div>
        <Link to="/checkin" className="text-xs text-amber-600 hover:underline font-medium flex items-center gap-1">
          <Phone className="w-3 h-3" /> Прозвон →
        </Link>
      </div>

      <div className="p-4 md:p-5 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <Stat label="Заявок" value={todayOrders.length} sub={`Смен: ${totalToday}`} />
          <Stat label="Подтверждено" value={`${confirmed}/${totalToday}`} sub={`${confirmPct}%`}
                tone={confirmPct >= 90 ? 'emerald' : confirmPct >= 70 ? 'amber' : 'red'} />
          <Stat label="Не дозвонились" value={noAnswer} tone={noAnswer ? 'red' : 'zinc'} alert={noAnswer > 0}
                sub={noAnswer ? 'требует резерва' : 'все на связи'} />
          <Stat label="Резерв активирован" value={reserveUsed} tone={reserveUsed ? 'amber' : 'zinc'} />
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-3 pt-1">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 md:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-zinc-500 font-semibold uppercase">SLA месяца</p>
              <p className="text-lg md:text-xl font-bold text-zinc-900">{slaPct}%</p>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 md:p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              parseFloat(noShowPct) > 3 ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-zinc-500 font-semibold uppercase">Невыходов</p>
              <p className="text-lg md:text-xl font-bold text-zinc-900">
                {noShows} <span className="text-sm font-medium text-zinc-400">из {monthShifts.length} ({noShowPct}%)</span>
              </p>
            </div>
          </div>
        </div>

        {noAnswer > 0 && (
          <Link to="/checkin" className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 hover:bg-red-100 transition-colors">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{noAnswer} чел. не на связи</span> — поднять резерв
          </Link>
        )}
      </div>
    </div>
  );
}
