import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSettings } from '@/lib/SettingsContext'

const PIPES = [
  { key: 'client',   title: 'Воронка клиентов' },
  { key: 'employee', title: 'Воронка исполнителей' },
  { key: 'order',    title: 'Воронка заявок' },
]

// Палитра — пары классов (бейдж + точка), чтобы совпадало с tailwind safelist в проекте
const PALETTE = [
  { name: 'Серый',     color: 'bg-zinc-100 text-zinc-600',     dot: 'bg-zinc-400' },
  { name: 'Синий',     color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400' },
  { name: 'Индиго',    color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  { name: 'Фиолет',    color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { name: 'Янтарь',    color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  { name: 'Изумруд',   color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { name: 'Зелёный',   color: 'bg-green-100 text-green-700',   dot: 'bg-green-600' },
  { name: 'Красный',   color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
]

function slug(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'stage_' + Date.now()
}

function StageRow({ stage, onChange, onRemove, canRemove }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const cur = PALETTE.find(p => p.color === stage.color) || PALETTE[0]
  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <GripVertical className="w-4 h-4 text-zinc-200 shrink-0" />
      <Input value={stage.icon || ''} maxLength={2} placeholder="🎯"
        onChange={e => onChange({ icon: e.target.value })}
        className="w-12 h-9 text-center text-base shrink-0" />
      <Input value={stage.label} placeholder="Название этапа"
        onChange={e => onChange({ label: e.target.value, value: stage.value || slug(e.target.value) })}
        className="flex-1 h-9 text-sm" />
      <div className="relative shrink-0">
        <button onClick={() => setPickerOpen(o => !o)} title="Цвет"
          className={`w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center ${cur.color}`}>
          <span className={`w-3 h-3 rounded-full ${cur.dot}`} />
        </button>
        {pickerOpen && (
          <div className="absolute right-0 top-10 z-50 bg-white border border-zinc-200 rounded-xl shadow-lg p-2 grid grid-cols-4 gap-1.5 w-44">
            {PALETTE.map(p => (
              <button key={p.name} title={p.name}
                onClick={() => { onChange({ color: p.color, dot: p.dot }); setPickerOpen(false) }}
                className={`h-8 rounded-lg flex items-center justify-center ${p.color} ${p.color === stage.color ? 'ring-2 ring-offset-1 ring-zinc-400' : ''}`}>
                <span className={`w-3 h-3 rounded-full ${p.dot}`} />
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onRemove} disabled={!canRemove}
        className="p-1.5 text-zinc-300 hover:text-red-500 disabled:opacity-30 shrink-0"><Trash2 className="w-4 h-4" /></button>
    </div>
  )
}

export default function Pipelines() {
  const nav = useNavigate()
  const { config, save } = useSettings()
  const [pipes, setPipes] = useState(() => JSON.parse(JSON.stringify(config.pipelines)))
  const [saving, setSaving] = useState(false)

  const setStage = (pkey, i, patch) =>
    setPipes(p => ({ ...p, [pkey]: p[pkey].map((s, idx) => idx === i ? { ...s, ...patch } : s) }))
  const addStage = (pkey) =>
    setPipes(p => ({ ...p, [pkey]: [...p[pkey], { value: '', label: '', icon: '⚪', color: PALETTE[0].color, dot: PALETTE[0].dot, description: '' }] }))
  const removeStage = (pkey, i) =>
    setPipes(p => ({ ...p, [pkey]: p[pkey].filter((_, idx) => idx !== i) }))

  const submit = async () => {
    for (const def of PIPES) {
      const arr = pipes[def.key] || []
      if (arr.length < 2) { toast.error(`${def.title}: нужно минимум 2 этапа`); return }
      if (arr.some(s => !s.label?.trim())) { toast.error(`${def.title}: пустые названия`); return }
      const vals = arr.map(s => s.value || slug(s.label))
      if (new Set(vals).size !== vals.length) { toast.error(`${def.title}: повторяющиеся значения`); return }
    }
    const clean = {}
    for (const def of PIPES) clean[def.key] = pipes[def.key].map(s => ({ ...s, value: s.value || slug(s.label) }))
    setSaving(true)
    try {
      await save({ pipelines: clean })
      toast.success('Воронки сохранены')
    } catch (e) { toast.error('Ошибка: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <PageHeader title="Воронки" subtitle="Этапы, цвета и иконки"
        action={<Button variant="ghost" size="sm" onClick={() => nav('/settings')}><ArrowLeft className="w-4 h-4 mr-1" />Назад</Button>} />

      <div className="p-4 md:p-6 max-w-2xl space-y-4">
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Удаление этапа не трогает уже присвоенные записи — они просто перестанут попадать в колонку. Порядок этапов = порядок строк.
        </div>
        {PIPES.map(def => (
          <div key={def.key} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-700">{def.title}</h3>
              <button onClick={() => addStage(def.key)} className="text-xs text-amber-600 hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3" />этап</button>
            </div>
            <div className="divide-y divide-zinc-50">
              {(pipes[def.key] || []).map((s, i) => (
                <StageRow key={i} stage={s}
                  onChange={patch => setStage(def.key, i, patch)}
                  onRemove={() => removeStage(def.key, i)}
                  canRemove={(pipes[def.key] || []).length > 2} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 md:left-[240px] right-0 bg-white border-t border-zinc-200 px-4 py-3 z-40">
        <div className="max-w-2xl flex">
          <Button onClick={submit} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
            <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Сохранение...' : 'Сохранить воронки'}
          </Button>
        </div>
      </div>
    </div>
  )
}
