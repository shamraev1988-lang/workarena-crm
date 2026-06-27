import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { entities } from '@/api/entities'
import { supabase } from '@/api/supabase'
import { Plus, Search, Edit2, Trash2, Star, Phone, Calendar, History, Camera, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { POSITIONS, CITIZENSHIPS } from '@/lib/constants'
import { EMPLOYEE_PIPELINE, getEmployeeStage } from '@/lib/pipeline'

const BANK_OPTIONS = ['Сбербанк','Тинькофф','ВТБ','Альфабанк','ОзонБанк','Банк Точка','Совкомбанк','Другой']

function StageBadge({ value }) {
  const s = getEmployeeStage(value)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.color}`}>
      {s.icon} {s.label}
    </span>
  )
}

function StageSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = getEmployeeStage(value)
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${current.color} border border-current/20`}>
        {current.icon} {current.label} <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white border border-zinc-200 rounded-xl shadow-lg p-1 min-w-[220px]">
          {EMPLOYEE_PIPELINE.map(s => (
            <button key={s.value} type="button"
              onClick={() => { onChange(s.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-zinc-50 ${s.value === value ? 'bg-indigo-50' : ''}`}>
              <span>{s.icon}</span>
              <div className="flex-1 text-left">
                <p className="font-medium text-zinc-900">{s.label}</p>
                <p className="text-xs text-zinc-400">{s.description}</p>
              </div>
              {s.value === value && <span className="text-indigo-500 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Диалог: история смен сотрудника + оценки
function EmployeeHistoryDialog({ employee, onClose }) {
  const { data: ratings = [] } = useQuery({
    queryKey: ['ratings', employee?.id],
    queryFn: async () => {
      const { data } = await supabase.from('shift_ratings').select('*').eq('employee_name', employee.full_name).order('shift_date', { ascending: false }).limit(50)
      return data || []
    },
    enabled: !!employee
  })
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => entities.Shift.list('-date'),
    enabled: !!employee
  })
  if (!employee) return null
  const empShifts = shifts.filter(s => s.employee_name === employee.full_name).slice(0, 30)
  const avgRating = ratings.length ? (ratings.reduce((s,r) => s + r.rating, 0) / ratings.length).toFixed(1) : null
  const totalPayout = empShifts.reduce((s, sh) => s + (sh.employee_payout || 0), 0)
  const stage = getEmployeeStage(employee.hr_stage || 'new_response')

  return (
    <Dialog open={!!employee} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>История — {employee.full_name}</DialogTitle>
        </DialogHeader>

        {/* Карточка */}
        <div className="flex items-center gap-4 bg-zinc-50 rounded-xl p-4 mb-2">
          {employee.photo_url ? (
            <img src={employee.photo_url} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-bold">
              {employee.full_name?.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-bold text-zinc-900">{employee.full_name}</p>
            <p className="text-sm text-zinc-500">{employee.position} · {employee.citizenship}</p>
            <div className="mt-1"><StageBadge value={employee.hr_stage || 'new_response'} /></div>
          </div>
          <div className="ml-auto text-right">
            {avgRating && <p className="text-2xl font-bold text-amber-500">★ {avgRating}</p>}
            <p className="text-xs text-zinc-400">{ratings.length} оценок</p>
            {employee.last_shift_date && <p className="text-xs text-zinc-400">Последняя: {format(new Date(employee.last_shift_date), 'dd.MM.yyyy')}</p>}
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-zinc-50 rounded-xl p-3 text-center">
            <p className="text-xs text-zinc-400 uppercase">Всего смен</p>
            <p className="text-2xl font-bold text-zinc-900">{empShifts.length}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xs text-zinc-400 uppercase">Выплачено</p>
            <p className="text-lg font-bold text-red-600">{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(totalPayout)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-xs text-zinc-400 uppercase">Рейтинг</p>
            <p className="text-2xl font-bold text-amber-500">{avgRating ? `★ ${avgRating}` : '—'}</p>
          </div>
        </div>

        {/* Оценки */}
        {ratings.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-700 mb-2">Оценки клиентов</h3>
            <div className="space-y-2">
              {ratings.map(r => (
                <div key={r.id} className="flex items-center gap-3 border border-zinc-100 rounded-xl px-4 py-2.5">
                  <div className="shrink-0 text-xs text-zinc-400 w-16">{r.shift_date ? format(new Date(r.shift_date), 'dd.MM.yy') : '—'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{r.client_name}</p>
                    {r.comment && <p className="text-xs text-zinc-400 truncate italic">{r.comment}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-amber-500 font-bold">★ {r.rating}</span>
                    <span className="text-xs text-zinc-400">/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* История смен */}
        {empShifts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 mb-2">История смен</h3>
            <div className="space-y-1">
              {empShifts.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2 bg-zinc-50 rounded-lg text-xs">
                  <span className="text-zinc-400 w-14 shrink-0">{s.date ? format(new Date(s.date), 'dd.MM.yy') : '—'}</span>
                  <span className="flex-1 truncate text-zinc-700">{s.client_name} · {s.object_name}</span>
                  <span className="text-zinc-500">{s.hours || '—'}ч</span>
                  <span className="font-medium text-zinc-900">{s.employee_payout ? new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(s.employee_payout) + '₽' : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {empShifts.length === 0 && ratings.length === 0 && (
          <div className="py-8 text-center text-zinc-400">История пуста</div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Диалог: добавить оценку сотруднику
function RatingDialog({ employee, onClose }) {
  const qc = useQueryClient()
  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => entities.Shift.list('-date') })
  const empShifts = shifts.filter(s => s.employee_name === employee?.full_name && !s.rated).slice(0, 20)
  const [rating, setRating] = useState(8)
  const [comment, setComment] = useState('')
  const [selectedShift, setSelectedShift] = useState('')
  const [clientName, setClientName] = useState('')

  const save = useMutation({
    mutationFn: async () => {
      const shift = shifts.find(s => s.id === selectedShift)
      const { error } = await supabase.from('shift_ratings').insert({
        employee_name: employee.full_name,
        client_name: clientName || shift?.client_name,
        object_name: shift?.object_name,
        shift_date: shift?.date || new Date().toISOString().slice(0,10),
        shift_id: selectedShift || null,
        rating: Number(rating),
        comment,
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries(['ratings']); qc.invalidateQueries(['employees']); toast.success('Оценка добавлена'); onClose() },
    onError: e => toast.error(e.message)
  })

  if (!employee) return null
  return (
    <Dialog open={!!employee} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Оценка — {employee.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Смена</Label>
            <Select value={selectedShift} onValueChange={v => { setSelectedShift(v); const s = shifts.find(sh=>sh.id===v); if(s) setClientName(s.client_name) }}>
              <SelectTrigger><SelectValue placeholder="Выберите смену или введите вручную" /></SelectTrigger>
              <SelectContent>
                {empShifts.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.date ? format(new Date(s.date), 'dd.MM') : '?'} · {s.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!selectedShift && (
            <div className="space-y-1.5"><Label>Заказчик (вручную)</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="ООО Формула 2005" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Оценка: <span className="text-amber-500 font-bold text-lg">{rating}</span>/10</Label>
            <input type="range" min={1} max={10} value={rating} onChange={e => setRating(e.target.value)}
              className="w-full accent-amber-500" />
            <div className="flex justify-between text-xs text-zinc-400"><span>1 — ужасно</span><span>10 — идеально</span></div>
          </div>
          <div className="space-y-1.5"><Label>Комментарий</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Опоздал, грубил, справился отлично..." />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1">{save.isPending ? '...' : 'Сохранить'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EmployeeForm({ employee, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!employee?.id
  const EMPTY = {
    full_name: '', phone: '', telegram: '', position: '', citizenship: '',
    is_self_employed: false, self_employed_tin: '', docs_checked: false,
    bank_name: '', status: 'active', hr_stage: 'new_response',
    notes: '', manager_note: '', rating: '', blacklist_reason: ''
  }
  const [form, setForm] = useState(employee ? { ...EMPTY, ...employee } : EMPTY)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = useMutation({
    mutationFn: d => isEdit ? entities.Employee.update(employee.id, d) : entities.Employee.create(d),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success(isEdit ? 'Сохранено' : 'Добавлено'); onClose() },
    onError: e => toast.error(e.message)
  })

  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} className="space-y-4">
      {/* Статус воронки */}
      <div className="space-y-1.5">
        <Label>Статус исполнителя</Label>
        <StageSelector value={form.hr_stage} onChange={v => {
          set('hr_stage', v)
          if (v === 'blacklist') set('status', 'banned')
          else if (v === 'new_response') set('status', 'active')
        }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5"><Label>ФИО *</Label><Input value={form.full_name} onChange={e => set('full_name', e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Телефон</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+7..." /></div>
        <div className="space-y-1.5"><Label>Telegram</Label><Input value={form.telegram} onChange={e => set('telegram', e.target.value)} placeholder="@..." /></div>
        <div className="space-y-1.5"><Label>Должность</Label>
          <Select value={form.position} onValueChange={v => set('position', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{(POSITIONS||[]).map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Гражданство</Label>
          <Select value={form.citizenship} onValueChange={v => set('citizenship', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{(CITIZENSHIPS||[]).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Банк для выплат</Label>
          <Select value={form.bank_name} onValueChange={v => set('bank_name', v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{BANK_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-6"><Switch checked={form.is_self_employed} onCheckedChange={v => set('is_self_employed', v)} /><Label>Самозанятый (СЗ)</Label></div>
        {form.is_self_employed && <div className="space-y-1.5"><Label>ИНН СЗ</Label><Input value={form.self_employed_tin} onChange={e => set('self_employed_tin', e.target.value)} /></div>}
        <div className="flex items-center gap-3 pt-2"><Switch checked={form.docs_checked} onCheckedChange={v => set('docs_checked', v)} /><Label>Документы проверены ✓</Label></div>
      </div>

      <div className="space-y-1.5"><Label>Заметка менеджера (честно: надёжный / пьёт / нормальный)</Label>
        <Textarea value={form.manager_note} onChange={e => set('manager_note', e.target.value)} rows={2} placeholder="Только для внутреннего использования..." />
      </div>

      {form.hr_stage === 'blacklist' && (
        <div className="space-y-1.5 bg-red-50 border border-red-200 rounded-xl p-3">
          <Label className="text-red-700">Причина чёрного списка *</Label>
          <Textarea value={form.blacklist_reason} onChange={e => set('blacklist_reason', e.target.value)} rows={2} placeholder="Невыход без предупреждения 15.06.2026..." className="border-red-200" />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
        <Button type="submit" disabled={save.isPending} className="flex-1">{save.isPending ? '...' : isEdit ? 'Сохранить' : 'Добавить'}</Button>
      </div>
    </form>
  )
}

export default function Employees() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editEmp, setEditEmp] = useState(null)
  const [historyEmp, setHistoryEmp] = useState(null)
  const [ratingEmp, setRatingEmp] = useState(null)

  const { data: employees = [], isLoading } = useQuery({ queryKey: ['employees'], queryFn: () => entities.Employee.list('-created_at') })

  const changeStage = useMutation({
    mutationFn: ({ id, stage }) => entities.Employee.update(id, { hr_stage: stage }),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Статус обновлён') }
  })
  const del = useMutation({
    mutationFn: id => entities.Employee.delete(id),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Удалено') }
  })

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    return (!q || e.full_name?.toLowerCase().includes(q) || e.phone?.includes(q)) &&
      (stageFilter === 'all' || (e.hr_stage || 'new_response') === stageFilter)
  })

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Исполнители"
        subtitle={`${filtered.length} чел.`}
        action={
          <Button size="sm" onClick={() => { setEditEmp(null); setFormOpen(true) }}>
            <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Добавить</span>
          </Button>
        }
      />

      {/* Фильтры */}
      <div className="px-3 md:px-6 py-2 bg-white border-b border-zinc-100 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-9 w-48 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {EMPLOYEE_PIPELINE.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Счётчики */}
      <div className="flex gap-2 px-4 md:px-6 py-2 overflow-x-auto scrollbar-hide">
        {EMPLOYEE_PIPELINE.map(s => {
          const cnt = employees.filter(e => (e.hr_stage || 'new_response') === s.value).length
          if (!cnt) return null
          return (
            <button key={s.value} onClick={() => setStageFilter(stageFilter === s.value ? 'all' : s.value)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${stageFilter === s.value ? s.color + ' ring-2 ring-offset-1 ring-current' : s.color + ' opacity-60 hover:opacity-100'}`}>
              {s.icon} {s.label} <span className="font-bold">{cnt}</span>
            </button>
          )
        })}
      </div>

      {/* Список */}
      <div className="p-3 md:p-6 space-y-2">
        {isLoading ? <div className="py-16 text-center text-zinc-400">Загрузка...</div>
        : filtered.length === 0 ? <div className="py-16 text-center text-zinc-400">Нет исполнителей</div>
        : filtered.map(emp => {
          const stage = getEmployeeStage(emp.hr_stage || 'new_response')
          const isBlacklist = emp.hr_stage === 'blacklist'
          const isTrusted = emp.hr_stage === 'trusted_employee'
          return (
            <div key={emp.id} className={`bg-white rounded-xl border ${isBlacklist ? 'border-red-200 bg-red-50/30' : isTrusted ? 'border-green-200 bg-green-50/20' : 'border-zinc-200'} px-4 py-3`}>
              <div className="flex items-start gap-3">
                {/* Аватар */}
                <div className="shrink-0">
                  {emp.photo_url ? (
                    <img src={emp.photo_url} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isBlacklist ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {emp.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>

                {/* Инфо */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm text-zinc-900">{emp.full_name}</p>
                    <StageBadge value={emp.hr_stage || 'new_response'} />
                    {emp.docs_checked && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">✓ Docs</span>}
                    {emp.is_self_employed && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">СЗ</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                    {emp.position && <span>{emp.position}</span>}
                    {emp.citizenship && <span>{emp.citizenship}</span>}
                    {emp.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>}
                    {emp.bank_name && <span>🏦 {emp.bank_name}</span>}
                  </div>
                  {emp.avg_rating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-amber-500 text-xs font-bold">★ {emp.avg_rating}</span>
                      <span className="text-xs text-zinc-400">· {emp.total_shifts || 0} смен</span>
                      {emp.last_shift_date && <span className="text-xs text-zinc-400">· последняя {format(new Date(emp.last_shift_date), 'dd.MM.yy')}</span>}
                    </div>
                  )}
                  {emp.manager_note && (
                    <p className="text-xs text-zinc-400 mt-1 italic">💬 {emp.manager_note}</p>
                  )}
                  {isBlacklist && emp.blacklist_reason && (
                    <p className="text-xs text-red-600 mt-1 font-medium">🚫 {emp.blacklist_reason}</p>
                  )}
                </div>

                {/* Действия */}
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setHistoryEmp(emp)} title="История смен"
                    className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-indigo-600">
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setRatingEmp(emp)} title="Добавить оценку"
                    className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-amber-500">
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditEmp(emp); setFormOpen(true) }}
                    className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-zinc-700">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Удалить?')) del.mutate(emp.id) }}
                    className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Быстрый перевод статуса */}
              <div className="mt-2 flex gap-1 flex-wrap">
                {EMPLOYEE_PIPELINE.filter(s => s.value !== (emp.hr_stage || 'new_response')).slice(0, 4).map(s => (
                  <button key={s.value}
                    onClick={() => changeStage.mutate({ id: emp.id, stage: s.value })}
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${s.color} opacity-60 hover:opacity-100 transition-opacity`}>
                    → {s.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Форма */}
      <Dialog open={formOpen} onOpenChange={() => setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEmp ? 'Редактировать' : 'Новый исполнитель'}</DialogTitle></DialogHeader>
          <EmployeeForm employee={editEmp} onClose={() => { setFormOpen(false); setEditEmp(null) }} />
        </DialogContent>
      </Dialog>

      <EmployeeHistoryDialog employee={historyEmp} onClose={() => setHistoryEmp(null)} />
      <RatingDialog employee={ratingEmp} onClose={() => setRatingEmp(null)} />
    </div>
  )
}
