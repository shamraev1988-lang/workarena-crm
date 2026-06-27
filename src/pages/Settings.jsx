import { Link } from 'react-router-dom'
import { Users, Shield, Building2, Wallet, Briefcase, ChevronRight } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Can } from '@/lib/PermissionContext'
import { LEGAL_ENTITIES, CASH_ACCOUNTS, POSITIONS } from '@/lib/constants'

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
  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader title="Настройки" subtitle="Управление системой" />

      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        {/* Пользователи и роли */}
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

        {/* Справочники */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Справочники</h2>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
            {/* Юр. лица */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-900">Юридические лица</p>
              </div>
              <div className="space-y-1.5">
                {LEGAL_ENTITIES.map(e => (
                  <div key={e.value} className="flex justify-between text-sm">
                    <span className="text-zinc-700">{e.label}</span>
                    <span className="text-zinc-400">Налог {(e.tax_rate * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Кассы */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-900">Кассы</p>
              </div>
              <div className="space-y-1.5">
                {CASH_ACCOUNTS.map(a => (
                  <div key={a.value} className="flex justify-between text-sm">
                    <span className="text-zinc-700">{a.label}</span>
                    <span className="text-zinc-400 capitalize text-xs">{a.group}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Должности */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-900">Должности персонала</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POSITIONS.map(p => (
                  <span key={p.value} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{p.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Версия */}
        <div className="text-center text-xs text-zinc-400 pb-4">
          Workarena CRM · Supabase: fayisqiadygfhsqzlcei
        </div>
      </div>
    </div>
  )
}
