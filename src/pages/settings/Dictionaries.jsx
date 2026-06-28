import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Briefcase, Wallet, Users, FileText, Tag, Globe } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSettings } from '@/lib/SettingsContext'

// транслитерация для авто-value из label
function slug(s) {
  const map = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',' ':'_' }
  return (s || '').toLowerCase().split('').map(c => map[c] ?? c).join('').replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'item_' + Date.now()
}

// Описание редактируемых справочников и их доп.полей
const DICTS = [
  { key: 'positions',          title: 'Должности персонала', icon: Users,     fields: [] },
  { key: 'work_types',         title: 'Типы работ',          icon: Briefcase, fields: [] },
  { key: 'citizenships',       title: 'Гражданства',         icon: Globe,     fields: [] },
  { key: 'expense_categories', title: 'Категории расходов',  icon: Tag,       fields: [] },
  { key: 'cash_accounts',      title: 'Кассы',               icon: Wallet,    fields: [{ name: 'group', label: 'Группа', type: 'text', placeholder: 'cash/bank/platform' }] },
  { key: 'legal_entities',     title: 'Юридические лица',     icon: FileText,  fields: [{ name: 'tax_rate', label: 'Налог', type: 'rate' }] },
]

function DictEditor({ def, items, onChange }) {
  const Icon = def.icon
  const update = (i, patch) => onChange(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  const add = () => onChange([...items, { value: '', label: '', ...(def.key === 'legal_entities' ? { tax_rate: 0.06 } : {}) }])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-700">{def.title}</h3>
          <span className="text-xs text-zinc-400 bg-zinc-100 rounded-full px-2">{items.length}</span>
        </div>
        <button onClick={add} className="text-xs text-amber-600 hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3" />добавить</button>
      </div>
      <div className="divide-y divide-zinc-50">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2.5">
            <GripVertical className="w-4 h-4 text-zinc-200 shrink-0" />
            <Input value={it.label} placeholder="Название"
              onChange={e => update(i, { label: e.target.value, value: it.value || slug(e.target.value) })}
              className="flex-1 h-9 text-sm" />
            {def.fields.map(fld => fld.type === 'rate' ? (
              <div key={fld.name} className="flex items-center gap-1 shrink-0">
                <Input type="number" step="1" value={Math.round((it[fld.name] ?? 0) * 100)} title="Налог %"
                  onChange={e => update(i, { [fld.name]: Number(e.target.value) / 100 })}
                  className="w-16 h-9 text-sm text-center" />
                <span className="text-xs text-zinc-400">%</span>
              </div>
            ) : (
              <Input key={fld.name} value={it[fld.name] || ''} placeholder={fld.placeholder || fld.label}
                onChange={e => update(i, { [fld.name]: e.target.value })}
                className="w-28 h-9 text-sm shrink-0" />
            ))}
            <button onClick={() => remove(i)} className="p-1.5 text-zinc-300 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {items.length === 0 && <div className="px-5 py-6 text-center text-xs text-zinc-400">Пусто — добавьте первый элемент</div>}
      </div>
    </div>
  )
}

export default function Dictionaries() {
  const nav = useNavigate()
  const { config, save } = useSettings()
  const [dict, setDict] = useState(() => JSON.parse(JSON.stringify(config.dict)))
  const [saving, setSaving] = useState(false)

  const setOne = (key, items) => setDict(d => ({ ...d, [key]: items }))

  const submit = async () => {
    // валидация: у всех value заполнены и уникальны внутри справочника
    for (const def of DICTS) {
      const items = dict[def.key] || []
      const vals = items.map(i => i.value || slug(i.label))
      if (items.some(i => !i.label?.trim())) { toast.error(`${def.title}: есть пустые названия`); return }
      if (new Set(vals).size !== vals.length) { toast.error(`${def.title}: повторяющиеся значения`); return }
    }
    // нормализуем value
    const clean = {}
    for (const def of DICTS) {
      clean[def.key] = (dict[def.key] || []).map(i => ({ ...i, value: i.value || slug(i.label) }))
    }
    setSaving(true)
    try {
      await save({ dict: clean })
      toast.success('Справочники сохранены')
    } catch (e) {
      toast.error('Ошибка: ' + e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <PageHeader title="Справочники" subtitle="Должности, кассы, типы работ, категории"
        action={<Button variant="ghost" size="sm" onClick={() => nav('/settings')}><ArrowLeft className="w-4 h-4 mr-1" />Назад</Button>} />

      <div className="p-4 md:p-6 max-w-2xl space-y-4">
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Изменения применяются ко всем формам. Уже сохранённые записи со старыми значениями не меняются — переименование влияет только на отображение новых.
        </div>
        {DICTS.map(def => (
          <DictEditor key={def.key} def={def} items={dict[def.key] || []} onChange={items => setOne(def.key, items)} />
        ))}
      </div>

      <div className="fixed bottom-0 left-0 md:left-[240px] right-0 bg-white border-t border-zinc-200 px-4 py-3 z-40">
        <div className="max-w-2xl flex">
          <Button onClick={submit} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
            <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Сохранение...' : 'Сохранить справочники'}
          </Button>
        </div>
      </div>
    </div>
  )
}
