import { useState } from 'react'
import { Plus, Shield, ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Can, usePermission } from '@/lib/PermissionContext'
import { ALL_PERMISSIONS, PRESET_ROLES } from '@/lib/permissions'

// Группировка прав по разделам
const PERMISSION_GROUPS = [
  { label: 'Смены / Табель', keys: ['shifts.view','shifts.view_finance','shifts.create','shifts.edit','shifts.delete','shifts.export','shifts.invoice'] },
  { label: 'Сотрудники', keys: ['employees.view','employees.view_docs','employees.create','employees.edit','employees.delete'] },
  { label: 'Заказчики', keys: ['clients.view','clients.view_rates','clients.create','clients.edit','clients.delete'] },
  { label: 'Финансы / Кассы', keys: ['finance.view','finance.create','finance.edit','finance.delete'] },
  { label: 'Аналитика', keys: ['reports.view','reports.view_finance'] },
  { label: 'Настройки', keys: ['settings.view','settings.users','settings.roles'] },
]

function RoleEditor({ role, onSave, onCancel }) {
  const [name, setName] = useState(role?.name || '')
  const [perms, setPerms] = useState(new Set(role?.permissions || []))
  const [expanded, setExpanded] = useState({})

  const toggle = (key) => {
    setPerms(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleGroup = (keys) => {
    const allChecked = keys.every(k => perms.has(k))
    setPerms(prev => {
      const next = new Set(prev)
      keys.forEach(k => allChecked ? next.delete(k) : next.add(k))
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название роли</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Старший менеджер" />
      </div>

      <div className="space-y-2">
        {PERMISSION_GROUPS.map(group => {
          const allChecked = group.keys.every(k => perms.has(k))
          const someChecked = group.keys.some(k => perms.has(k))
          const isOpen = expanded[group.label]
          return (
            <div key={group.label} className="border border-zinc-200 rounded-xl overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 cursor-pointer"
                onClick={() => setExpanded(p => ({ ...p, [group.label]: !p[group.label] }))}>
                <div onClick={e => { e.stopPropagation(); toggleGroup(group.keys) }}>
                  <Switch checked={allChecked} />
                </div>
                <span className="text-sm font-medium text-zinc-800 flex-1">{group.label}</span>
                <span className="text-xs text-zinc-400">{group.keys.filter(k => perms.has(k)).length}/{group.keys.length}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </div>
              {/* Individual permissions */}
              {isOpen && (
                <div className="divide-y divide-zinc-100">
                  {group.keys.map(key => (
                    <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                      <Switch checked={perms.has(key)} onCheckedChange={() => toggle(key)} />
                      <span className="text-sm text-zinc-700">{ALL_PERMISSIONS[key]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Preview */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
        <p className="text-xs font-semibold text-blue-700 mb-1">Итого прав: {perms.size} из {Object.keys(ALL_PERMISSIONS).length}</p>
        <div className="flex flex-wrap gap-1">
          {[...perms].map(p => (
            <span key={p} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{ALL_PERMISSIONS[p]}</span>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Отмена</Button>
        <Button onClick={() => onSave({ name, permissions: [...perms] })} className="flex-1" disabled={!name.trim()}>
          Сохранить роль
        </Button>
      </div>
    </div>
  )
}

export default function RolesPage() {
  const { can } = usePermission()
  const [customRoles, setCustomRoles] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | role object
  const [expandedPreset, setExpandedPreset] = useState(null)

  function saveCustomRole(data) {
    if (editing === 'new') {
      setCustomRoles(p => [...p, { ...data, id: Date.now().toString() }])
      toast.success('Роль создана')
    } else {
      setCustomRoles(p => p.map(r => r.id === editing.id ? { ...r, ...data } : r))
      toast.success('Роль обновлена')
    }
    setEditing(null)
  }

  if (editing) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <PageHeader
          title={editing === 'new' ? 'Новая роль' : `Редактировать: ${editing.name}`}
          action={<Button variant="outline" size="sm" onClick={() => setEditing(null)}>← Назад</Button>}
        />
        <div className="p-4 md:p-6 max-w-2xl">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <RoleEditor
              role={editing === 'new' ? null : editing}
              onSave={saveCustomRole}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Роли и права"
        subtitle="Управление доступом к разделам CRM"
        action={
          <Can permission="settings.roles">
            <Button onClick={() => setEditing('new')} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Новая роль
            </Button>
          </Can>
        }
      />

      <div className="p-4 md:p-6 space-y-6 max-w-3xl">
        {/* Preset roles */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Системные роли</h2>
          <div className="space-y-2">
            {Object.entries(PRESET_ROLES).map(([key, role]) => {
              const isOpen = expandedPreset === key
              return (
                <div key={key} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedPreset(isOpen ? null : key)}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: role.color }} />
                    <span className="font-medium text-sm text-zinc-900 flex-1">{role.label}</span>
                    <span className="text-xs text-zinc-400">{role.permissions.length} прав</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-3 border-t border-zinc-100 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {PERMISSION_GROUPS.map(group => {
                          const active = group.keys.filter(k => role.permissions.includes(k))
                          if (active.length === 0) return null
                          return (
                            <div key={group.label} className="text-xs">
                              <p className="font-medium text-zinc-600 mb-1">{group.label}</p>
                              {active.map(k => (
                                <p key={k} className="text-zinc-400 pl-2">✓ {ALL_PERMISSIONS[k]}</p>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                      <Can permission="settings.roles">
                        <Button variant="outline" size="sm" className="mt-3"
                          onClick={() => setEditing({ ...role, name: role.label + ' (копия)', permissions: [...role.permissions] })}>
                          <Copy className="w-3.5 h-3.5 mr-1.5" /> Клонировать как кастомную
                        </Button>
                      </Can>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Custom roles */}
        {customRoles.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">Кастомные роли</h2>
            <div className="space-y-2">
              {customRoles.map(role => (
                <div key={role.id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center gap-3">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900">{role.name}</p>
                    <p className="text-xs text-zinc-400">{role.permissions?.length || 0} прав</p>
                  </div>
                  <Can permission="settings.roles">
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(role)} className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => { if (confirm('Удалить роль?')) setCustomRoles(p => p.filter(r => r.id !== role.id)) }}
                        className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Can>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
