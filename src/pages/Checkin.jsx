import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Phone, Check, X, RotateCcw, ChevronDown, ChevronRight, UserPlus, Clock, AlertTriangle, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { getCheckinStatus } from '@/lib/pipeline';
import { POSITIONS } from '@/lib/constants';

const posLabel = (v) => POSITIONS.find(p => p.value === v)?.label || v || '—';

function todayISO() { return new Date().toISOString().slice(0, 10); }

// Кнопка статуса
function StatusButton({ active, onClick, tone, icon: Icon, label }) {
  const tones = {
    green: active ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50',
    red:   active ? 'bg-red-500 text-white border-red-500'         : 'bg-white text-red-500 border-red-200 hover:bg-red-50',
  };
  return (
    <button onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border font-semibold text-sm transition-all active:scale-95 ${tones[tone]}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

export default function Checkin() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [openReserve, setOpenReserve] = useState(null); // shift id being replaced
  const [collapsed, setCollapsed] = useState({});

  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list('-date') });
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: () => entities.Order.list('-date') });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => entities.Employee.list('-created_at') });

  const setStatus = useMutation({
    mutationFn: ({ id, payload }) => entities.Shift.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
    onError: (e) => toast.error('Ошибка: ' + e.message),
  });

  const dayShifts = shifts.filter(s => s.date === date && !s.is_reserve);
  const dayOrders = orders.filter(o => o.date === date);

  // Группировка смен по заявке (или по объекту, если заявки нет)
  const groups = useMemo(() => {
    const map = new Map();
    for (const sh of dayShifts) {
      const key = sh.order_id || `obj:${sh.object_name || '—'}:${sh.client_name || '—'}`;
      if (!map.has(key)) {
        const ord = dayOrders.find(o => o.id === sh.order_id);
        map.set(key, {
          key,
          title: ord ? `${ord.client_name}${ord.object_name ? ' · ' + ord.object_name : ''}` : `${sh.client_name || '—'}${sh.object_name ? ' · ' + sh.object_name : ''}`,
          time: ord ? [ord.shift_start, ord.shift_end].filter(Boolean).join('–') : '',
          items: [],
        });
      }
      map.get(key).items.push(sh);
    }
    return [...map.values()];
  }, [dayShifts, dayOrders]);

  const total = dayShifts.length;
  const confirmed = dayShifts.filter(s => s.checkin_status === 'confirmed').length;
  const noAnswer = dayShifts.filter(s => s.checkin_status === 'no_answer').length;
  const pending = dayShifts.filter(s => !s.checkin_status || s.checkin_status === 'pending').length;
  const pct = total ? Math.round((confirmed / total) * 100) : 0;

  const reservePool = employees.filter(e =>
    (e.status === 'active') &&
    !dayShifts.some(s => s.employee_name === e.full_name)
  );

  const mark = (sh, status) => {
    setStatus.mutate({ id: sh.id, payload: { checkin_status: status, checkin_at: new Date().toISOString() } });
  };

  const replaceWith = (sh, emp) => {
    // помечаем старую смену заменённой, создаём резервную смену на того же заказчика
    setStatus.mutate({ id: sh.id, payload: { checkin_status: 'replaced', status: 'no_show' } });
    entities.Shift.create({
      date: sh.date, order_id: sh.order_id, client_name: sh.client_name, object_name: sh.object_name,
      employee_name: emp.full_name, employee_phone: emp.phone, position: sh.position,
      hours: sh.hours, employee_rate: sh.employee_rate, client_rate: sh.client_rate,
      employee_payout: sh.employee_payout, client_total: sh.client_total,
      legal_entity: sh.legal_entity, is_self_employed: emp.is_self_employed,
      status: 'confirmed', checkin_status: 'confirmed', checkin_at: new Date().toISOString(),
      is_reserve: true, work_type: sh.work_type,
    }).then(() => {
      // +1 к счётчику резерва сотрудника
      entities.Employee.update(emp.id, { reserve_saves: (emp.reserve_saves || 0) + 1 }).catch(() => {});
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`${emp.full_name} поднят из резерва`);
    }).catch(e => toast.error('Ошибка: ' + e.message));
    setOpenReserve(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 md:pb-6">
      <PageHeader title="Утренний прозвон" subtitle="Чекин выходов на смену" />

      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        {/* Дата + сводка */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-zinc-400" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="text-sm font-medium border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <span className="text-xs text-zinc-400 hidden sm:inline">
                {format(new Date(date), 'EEEE', { locale: ru })}
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-700">
              {confirmed}/{total} <span className="text-zinc-400 font-normal">подтверждено</span>
            </div>
          </div>
          {/* прогресс */}
          <div className="h-2 rounded-full bg-zinc-100 overflow-hidden flex">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${total ? (confirmed/total*100) : 0}%` }} />
            <div className="bg-red-400 h-full transition-all" style={{ width: `${total ? (noAnswer/total*100) : 0}%` }} />
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-emerald-600 font-medium">✓ {confirmed}</span>
            <span className="text-red-500 font-medium">✗ {noAnswer}</span>
            <span className="text-zinc-400">⏳ {pending}</span>
            <span className="ml-auto font-bold text-zinc-700">{pct}%</span>
          </div>
          {noAnswer > 0 && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {noAnswer} не на связи — подними резерв по кнопке ↻ в карточке
            </div>
          )}
        </div>

        {/* Группы по заявкам */}
        {groups.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">
            <Phone className="w-8 h-8 mx-auto mb-2 opacity-40" />
            На эту дату смен нет
          </div>
        )}

        {groups.map(group => {
          const gConfirmed = group.items.filter(s => s.checkin_status === 'confirmed').length;
          const isCollapsed = collapsed[group.key];
          return (
            <div key={group.key} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <button onClick={() => setCollapsed(c => ({ ...c, [group.key]: !c[group.key] }))}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50">
                <div className="flex items-center gap-2 min-w-0">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
                  <span className="font-semibold text-sm text-zinc-900 truncate">{group.title}</span>
                  {group.time && <span className="text-xs text-zinc-400 flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{group.time}</span>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  gConfirmed === group.items.length ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {gConfirmed}/{group.items.length}
                </span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-zinc-50">
                  {group.items.map(sh => {
                    const st = getCheckinStatus(sh.checkin_status);
                    const isNoAnswer = sh.checkin_status === 'no_answer';
                    return (
                      <div key={sh.id} className={`px-4 py-3 ${isNoAnswer ? 'bg-red-50/50' : ''}`}>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-zinc-900 truncate">{sh.employee_name || '—'}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.color}`}>{st.icon} {st.label}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                              <span>{posLabel(sh.position)}</span>
                              {sh.employee_phone && (
                                <a href={`tel:${sh.employee_phone}`} className="text-amber-600 hover:underline flex items-center gap-0.5">
                                  <Phone className="w-3 h-3" />{sh.employee_phone}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <StatusButton active={sh.checkin_status === 'confirmed'} tone="green" icon={Check} label="Вышел"
                              onClick={() => mark(sh, 'confirmed')} />
                            <StatusButton active={isNoAnswer} tone="red" icon={X} label="Нет"
                              onClick={() => mark(sh, 'no_answer')} />
                            {isNoAnswer && (
                              <button onClick={() => setOpenReserve(openReserve === sh.id ? null : sh.id)}
                                className="flex items-center gap-1 px-3 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 active:scale-95 transition-all">
                                <RotateCcw className="w-4 h-4" /> Резерв
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Резервный пул */}
                        {openReserve === sh.id && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-2 space-y-1 max-h-56 overflow-y-auto">
                            <p className="text-xs text-amber-700 font-medium px-1 pb-1 flex items-center gap-1">
                              <UserPlus className="w-3 h-3" /> Кого поднять? ({reservePool.length} доступно)
                            </p>
                            {reservePool.length === 0 && <p className="text-xs text-zinc-400 px-1 py-2">Свободных нет</p>}
                            {reservePool.slice(0, 30).map(emp => (
                              <button key={emp.id} onClick={() => replaceWith(sh, emp)}
                                className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white text-left transition-colors">
                                <div className="min-w-0">
                                  <span className="text-sm text-zinc-800 truncate">{emp.full_name}</span>
                                  <span className="text-xs text-zinc-400 ml-2">{posLabel(emp.position)}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {emp.reserve_saves > 0 && <span className="text-[10px] text-emerald-600">🛟 {emp.reserve_saves}</span>}
                                  {emp.rating && <span className="text-[10px] text-amber-600">★ {emp.rating}</span>}
                                  <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
