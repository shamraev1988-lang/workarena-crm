import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSettings } from '@/lib/SettingsContext'

const CURRENCIES = [
  { code: 'RUB', symbol: '₽' },
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
  { code: 'RSD', symbol: 'дин.' },
]

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-xs text-zinc-500 font-medium block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function Company() {
  const nav = useNavigate()
  const { config, save } = useSettings()
  const [f, setF] = useState(config.company)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const submit = async () => {
    setSaving(true)
    try {
      await save({ company: f })
      toast.success('Параметры компании сохранены')
    } catch (e) {
      toast.error('Ошибка: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader title="Параметры компании" subtitle="Название, валюта, ставки, контакты"
        action={<Button variant="ghost" size="sm" onClick={() => nav('/settings')}><ArrowLeft className="w-4 h-4 mr-1" />Назад</Button>} />

      <div className="p-4 md:p-6 max-w-xl space-y-5">
        {/* Бренд */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2"><Building2 className="w-4 h-4 text-zinc-400" />Бренд</h2>
          <Field label="Название компании">
            <Input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Workarena" />
          </Field>
          <Field label="Подзаголовок" hint="Показывается в шапке и на публичной форме">
            <Input value={f.tagline} onChange={e => set('tagline', e.target.value)} placeholder="CRM временного персонала" />
          </Field>
        </div>

        {/* Деньги */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700">Финансы и ставки</h2>
          <Field label="Валюта">
            <div className="flex gap-2 flex-wrap">
              {CURRENCIES.map(c => (
                <button key={c.code} type="button"
                  onClick={() => setF(p => ({ ...p, currency: c.code, currency_symbol: c.symbol }))}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    f.currency === c.code ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                  {c.code} {c.symbol}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ставка заказчику по умолчанию">
              <Input type="number" value={f.default_client_rate} onChange={e => set('default_client_rate', Number(e.target.value))} />
            </Field>
            <Field label="Ставка сотруднику по умолчанию">
              <Input type="number" value={f.default_employee_rate} onChange={e => set('default_employee_rate', Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Резерв при подборе, %" hint="Сколько людей сверх потребности набирать в резерв (по умолчанию 30%)">
            <Input type="number" min="0" max="100" value={f.reserve_percent} onChange={e => set('reserve_percent', Number(e.target.value))} />
          </Field>
        </div>

        {/* Контакты для публичной формы */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700">Контакты для заявок клиентов</h2>
          <p className="text-xs text-zinc-400 -mt-2">Куда уходят заявки с публичной формы /zayavka</p>
          <Field label="WhatsApp" hint="Международный формат без + и пробелов, напр. 79991234567">
            <Input value={f.manager_whatsapp} onChange={e => set('manager_whatsapp', e.target.value.replace(/\D/g, ''))} placeholder="79991234567" />
          </Field>
          <Field label="Telegram username" hint="Без @, напр. workarena_manager">
            <Input value={f.manager_telegram} onChange={e => set('manager_telegram', e.target.value.replace(/[@\s]/g, ''))} placeholder="workarena_manager" />
          </Field>
        </div>

        <Button onClick={submit} disabled={saving} className="bg-amber-500 hover:bg-amber-600 w-full md:w-auto">
          <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  )
}
