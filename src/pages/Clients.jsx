import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { entities } from '@/api/entities'
import { supabase } from '@/api/supabase'
import { Plus, Search, ChevronRight, Phone, Calendar, AlertTriangle, Star, Building2, Edit2, Trash2, X, ChevronDown, Link2 } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { toast } from 'sonner'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CLIENT_PIPELINE, getClientStage } from '@/lib/pipeline'
import { LEGAL_ENTITIES } from '@/lib/constants'

const PAY_LABELS = { prepay:'Предоплата', postpay:'Постоплата', weekly:'Раз/нед', biweekly:'2р/мес', monthly:'Раз/мес' }
const SOURCE_OPTIONS = ['Холодный звонок','Входящая заявка','Рекомендация','Тендер','Реклама','Другое']

function StageBadge({ value, size = 'sm' }) {
  const s = getClientStage(value)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      <span>{s.icon}</span> {s.label}
    </span>
  )
}

function PipelineBar({ currentStage, clientId, onStageChange }) {
  const [open, setOpen] = useState(false)
  const currentIdx = CLIENT_PIPELINE.findIndex(s => s.value === currentStage)

  return (
    <div className="relative">
      {/* Мини-прогресс-бар */}
      <button onClick={() => setOpen(!open)} className="w-full">
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
          {CLIENT_PIPELINE.map((s, i) => (
            <div key={s.value}
              className={`flex-1 transition-all ${i <= currentIdx
                ? s.value === 'problematic' ? 'bg-red-500' : i === CLIENT_PIPELINE.length - 2 ? 'bg-green-500' : 'bg-indigo-500'
                : 'bg-zinc-200'}`}
            />
          ))}
        </div>
      </button>

      {/* Дропдаун */}
      {open && (
        <div className="absolute top-4 left-0 right-0 z-50 bg-white border border-zinc-200 rounded-xl shadow-lg p-1 min-w-[220px]">
          {CLIENT_PIPELINE.map(s => (
            <button key={s.value}
              onClick={() => { onStageChange(s.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm hover:bg-zinc-50 transition-colors ${s.value === currentStage ? 'bg-indigo-50' : ''}`}>
              <span>{s.icon}</span>
              <span className="flex-1 font-medium">{s.label}</span>
              {s.value === currentStage && <span className="text-indigo-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const EMPTY_FORM = {
  name: '', inn: '', legal_entity: '', contact_name: '', contact_position: '',
  phone: '', email: '', address: '', default_object: '',
  payment_terms: '', client_rate_default: '',
  source: '', current_provider: '', pain_point: '',
  monthly_volume: '', responsible_manager: '',
  next_contact_date: '', notes: '',
  pipeline_stage: 'new_lead', status: 'active'
}

function ClientForm({ client, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!client?.id
  const [form, setForm] = useState(client ? { ...EMPTY_FORM, ...client } : EMPTY_FORM)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = useMutation({
    mutationFn: d => isEdit ? entities.Client.update(client.id, d) : entities.Client.create(d),
    onSuccess: () => { qc.invalidateQueries(['clients']); toast.success(isEdit ? 'Сохранено' : 'Клиент добавлен'); onClose() },
    onError: e => toast.error(e.message)
  })

  const setReminder = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days)
    set('next_contact_date', d.toISOString().slice(0,10))
  }

  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} className="space-y-4">
      {/* Воронка */}
      <div className="space-y-1.5">
        <Label>Этап воронки</Label>
        <Select value={form.pipeline_stage} onValueChange={v => set('pipeline_stage', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CLIENT_PIPELINE.map(s => (
              <SelectItem key={s.value} value={s.value}>
                <span className="flex items-center gap-2">{s.icon} {s.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5"><Label>Название объекта / компании *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>ИНН</Label><Input value={form.inn} onChange={e => set('inn', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Наше юр. лицо</Label>
          <Select value={form.legal_entity} onValueChange={v => set('legal_entity', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{(LEGAL_ENTITIES||[]).map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Контактное лицо</Label><Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="ФИО" /></div>
        <div className="space-y-1.5"><Label>Должность контакта</Label><Input value={form.contact_position} onChange={e => set('contact_position', e.target.value)} placeholder="Управляющий" /></div>
        <div className="space-y-1.5"><Label>Телефон</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+7..." /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Адрес объекта</Label><Input value={form.address} onChange={e => set('address', e.target.value)} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Основной объект (название)</Label><Input value={form.default_object} onChange={e => set('default_object', e.target.value)} /></div>
      </div>

      {/* Источник и боль */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Источник лида</Label>
          <Select value={form.source} onValueChange={v => set('source', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Текущий поставщик</Label><Input value={form.current_provider} onChange={e => set('current_provider', e.target.value)} placeholder="Кто сейчас?" /></div>
        <div className="space-y-1.5"><Label>Объём в месяц (смен)</Label><Input type="number" value={form.monthly_volume} onChange={e => set('monthly_volume', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Ответственный менеджер</Label><Input value={form.responsible_manager} onChange={e => set('responsible_manager', e.target.value)} /></div>
      </div>

      <div className="space-y-1.5"><Label>Боль клиента</Label>
        <Textarea value={form.pain_point} onChange={e => set('pain_point', e.target.value)} rows={2} placeholder="Невыходы? Качество? Скорость?" />
      </div>

      {/* Условия */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Условия оплаты</Label>
          <Select value={form.payment_terms} onValueChange={v => set('payment_terms', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {Object.entries(PAY_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Ставка (₽/ч)</Label><Input type="number" value={form.client_rate_default} onChange={e => set('client_rate_default', e.target.value)} /></div>
      </div>

      {/* Напоминание */}
      <div className="space-y-1.5">
        <Label>Напомнить перезвонить</Label>
        <div className="flex gap-2 mb-1.5">
          {[1,3,7,14,30].map(d => (
            <button key={d} type="button" onClick={() => setReminder(d)}
              className="text-xs px-2.5 py-1 border border-zinc-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors">
              +{d}д
            </button>
          ))}
        </div>
        <Input type="date" value={form.next_contact_date} onChange={e => set('next_contact_date', e.target.value)} />
      </div>

      <div className="space-y-1.5"><Label>Заметки</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
        <Button type="submit" disabled={save.isPending} className="flex-1">{save.isPending ? '...' : isEdit ? 'Сохранить' : 'Добавить'}</Button>
      </div>
    </form>
  )
}

export default function Clients() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [kanban, setKanban] = useState(false)

  const { data: clients = [], isLoading } = useQuery({ queryKey: ['clients'], queryFn: () => entities.Client.list('-created_at') })
  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list() })

  const changeStage = useMutation({
    mutationFn: ({ id, stage }) => entities.Client.update(id, { pipeline_stage: stage }),
    onSuccess: () => { qc.invalidateQueries(['clients']); toast.success('Этап обновлён') }
  })

  const del = useMutation({
    mutationFn: id => entities.Client.delete(id),
    onSuccess: () => { qc.invalidateQueries(['clients']); toast.success('Удалено') }
  })

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (!q || c.name?.toLowerCase().includes(q) || c.contact_name?.toLowerCase().includes(q) || c.phone?.includes(q)) &&
      (stageFilter === 'all' || c.pipeline_stage === stageFilter)
  })

  // Напоминания
  const today = new Date()
  const overdue = clients.filter(c => c.next_contact_date && new Date(c.next_contact_date) < today)
  const upcoming = clients.filter(c => c.next_contact_date && new Date(c.next_contact_date) >= today && differenceInDays(new Date(c.next_contact_date), today) <= 3)

  function getStats(name) {
    const cs = shifts.filter(s => s.client_name === name)
    return { count: cs.length, unpaid: cs.filter(s => s.payment_status === 'not_invoiced').length }
  }

  if (kanban) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <PageHeader
          title="Воронка клиентов"
          subtitle={`${clients.length} клиентов`}
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setKanban(false)}>Список</Button>
              <Button size="sm" onClick={() => { setEditClient(null); setFormOpen(true) }}><Plus className="w-4 h-4 mr-1" />Добавить</Button>
            </div>
          }
        />
        <div className="overflow-x-auto p-4">
          <div className="flex gap-3" style={{ minWidth: `${CLIENT_PIPELINE.length * 220}px` }}>
            {CLIENT_PIPELINE.map(stage => {
              const stageClients = clients.filter(c => (c.pipeline_stage || 'new_lead') === stage.value)
              return (
                <div key={stage.value} className="w-52 shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${stage.color}`}>
                    <span>{stage.icon}</span>
                    <span className="text-xs font-semibold">{stage.label}</span>
                    <span className="ml-auto text-xs opacity-70">{stageClients.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stageClients.map(c => (
                      <div key={c.id} className="bg-white rounded-xl border border-zinc-200 p-3 cursor-pointer hover:border-indigo-300 transition-colors"
                        onClick={() => { setEditClient(c); setFormOpen(true) }}>
                        <p className="font-medium text-sm text-zinc-900 truncate">{c.name}</p>
                        {c.contact_name && <p className="text-xs text-zinc-500 truncate">{c.contact_name}</p>}
                        {c.phone && <p className="text-xs text-zinc-400">{c.phone}</p>}
                        {c.next_contact_date && (
                          <p className={`text-xs mt-1 ${new Date(c.next_contact_date) < today ? 'text-red-500 font-medium' : 'text-amber-600'}`}>
                            📅 {format(new Date(c.next_contact_date), 'dd.MM')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Dialog open={formOpen} onOpenChange={() => setFormOpen(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editClient ? 'Редактировать клиента' : 'Новый клиент'}</DialogTitle></DialogHeader>
            <ClientForm client={editClient} onClose={() => { setFormOpen(false); setEditClient(null) }} />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Заказчики"
        subtitle={`${filtered.length} клиентов`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setKanban(true)}>Канбан</Button>
            <Button size="sm" onClick={() => { setEditClient(null); setFormOpen(true) }}><Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Добавить</span></Button>
          </div>
        }
      />

      {/* Баннер напоминаний */}
      {(overdue.length > 0 || upcoming.length > 0) && (
        <div className={`mx-4 md:mx-6 mt-3 rounded-xl border px-4 py-3 ${overdue.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-sm font-semibold mb-1.5 ${overdue.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>
            {overdue.length > 0 ? `⚠️ Просрочено звонков: ${overdue.length}` : `📅 Напомнить сегодня-3 дня: ${upcoming.length}`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...overdue, ...upcoming].slice(0,6).map(c => (
              <button key={c.id} onClick={() => { setEditClient(c); setFormOpen(true) }}
                className={`text-xs px-2.5 py-1 rounded-full ${overdue.includes(c) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {c.name} · {format(new Date(c.next_contact_date), 'dd.MM')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="px-3 md:px-6 py-2 bg-white border-b border-zinc-100 flex gap-2 flex-wrap mt-3">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все этапы</SelectItem>
            {CLIENT_PIPELINE.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Счётчики по этапам */}
      <div className="flex gap-2 px-4 md:px-6 py-2 overflow-x-auto scrollbar-hide">
        {CLIENT_PIPELINE.map(s => {
          const cnt = clients.filter(c => (c.pipeline_stage || 'new_lead') === s.value).length
          if (!cnt) return null
          return (
            <button key={s.value} onClick={() => setStageFilter(stageFilter === s.value ? 'all' : s.value)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${stageFilter === s.value ? s.color + ' ring-2 ring-offset-1 ring-current' : s.color + ' opacity-70 hover:opacity-100'}`}>
              {s.icon} {s.label} <span className="font-bold">{cnt}</span>
            </button>
          )
        })}
      </div>

      {/* Список */}
      <div className="p-3 md:p-6 space-y-2">
        {isLoading ? <div className="py-16 text-center text-zinc-400">Загрузка...</div>
        : filtered.length === 0 ? <div className="py-16 text-center text-zinc-400">Нет клиентов</div>
        : filtered.map(client => {
          const stage = getClientStage(client.pipeline_stage || 'new_lead')
          const stats = getStats(client.name)
          const isOverdue = client.next_contact_date && new Date(client.next_contact_date) < today
          return (
            <div key={client.id} className={`bg-white rounded-xl border ${isOverdue ? 'border-red-200' : 'border-zinc-200'} p-4`}>
              {/* Прогресс-бар воронки */}
              <div className="mb-3">
                <PipelineBar
                  currentStage={client.pipeline_stage || 'new_lead'}
                  clientId={client.id}
                  onStageChange={stage => changeStage.mutate({ id: client.id, stage })}
                />
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm text-zinc-900">{client.name}</p>
                    <StageBadge value={client.pipeline_stage || 'new_lead'} />
                    {stats.unpaid > 0 && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{stats.unpaid} без оплаты</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                    {client.contact_name && <span>👤 {client.contact_name}{client.contact_position ? ` · ${client.contact_position}` : ''}</span>}
                    {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                    {stats.count > 0 && <span>📊 {stats.count} смен</span>}
                    {client.current_provider && <span className="text-amber-600">← {client.current_provider}</span>}
                  </div>
                  {client.next_contact_date && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-amber-600'}`}>
                      <Calendar className="w-3 h-3" />
                      {isOverdue ? '⚠️ Просрочено: ' : 'Позвонить: '}
                      {format(new Date(client.next_contact_date), 'dd.MM.yyyy')}
                    </p>
                  )}
                  {client.pain_point && <p className="text-xs text-zinc-400 mt-1 italic truncate">💬 {client.pain_point}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => {
                      const url = `${window.location.origin}/zayavka/${client.id}?name=${encodeURIComponent(client.name)}`;
                      navigator.clipboard.writeText(url).then(
                        () => toast.success('Ссылка на заявку скопирована'),
                        () => toast.error('Не удалось скопировать')
                      );
                    }}
                    title="Скопировать ссылку для заявки клиента"
                    className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-amber-600">
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditClient(client); setFormOpen(true) }}
                    className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-zinc-700">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Удалить клиента?')) del.mutate(client.id) }}
                    className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={formOpen} onOpenChange={() => setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editClient ? 'Редактировать клиента' : 'Новый клиент'}</DialogTitle></DialogHeader>
          <ClientForm client={editClient} onClose={() => { setFormOpen(false); setEditClient(null) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
