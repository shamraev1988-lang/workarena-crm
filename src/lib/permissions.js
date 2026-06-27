// ============================================================
// Workarena — Система прав доступа
// ============================================================

// Список всех возможных прав
export const ALL_PERMISSIONS = {
  // Смены
  'shifts.view':            'Просмотр смен',
  'shifts.view_finance':    'Видеть суммы (маржа, ФОТ, ставки)',
  'shifts.create':          'Создать смену',
  'shifts.edit':            'Редактировать смену',
  'shifts.delete':          'Удалить смену',
  'shifts.export':          'Экспорт в Excel',
  'shifts.invoice':         'Выставить счёт',
  // Сотрудники
  'employees.view':         'Просмотр сотрудников',
  'employees.view_docs':    'Видеть паспортные данные / ИНН',
  'employees.create':       'Добавить сотрудника',
  'employees.edit':         'Редактировать сотрудника',
  'employees.delete':       'Удалить сотрудника',
  // Заказчики
  'clients.view':           'Просмотр заказчиков',
  'clients.view_rates':     'Видеть ставки заказчика',
  'clients.create':         'Добавить заказчика',
  'clients.edit':           'Редактировать заказчика',
  'clients.delete':         'Удалить заказчика',
  // Финансы
  'finance.view':           'Просмотр касс',
  'finance.create':         'Добавить операцию',
  'finance.edit':           'Редактировать операцию',
  'finance.delete':         'Удалить операцию',
  // Аналитика
  'reports.view':           'Просмотр дашборда',
  'reports.view_finance':   'Финансовая аналитика',
  // Настройки
  'settings.users':         'Управление пользователями',
  'settings.roles':         'Управление ролями',
  'settings.view':          'Просмотр настроек',
}

// Предустановленные роли
export const PRESET_ROLES = {
  owner: {
    label: 'Владелец',
    color: '#534AB7',
    permissions: Object.keys(ALL_PERMISSIONS), // все права
  },
  manager: {
    label: 'Менеджер',
    color: '#185FA5',
    permissions: [
      'shifts.view','shifts.view_finance','shifts.create','shifts.edit','shifts.delete','shifts.export','shifts.invoice',
      'employees.view','employees.view_docs','employees.create','employees.edit',
      'clients.view','clients.view_rates','clients.create','clients.edit',
      'finance.view',
      'reports.view','reports.view_finance',
      'settings.view',
    ],
  },
  hr: {
    label: 'HR / Рекрутер',
    color: '#3B6D11',
    permissions: [
      'shifts.view','shifts.create','shifts.edit',
      'employees.view','employees.view_docs','employees.create','employees.edit','employees.delete',
      'reports.view',
      'settings.view',
    ],
  },
  readonly: {
    label: 'Только чтение',
    color: '#888780',
    permissions: [
      'shifts.view',
      'employees.view',
      'clients.view',
      'reports.view',
      'settings.view',
    ],
  },
}

// Получить права из объекта роли
export function getRolePermissions(roleObj) {
  if (!roleObj) return []
  // Если preset
  if (roleObj.preset && PRESET_ROLES[roleObj.preset]) {
    return PRESET_ROLES[roleObj.preset].permissions
  }
  // Если кастомная роль с полем permissions
  return roleObj.permissions || []
}
