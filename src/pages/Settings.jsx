import PageHeader from '@/components/layout/PageHeader';
import { LEGAL_ENTITIES, POSITIONS, CASH_ACCOUNTS } from '@/lib/constants';

export default function Settings() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader title="Настройки" subtitle="Справочники и конфигурация" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Юр. лица */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100"><h2 className="font-semibold text-sm">Юридические лица</h2></div>
          <div className="divide-y divide-zinc-50">
            {LEGAL_ENTITIES.map(e => (
              <div key={e.value} className="px-5 py-3 flex justify-between">
                <span className="text-sm font-medium text-zinc-900">{e.label}</span>
                <span className="text-xs text-zinc-500">Налог {(e.tax_rate * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
        {/* Кассы */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100"><h2 className="font-semibold text-sm">Кассы</h2></div>
          <div className="divide-y divide-zinc-50">
            {CASH_ACCOUNTS.map(a => (
              <div key={a.value} className="px-5 py-3 flex justify-between">
                <span className="text-sm font-medium text-zinc-900">{a.label}</span>
                <span className="text-xs text-zinc-400 capitalize">{a.group}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Должности */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100"><h2 className="font-semibold text-sm">Должности</h2></div>
          <div className="grid grid-cols-2 gap-0 divide-y divide-zinc-50">
            {POSITIONS.map(p => (
              <div key={p.value} className="px-5 py-2.5">
                <span className="text-sm text-zinc-700">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-900 mb-2">Workarena CRM</h3>
          <p className="text-sm text-amber-700">Система управления временным персоналом для HoReCa.</p>
          <div className="mt-3 space-y-1 text-xs text-amber-600">
            <div>Supabase: fayisqiadygfhsqzlcei.supabase.co</div>
            <div>Юр. лица: ООО МИРАТ ГРУПП, ИП Соловьева, ИП Солуянов</div>
          </div>
        </div>
      </div>
    </div>
  );
}
