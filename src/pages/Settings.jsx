import { Link } from 'react-router-dom'
import { Users, Shield, Building2, Wallet, Briefcase, ChevronRight, SlidersHorizontal, GitBranch } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Can } from '@/lib/PermissionContext'
import { useSettings } from '@/lib/SettingsContext'

const SettingCard = ({ icon: Icon, title, desc, to, badge }) => (
  <Link to={to} className="flex items-center gap-4 bg-white rounded-xl border border-zinc-200 px-5 py-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
      <Icon className="w-5 h-5 text-indigo-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-zinc-900 text-sm">{title}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
    </div>
    {badge && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium shrink-0">{badge}</span>}
    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-indigo-400 transition-colors" />
  </Link>
)

export default function Settings() {
  const { config } = useSettings()
  const dict = config.dict

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader title="Настройки" subtitle="Управление системой" />

      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        {/* Доступ */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Доступ</h2>
          <div className="space-y-2">
            <Can permission="settings.users">
              <SettingCard icon={Users} title="Пользователи" desc="Создание, блокировка, смена роли" to="/settings/users" />
            </Can>
            <Can permission="settings.roles">
              <SettingCard icon={Shield} title="Роли и права" desc="Редактор прав доступа по разделам" to="/settings/roles" />
            </Can>
          </div>
        </div>

        {/* Конфигурация */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Конфигурация</h2>
          <div className="space-y-2">
            <SettingCard icon={Building2} title="Параметры компании" desc={`${config.company.name} · ${config.company.currency} · резерв ${config.company.reserve_percent}%`} to="/settings/company" />
            <SettingCard icon={SlidersHorizontal} title="Справочники" desc={`Должности (${dict.positions.length}), кассы (${dict.cash_accounts.length}), типы работ, категории`} to="/settings/dictionaries" />
            <SettingCard icon={GitBranch} title="Воронки" desc={`Этапы клиентов, исполнителей и заявок`} to="/settings/pipelines" />
          </div>
        </div>

        {/* Версия */}
        <div className="text-center text-xs text-zinc-400 pb-4">
          {config.company.name} CRM · Supabase: fayisqiadygfhsqzlcei
        </div>
      </div>
    </div>
  )
}
