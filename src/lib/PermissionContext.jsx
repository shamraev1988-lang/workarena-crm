import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/api/supabase'
import { getRolePermissions, PRESET_ROLES } from '@/lib/permissions'

const PermissionContext = createContext({ permissions: [], can: () => false, role: null, isOwner: false })

export function PermissionProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [permissions, setPermissions] = useState([])
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPermissions([])
      setRole(null)
      setLoading(false)
      return
    }

    async function loadRole() {
      try {
        const { data } = await supabase
          .from('app_roles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (data) {
          setRole(data)
          // Если это preset роль
          if (data.role && PRESET_ROLES[data.role]) {
            setPermissions(PRESET_ROLES[data.role].permissions)
          } else if (data.permissions && Array.isArray(data.permissions)) {
            // Кастомная роль с permissions массивом
            setPermissions(data.permissions)
          } else {
            // По умолчанию — owner если нет записи (первый пользователь)
            setPermissions(PRESET_ROLES.owner.permissions)
          }
        } else {
          // Нет записи = владелец (первый пользователь системы)
          setPermissions(PRESET_ROLES.owner.permissions)
          setRole({ role: 'owner' })
        }
      } catch {
        setPermissions(PRESET_ROLES.owner.permissions)
        setRole({ role: 'owner' })
      } finally {
        setLoading(false)
      }
    }

    loadRole()
  }, [user, isAuthenticated])

  const can = (permission) => permissions.includes(permission)
  const isOwner = role?.role === 'owner'

  return (
    <PermissionContext.Provider value={{ permissions, can, role, isOwner, loading }}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermission() {
  return useContext(PermissionContext)
}

// Компонент-обёртка для скрытия по праву
export function Can({ permission, children, fallback = null }) {
  const { can } = usePermission()
  return can(permission) ? children : fallback
}
