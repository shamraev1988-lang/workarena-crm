// ============================================================
// Workarena — Воронки продаж
// ============================================================

// ВОРОНКА КЛИЕНТОВ (8 этапов)
export const CLIENT_PIPELINE = [
  {
    value: 'new_lead',
    label: 'Новый лид',
    color: 'bg-zinc-100 text-zinc-600',
    dot: 'bg-zinc-400',
    icon: '🎯',
    description: 'Контакт получен, не квалифицирован'
  },
  {
    value: 'first_contact',
    label: 'Первичный контакт',
    color: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-400',
    icon: '📞',
    description: 'Связались, выявляем потребность'
  },
  {
    value: 'request_accepted',
    label: 'Заявка принята',
    color: 'bg-indigo-100 text-indigo-700',
    dot: 'bg-indigo-500',
    icon: '📋',
    description: 'КП отправлено, ждём решения'
  },
  {
    value: 'in_work',
    label: 'В работе (подбор)',
    color: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
    icon: '🔍',
    description: 'Договор подписан, подбираем людей'
  },
  {
    value: 'on_site',
    label: 'Выход на объект',
    color: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    icon: '🚀',
    description: 'Первый выход, момент истины'
  },
  {
    value: 'in_progress',
    label: 'В процессе (работает)',
    color: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    icon: '✅',
    description: 'Регулярная работа, клиент активен'
  },
  {
    value: 'closed_success',
    label: 'Закрыто успешно',
    color: 'bg-green-100 text-green-700',
    dot: 'bg-green-600',
    icon: '🏆',
    description: 'Долгосрочный якорный клиент'
  },
  {
    value: 'problematic',
    label: 'Проблемный клиент',
    color: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    icon: '⚠️',
    description: 'Рекламация или задолженность'
  },
]

// ВОРОНКА ИСПОЛНИТЕЛЕЙ (8 статусов)
export const EMPLOYEE_PIPELINE = [
  {
    value: 'new_response',
    label: 'Новый отклик',
    color: 'bg-zinc-100 text-zinc-600',
    dot: 'bg-zinc-400',
    icon: '📩',
    description: 'Принят отклик, не прозвонен'
  },
  {
    value: 'contact_established',
    label: 'Контакт установлен',
    color: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-400',
    icon: '📱',
    description: 'Поговорили, выявили специализацию'
  },
  {
    value: 'docs_verified',
    label: 'Документы проверены',
    color: 'bg-indigo-100 text-indigo-700',
    dot: 'bg-indigo-500',
    icon: '📄',
    description: 'Паспорт, мед.книжка, ИНН СЗ'
  },
  {
    value: 'ready_to_go',
    label: 'Готов к выходу',
    color: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
    icon: '✋',
    description: 'В пуле резерва, подтверждён'
  },
  {
    value: 'on_site',
    label: 'На объекте',
    color: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    icon: '🏨',
    description: 'Работает прямо сейчас'
  },
  {
    value: 'verified_on_site',
    label: 'Проверен на объекте',
    color: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    icon: '⭐',
    description: '1+ смена, оценка от клиента ≥8'
  },
  {
    value: 'trusted_employee',
    label: 'Проверенный сотрудник',
    color: 'bg-green-100 text-green-700',
    dot: 'bg-green-600',
    icon: '🌟',
    description: '3+ смены, приоритет при подборе'
  },
  {
    value: 'blacklist',
    label: 'Чёрный список',
    color: 'bg-red-100 text-red-700',
    dot: 'bg-red-600',
    icon: '🚫',
    description: 'Невыход / нарушение / алкоголь'
  },
]

export const getClientStage = (value) => CLIENT_PIPELINE.find(s => s.value === value) || CLIENT_PIPELINE[0]
export const getEmployeeStage = (value) => EMPLOYEE_PIPELINE.find(s => s.value === value) || EMPLOYEE_PIPELINE[0]

// ============================================================
// ВОРОНКА ЗАЯВКИ (7 этапов) — операционка, связывает клиента и смены
// ============================================================
export const ORDER_PIPELINE = [
  { value: 'new',      label: 'Новая заявка',      color: 'bg-zinc-100 text-zinc-600',     dot: 'bg-zinc-400',    icon: '📥', description: 'Запрос клиента: дата, объект, должности' },
  { value: 'staffing', label: 'Подбор',            color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',    icon: '🔍', description: 'Набираем людей + резерв 30%' },
  { value: 'assigned', label: 'Назначены',         color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500',  icon: '✅', description: 'Все исполнители подтвердили выход' },
  { value: 'checkin',  label: 'Прозвон-чекин',     color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500',  icon: '📞', description: 'За 2 часа до смены — обзвонили всех' },
  { value: 'on_shift', label: 'На смене',          color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500',   icon: '🏨', description: 'Чекин выполнен, люди на объекте' },
  { value: 'done',     label: 'Завершена',         color: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500', icon: '🏁', description: 'Чекаут, часы зафиксированы' },
  { value: 'closed',   label: 'Закрыта',           color: 'bg-green-100 text-green-700',    dot: 'bg-green-600',   icon: '🏆', description: 'Оплата + выплаты + оценки' },
]

export const getOrderStage = (value) => ORDER_PIPELINE.find(s => s.value === value) || ORDER_PIPELINE[0]

// Статусы прозвона-чекина
export const CHECKIN_STATUSES = [
  { value: 'pending',   label: 'Не прозвонен', color: 'bg-zinc-100 text-zinc-500',     dot: 'bg-zinc-300',  icon: '⏳' },
  { value: 'confirmed', label: 'Подтвердил',   color: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500',icon: '✓' },
  { value: 'no_answer', label: 'Не дозвонился', color: 'bg-red-100 text-red-700',       dot: 'bg-red-500',   icon: '✗' },
  { value: 'replaced',  label: 'Заменён',      color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500', icon: '↻' },
]
export const getCheckinStatus = (value) => CHECKIN_STATUSES.find(s => s.value === value) || CHECKIN_STATUSES[0]
