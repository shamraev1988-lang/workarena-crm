// ============================================================
// Workarena CRM — Справочники
// ============================================================

// Должности персонала
export const POSITIONS = [
  { value: 'waiter', label: 'Официант' },
  { value: 'bartender', label: 'Бармен' },
  { value: 'cook', label: 'Повар' },
  { value: 'sous_chef', label: 'Су-шеф' },
  { value: 'cashier', label: 'Кассир' },
  { value: 'cleaning', label: 'Клининг' },
  { value: 'dishwasher', label: 'Посудомойщик' },
  { value: 'hostess', label: 'Хостес' },
  { value: 'manager', label: 'Менеджер зала' },
  { value: 'runner', label: 'Раннер' },
  { value: 'other', label: 'Другое' },
]

// Типы работ
export const WORK_TYPES = [
  { value: 'banquet', label: 'Банкет' },
  { value: 'regular', label: 'Регулярная смена' },
  { value: 'event', label: 'Мероприятие' },
  { value: 'catering', label: 'Кейтеринг' },
  { value: 'opening', label: 'Открытие' },
  { value: 'cleaning_service', label: 'Клининговая услуга' },
  { value: 'other', label: 'Другое' },
]

// Гражданство
export const CITIZENSHIPS = [
  { value: 'russia', label: 'Россия' },
  { value: 'ukraine', label: 'Украина' },
  { value: 'belarus', label: 'Беларусь' },
  { value: 'kazakhstan', label: 'Казахстан' },
  { value: 'uzbekistan', label: 'Узбекистан' },
  { value: 'kyrgyzstan', label: 'Кыргызстан' },
  { value: 'tajikistan', label: 'Таджикистан' },
  { value: 'armenia', label: 'Армения' },
  { value: 'azerbaijan', label: 'Азербайджан' },
  { value: 'moldova', label: 'Молдова' },
  { value: 'other', label: 'Другое' },
]

// Статусы смены
export const SHIFT_STATUSES = [
  { value: 'planned', label: 'Запланирована', color: 'bg-blue-100 text-blue-700' },
  { value: 'confirmed', label: 'Подтверждена', color: 'bg-violet-100 text-violet-700' },
  { value: 'in_progress', label: 'В работе', color: 'bg-amber-100 text-amber-700' },
  { value: 'completed', label: 'Выполнена', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelled', label: 'Отменена', color: 'bg-red-100 text-red-700' },
  { value: 'no_show', label: 'Не вышел', color: 'bg-slate-100 text-slate-600' },
]

// Статусы оплаты от заказчика
export const PAYMENT_STATUSES = [
  { value: 'not_invoiced', label: 'Счёт не выставлен', color: 'bg-slate-100 text-slate-600' },
  { value: 'invoiced', label: 'Счёт выставлен', color: 'bg-blue-100 text-blue-700' },
  { value: 'paid', label: 'Оплачено', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'overdue', label: 'Просрочка', color: 'bg-red-100 text-red-700' },
  { value: 'partial', label: 'Частично', color: 'bg-amber-100 text-amber-700' },
]

// Статусы выплаты сотруднику
export const PAYOUT_STATUSES = [
  { value: 'pending', label: 'Не выплачено', color: 'bg-slate-100 text-slate-600' },
  { value: 'paid_cash', label: 'Наличными', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'paid_console', label: 'Через Консоль', color: 'bg-violet-100 text-violet-700' },
  { value: 'paid_transfer', label: 'Переводом', color: 'bg-blue-100 text-blue-700' },
]

// Кассы
export const CASH_ACCOUNTS = [
  { value: 'cash', label: 'Наличная касса', group: 'cash' },
  { value: 'console', label: 'Касса Консоль', group: 'platform' },
  { value: 'mират_bank', label: 'ООО МИРАТ ГРУПП', group: 'bank' },
  { value: 'solovieva_bank', label: 'ИП Соловьева', group: 'bank' },
  { value: 'soluyanov_bank', label: 'ИП Солуянов', group: 'bank' },
]

// Юридические лица (исполнитель)
export const LEGAL_ENTITIES = [
  { value: 'mират', label: 'ООО МИРАТ ГРУПП', tax_rate: 0.06 },
  { value: 'solovieva', label: 'ИП Соловьева', tax_rate: 0.06 },
  { value: 'soluyanov', label: 'ИП Солуянов', tax_rate: 0.05 },
]

// Типы операций кассы
export const CASH_FLOW_TYPES = [
  { value: 'income', label: 'Приход', color: 'text-emerald-600' },
  { value: 'expense', label: 'Расход', color: 'text-red-600' },
  { value: 'transfer', label: 'Перевод между кассами', color: 'text-blue-600' },
]

// Категории расходов
export const EXPENSE_CATEGORIES = [
  { value: 'salary_employee', label: 'Выплата сотруднику' },
  { value: 'salary_hr', label: 'Зарплата HR' },
  { value: 'tax', label: 'Налоги' },
  { value: 'console_commission', label: 'Комиссия Консоль' },
  { value: 'transfer_commission', label: 'Комиссия за перевод' },
  { value: 'operational', label: 'Операционные расходы' },
  { value: 'other', label: 'Прочее' },
]

// Оценки работы
export const RATINGS = [
  { value: 5, label: '★★★★★ Отлично' },
  { value: 4, label: '★★★★☆ Хорошо' },
  { value: 3, label: '★★★☆☆ Нормально' },
  { value: 2, label: '★★☆☆☆ Плохо' },
  { value: 1, label: '★☆☆☆☆ Ужасно' },
]
