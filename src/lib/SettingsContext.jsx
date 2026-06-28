import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/api/supabase'
import {
  POSITIONS, WORK_TYPES, CITIZENSHIPS, CASH_ACCOUNTS, LEGAL_ENTITIES, EXPENSE_CATEGORIES,
} from '@/lib/constants'
import { CLIENT_PIPELINE, EMPLOYEE_PIPELINE, ORDER_PIPELINE } from '@/lib/pipeline'

// Дефолтные параметры компании
const DEFAULT_COMPANY = {
  name: 'Workarena',
  tagline: 'CRM временного персонала',
  currency: 'RUB',
  currency_symbol: '₽',
  reserve_percent: 30,
  default_client_rate: 0,
  default_employee_rate: 0,
  manager_whatsapp: '',
  manager_telegram: '',
}

// Что именно редактируется. Дефолты тянем из кода — fallback при пустой базе.
function buildDefaults() {
  return {
    company: { ...DEFAULT_COMPANY },
    dict: {
      positions: POSITIONS,
      work_types: WORK_TYPES,
      citizenships: CITIZENSHIPS,
      cash_accounts: CASH_ACCOUNTS,
      legal_entities: LEGAL_ENTITIES,
      expense_categories: EXPENSE_CATEGORIES,
    },
    pipelines: {
      client: CLIENT_PIPELINE,
      employee: EMPLOYEE_PIPELINE,
      order: ORDER_PIPELINE,
    },
  }
}

// Глубокое слияние: сохранённое перекрывает дефолт, но недостающие ключи берутся из дефолта
function mergeDeep(base, override) {
  if (Array.isArray(override)) return override.length ? override : base
  if (override && typeof override === 'object' && !Array.isArray(base)) {
    const out = { ...base }
    for (const k of Object.keys(base)) out[k] = mergeDeep(base[k], override[k])
    // ключи которых нет в base, но есть в override
    for (const k of Object.keys(override)) if (!(k in out)) out[k] = override[k]
    return out
  }
  return override === undefined || override === null ? base : override
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [config, setConfig] = useState(buildDefaults())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('settings').select('data').eq('id', 'main').single()
      if (!error && data?.data) {
        setConfig(mergeDeep(buildDefaults(), data.data))
      }
    } catch (_) {
      // таблицы может не быть до миграции — работаем на дефолтах
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Сохранить произвольную секцию (company / dict / pipelines)
  const save = useCallback(async (next) => {
    const merged = mergeDeep(config, next)
    setConfig(merged) // оптимистично
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 'main', data: merged, updated_at: new Date().toISOString() })
    if (error) throw error
    return merged
  }, [config])

  return (
    <SettingsContext.Provider value={{ config, loading, save, reload: load }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    // Безопасный fallback, если провайдер не обёрнут (напр. публичная страница)
    return { config: buildDefaults(), loading: false, save: async () => {}, reload: async () => {} }
  }
  return ctx
}

// Удобные хелперы — дают актуальные справочники из контекста
export function useDict() { return useSettings().config.dict }
export function useCompany() { return useSettings().config.company }
