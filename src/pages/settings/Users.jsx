import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/api/supabase'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, Lock, UserCheck, UserX, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Can } from '@/lib/PermissionContext'
import { PRESET_ROLES } from '@/lib/permissions'

const ROLE_COLORS = {
  owner:    'bg-purple-100 text-purple-700',
  manager:  'bg-blue-100 text-blue-700',
  hr:       'bg-green-100 text-green-700',
  readonly: 'bg-zinc-100 text-zinc-600',
}

function UserForm({ user, onClose, customRoles = [] }) {
  const qc = useQueryClient()
  const isEdit = !!user?.id
  const [form, setForm] = useState({
    email: user?.email || '',
    full_name: user?.full_name || '',
    role: user?.role || 'manager',
    password: '',
    send_email: true,
  })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const save = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        // Обновляем роль в app_roles
        const { error } = await supabase
          .from('app_roles')
          .update({ role: data.role, full_name: data.full_name })
          .eq('id', user.id)
        if (error) throw error
        return
      }

      // Создаём нового пользователя через service_role (вызов через Edge Function или напрямую)
      // Используем Admin API через Management endpoint
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY

      if (!SERVICE_KEY) {
        // Fallback: создаём запись в app_roles с email, пользователь сам зарегистрируется
        const { error } = await supabase.from('app_roles').insert({
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          status: 'invited',
        })
        if (error) throw error
        toast.info('Пользователь добавлен. Попросите его зарегистрироваться на сайте.')
        return
      }

      // С service key создаём через Admin API
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password || Math.random().toString(36).slice(-10) + 'Aa1!',
          email_confirm: true,
          user_metadata: { full_name: data.full_name },
        }),
      })
      const newUser = await res.json()
      if (newUser.error) throw new Error(newUser.error)

      // Записываем роль
      await supabase.from('app_roles').upsert({
        user_id: newUser.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        status: 'active',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries(['app-users'])
      toast.success(isEdit ? 'Пользователь обновлён' : 'Пользователь создан')
      onClose()
    },
    onError: e => toast.error('Ошибка: ' + e.message),
  })

  const allRoles = [
    ...Object.entries(PRESET_ROLES).map(([k, v]) => ({ value: k, label: v.label })),
    ...customRoles.map(r => ({ value: r.id, label: r.name })),
  ]

  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate(form) }} className="space-y-4">
      {!isEdit && (
        <div className="space-y-1.5">
          <Label>Email *</Label>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="user@example.com" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Имя / ФИО</Label>
        <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Юлиан Соловьёв" />
      </div>
      <div className="space-y-1.5">
        <Label>Роль *</Label>
        <Select value={form.role} onValueChange={v => set('role', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {allRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {!isEdit && (
        <>
          <div className="space-y-1.5">
            <Label>Пароль (оставьте пустым для авто-генерации)</Label>
            <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.send_email} onCheckedChange={v => set('send_email', v)} />
            <Label>Отправить данные на email</Label>
          </div>
        </>
      )}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
        <Button type="submit" disabled={save.isPending} className="flex-1">
          {save.isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  )
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)

  // Получаем всех пользователей из app_roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['app-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_roles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const toggleBlock = useMutation({
    mutationFn: async (user) => {
      const newStatus = user.status === 'blocked' ? 'active' : 'blocked'
      const { error } = await supabase.from('app_roles').update({ status: newStatus }).eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries(['app-users']); toast.success('Статус обновлён') },
  })

  const deleteUser = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('app_roles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries(['app-users']); toast.success('Удалено') },
  })

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader
        title="Пользователи"
        subtitle={`${users.length} пользователей в системе`}
        action={
          <Can permission="settings.users">
            <Button onClick={() => { setEditUser(null); setFormOpen(true) }} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </Can>
        }
      />

      <div className="p-4 md:p-6">
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-zinc-400">Загрузка...</div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">Нет пользователей</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {users.map(u => {
                const presetRole = PRESET_ROLES[u.role]
                const isBlocked = u.status === 'blocked'
                return (
                  <div key={u.id} className="flex items-center gap-4 px-4 md:px-6 py-4">
                    {/* Аватар */}
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                      {(u.full_name || u.email || '?')[0].toUpperCase()}
                    </div>
                    {/* Инфо */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-zinc-900 text-sm">{u.full_name || '—'}</p>
                        {isBlocked && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Заблокирован</span>}
                        {u.status === 'invited' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Ожидает входа</span>}
                      </div>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </div>
                    {/* Роль */}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium hidden sm:block ${ROLE_COLORS[u.role] || 'bg-zinc-100 text-zinc-600'}`}>
                      {presetRole?.label || u.role}
                    </span>
                    {/* Действия */}
                    <Can permission="settings.users">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditUser(u); setFormOpen(true) }}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleBlock.mutate(u)}
                          title={isBlocked ? 'Разблокировать' : 'Заблокировать'}
                          className={`p-1.5 rounded-lg hover:bg-zinc-100 ${isBlocked ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {isBlocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { if (confirm('Удалить пользователя?')) deleteUser.mutate(u.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Can>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={() => setFormOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Редактировать пользователя' : 'Новый пользователь'}</DialogTitle>
          </DialogHeader>
          <UserForm user={editUser} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
