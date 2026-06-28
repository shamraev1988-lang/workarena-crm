import { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Send, Clock, Calendar, MapPin, CheckCircle2, MessageCircle } from 'lucide-react';
import { POSITIONS } from '@/lib/constants';

const posLabel = (v) => POSITIONS.find(p => p.value === v)?.label || v;

const WA  = import.meta.env.VITE_MANAGER_WHATSAPP || '';
const TG  = import.meta.env.VITE_MANAGER_TELEGRAM || '';

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function PublicOrder() {
  const { clientId } = useParams();
  const [sp] = useSearchParams();
  const clientName = sp.get('name') || '';

  const [date, setDate] = useState(todayISO());
  const [object, setObject] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [contact, setContact] = useState('');
  const [comment, setComment] = useState('');
  const [rows, setRows] = useState([{ position: 'waiter', count: 1 }]);
  const [sent, setSent] = useState(false);

  const setRow = (i, k, v) => setRows(r => r.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const addRow = () => setRows(r => [...r, { position: 'waiter', count: 1 }]);
  const rmRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));

  const total = rows.reduce((s, r) => s + (Number(r.count) || 0), 0);

  const message = useMemo(() => {
    const lines = [
      '🆕 НОВАЯ ЗАЯВКА на персонал',
      '',
      clientName ? `Заказчик: ${clientName}` : null,
      `Дата выхода: ${date ? new Date(date).toLocaleDateString('ru-RU') : '—'}`,
      object ? `Объект: ${object}` : null,
      (start || end) ? `Время: ${[start, end].filter(Boolean).join('–')}` : null,
      '',
      'Нужно людей:',
      ...rows.filter(r => r.count > 0).map(r => `• ${posLabel(r.position)} — ${r.count}`),
      `Итого: ${total} чел.`,
      comment ? `\nКомментарий: ${comment}` : null,
      contact ? `\nКонтакт для связи: ${contact}` : null,
      clientId ? `\n[id:${clientId}]` : null,
    ].filter(Boolean);
    return lines.join('\n');
  }, [clientName, date, object, start, end, rows, total, comment, contact, clientId]);

  const valid = total > 0 && date;

  const send = (channel) => {
    const text = encodeURIComponent(message);
    let url = '';
    if (channel === 'wa' && WA)  url = `https://wa.me/${WA}?text=${text}`;
    if (channel === 'tg' && TG)  url = `https://t.me/${TG}?text=${text}`;
    if (url) {
      window.open(url, '_blank');
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Заявка отправлена</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Менеджер свяжется с вами в ближайшее время для подтверждения деталей.
          </p>
          <button onClick={() => setSent(false)} className="text-sm text-amber-600 hover:underline font-medium">
            Создать ещё одну заявку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Шапка-бренд */}
      <div className="bg-zinc-900 text-white">
        <div className="max-w-lg mx-auto px-5 py-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Workarena</h1>
            <p className="text-xs text-zinc-400">Заявка на временный персонал</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {clientName && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            Заявка от имени: <span className="font-semibold">{clientName}</span>
          </div>
        )}

        {/* Дата / объект / время */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 font-medium flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Дата выхода</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> Объект / адрес</label>
            <input value={object} onChange={e => setObject(e.target.value)} placeholder="Например: ресторан на Тверской"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 font-medium flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Начало</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1 block">Конец</label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
        </div>

        {/* Должности */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-zinc-700">Кто нужен</label>
            <button onClick={addRow} className="text-xs text-amber-600 hover:underline flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> добавить
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select value={r.position} onChange={e => setRow(i, 'position', e.target.value)}
                  className="flex-1 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <input type="number" min="1" value={r.count} onChange={e => setRow(i, 'count', e.target.value)}
                  className="w-20 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400" />
                {rows.length > 1 && (
                  <button onClick={() => rmRow(i)} className="p-2 text-zinc-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-3">Итого: <span className="font-semibold text-zinc-700">{total}</span> чел.</p>
        </div>

        {/* Контакт + коммент */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1 block">Ваш телефон для связи</label>
            <input value={contact} onChange={e => setContact(e.target.value)} placeholder="+7 ..."
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1 block">Комментарий</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Особые требования, форма одежды и т.д."
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>

        {/* Превью */}
        <details className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <summary className="px-4 py-3 text-sm font-medium text-zinc-600 cursor-pointer select-none">Предпросмотр заявки</summary>
          <pre className="px-4 pb-4 text-xs text-zinc-500 whitespace-pre-wrap font-sans">{message}</pre>
        </details>

        {/* Кнопки отправки */}
        <div className="space-y-2 pt-1">
          {WA && (
            <button onClick={() => send('wa')} disabled={!valid}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 transition-colors">
              <Send className="w-4 h-4" /> Отправить в WhatsApp
            </button>
          )}
          {TG && (
            <button onClick={() => send('tg')} disabled={!valid}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 transition-colors">
              <MessageCircle className="w-4 h-4" /> Отправить в Telegram
            </button>
          )}
          {!WA && !TG && (
            <p className="text-center text-sm text-red-500">
              Канал отправки не настроен. Задайте VITE_MANAGER_WHATSAPP или VITE_MANAGER_TELEGRAM.
            </p>
          )}
          {!valid && (
            <p className="text-center text-xs text-zinc-400">Укажите дату и хотя бы одного сотрудника</p>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-300 pt-4 pb-8">Workarena · подбор персонала для HoReCa</p>
      </div>
    </div>
  );
}
