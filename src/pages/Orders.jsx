import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/entities';
import { Plus, X, Users, Clock, ChevronRight, LayoutGrid, List as ListIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ORDER_PIPELINE, getOrderStage } from '@/lib/pipeline';
import { POSITIONS as POSITIONS_DEFAULT } from '@/lib/constants';
import { useSettings } from '@/lib/SettingsContext';

const posLabel = (v) => POSITIONS_DEFAULT.find(p => p.value === v)?.label || v;

function emptyOrder() {
  return {
    date: new Date().toISOString().slice(0, 10),
    client_name: '', object_name: '', shift_start: '', shift_end: '',
    staff_needed: 1, stage: 'new', source: 'manual',
    positions_needed: [{ position: 'waiter', count: 1 }],
    notes: '',
  };
}

function OrderForm({ initial, clients, onSave, onClose }) {
  const settings = useSettings();
  const POSITIONS = settings.config.dict.positions;
  const reservePct = (settings.config.company.reserve_percent ?? 30) / 100;
  const [f, setF] = useState(initial);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const setPos = (i, k, v) => setF(p => {
    const arr = [...(p.positions_needed || [])]; arr[i] = { ...arr[i], [k]: v }; return { ...p, positions_needed: arr };
  });
  const addPos = () => setF(p => ({ ...p, positions_needed: [...(p.positions_needed || []), { position: 'waiter', count: 1 }] }));
  const rmPos = (i) => setF(p => ({ ...p, positions_needed: p.positions_needed.filter((_, x) => x !== i) }));

  const totalNeeded = (f.positions_needed || []).reduce((s, p) => s + (Number(p.count) || 0), 0);

  const submit = () => {
    if (!f.client_name) return toast.error('Укажите заказчика');
    const reserve = Math.ceil(totalNeeded * reservePct);
    onSave({ ...f, staff_needed: totalNeeded, reserve_needed: reserve });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">{f.id ? 'Заявка' : 'Новая заявка'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 font-medium">Дата выхода</label>
              <Input type="date" value={f.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium">Этап</label>
              <Select value={f.stage} onValueChange={v => set('stage', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORDER_PIPELINE.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium">Заказчик</label>
            {clients.length ? (
              <Select value={f.client_name} onValueChange={v => set('client_name', v)}>
                <SelectTrigger><SelectValue placeholder="Выберите заказчика" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : <Input value={f.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Название" />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 font-medium">Объект</label>
              <Input value={f.object_name} onChange={e => set('object_name', e.target.value)} placeholder="Площадка" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 font-medium">Начало</label>
                <Input type="time" value={f.shift_start || ''} onChange={e => set('shift_start', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium">Конец</label>
                <Input type="time" value={f.shift_end || ''} onChange={e => set('shift_end', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Потребность по должностям */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-500 font-medium">Нужно людей</label>
              <button onClick={addPos} className="text-xs text-amber-600 hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3" /> должность</button>
            </div>
            <div className="space-y-2">
              {(f.positions_needed || []).map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Select value={p.position} onValueChange={v => setPos(i, 'position', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{POSITIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Input type="number" min="1" className="w-20" value={p.count} onChange={e => setPos(i, 'count', e.target.value)} />
                  {f.positions_needed.length > 1 && (
                    <button onClick={() => rmPos(i)} className="p-2 text-zinc-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              Итого: <span className="font-semibold text-zinc-700">{totalNeeded}</span> чел. + резерв 30% =
              <span className="font-semibold text-amber-600"> {Math.ceil(totalNeeded * reservePct)}</span>
            </p>
          </div>

          <div>
            <label className="text-xs text-zinc-500 font-medium">Заметки</label>
            <Input value={f.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Комментарий" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-zinc-100 px-5 py-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
          <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={submit}>Сохранить</Button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onClick, onDragStart, onDragEnd, isDragging }) {
  const fill = order.staff_needed ? Math.round((order.staff_assigned || 0) / order.staff_needed * 100) : 0;
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(order); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-xl border p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-amber-300 hover:shadow-sm transition-all select-none
        ${isDragging ? 'opacity-40 scale-95 border-amber-300 shadow-lg' : 'border-zinc-200'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-zinc-900 truncate">{order.client_name}</p>
        <span className="text-[10px] text-zinc-400 shrink-0">#{order.order_no || '—'}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span>{order.date ? format(new Date(order.date), 'dd.MM') : '—'}</span>
        {order.object_name && <span className="truncate">· {order.object_name}</span>}
        {(order.shift_start || order.shift_end) && (
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{[order.shift_start, order.shift_end].filter(Boolean).join('–')}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Users className="w-3 h-3" />
          <span className={`font-semibold ${fill >= 100 ? 'text-emerald-600' : 'text-zinc-700'}`}>
            {order.staff_assigned || 0}/{order.staff_needed || 0}
          </span>
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className={`h-full transition-all ${fill >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(fill, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const qc = useQueryClient();
  const [view, setView] = useState('board');
  const [editing, setEditing] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [overStage, setOverStage] = useState(null);

  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: () => entities.Order.list('-date') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => entities.Client.list('name') });

  const save = useMutation({
    mutationFn: (o) => o.id ? entities.Order.update(o.id, o) : entities.Order.create(o),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setEditing(null); toast.success('Сохранено'); },
    onError: (e) => toast.error('Ошибка: ' + e.message),
  });
  const del = useMutation({
    mutationFn: (id) => entities.Order.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setEditing(null); toast.success('Удалено'); },
  });
  const moveStage = useMutation({
    mutationFn: ({ id, stage }) => entities.Order.update(id, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 md:pb-6">
      <PageHeader title="Заявки" subtitle="Операционная воронка заказов"
        action={
          <div className="flex items-center gap-2">
            <div className="hidden md:flex rounded-lg border border-zinc-200 bg-white p-0.5">
              <button onClick={() => setView('board')} className={`p-1.5 rounded ${view === 'board' ? 'bg-zinc-100' : ''}`}><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-zinc-100' : ''}`}><ListIcon className="w-4 h-4" /></button>
            </div>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={() => setEditing(emptyOrder())}>
              <Plus className="w-4 h-4 mr-1" /> Заявка
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6">
        {view === 'board' ? (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
            {ORDER_PIPELINE.map(stage => {
              const col = orders.filter(o => o.stage === stage.value);
              const isOver = overStage === stage.value;
              const draggingOrder = draggingId ? orders.find(o => o.id === draggingId) : null;
              const canDrop = draggingOrder && draggingOrder.stage !== stage.value;
              return (
                <div
                  key={stage.value}
                  className="w-[260px] shrink-0 snap-start"
                  onDragOver={(e) => { if (canDrop) { e.preventDefault(); setOverStage(stage.value); } }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverStage(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingId && canDrop) {
                      moveStage.mutate({ id: draggingId, stage: stage.value });
                      toast.success(`Заявка → ${stage.label}`);
                    }
                    setOverStage(null);
                    setDraggingId(null);
                  }}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                      <span className="text-sm font-semibold text-zinc-700">{stage.icon} {stage.label}</span>
                    </div>
                    <span className="text-xs text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">{col.length}</span>
                  </div>
                  <div className={`space-y-2 min-h-[60px] rounded-xl p-1 transition-colors
                    ${isOver && canDrop ? 'bg-amber-50 ring-2 ring-amber-300 ring-dashed' : ''}`}>
                    {col.map(o => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        onClick={() => setEditing(o)}
                        onDragStart={() => setDraggingId(o.id)}
                        onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
                        isDragging={draggingId === o.id}
                      />
                    ))}
                    {isOver && canDrop && (
                      <div className="border-2 border-dashed border-amber-300 rounded-xl h-14 flex items-center justify-center text-xs text-amber-500 font-medium bg-amber-50/50">
                        Перетащить сюда
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-50">
            {orders.map(o => {
              const st = getOrderStage(o.stage);
              return (
                <div key={o.id} onClick={() => setEditing(o)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 cursor-pointer">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${st.color}`}>{st.icon} {st.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-zinc-900 truncate">{o.client_name}</p>
                    <p className="text-xs text-zinc-400">{o.date ? format(new Date(o.date), 'dd.MM.yy') : ''} {o.object_name ? `· ${o.object_name}` : ''}</p>
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0">{o.staff_assigned || 0}/{o.staff_needed || 0}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                </div>
              );
            })}
            {orders.length === 0 && <div className="px-4 py-12 text-center text-sm text-zinc-400">Заявок пока нет</div>}
          </div>
        )}
      </div>

      {editing && (
        <OrderForm initial={editing} clients={clients}
          onSave={(o) => save.mutate(o)}
          onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
