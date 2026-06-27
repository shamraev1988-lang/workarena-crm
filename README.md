# EstateFlow CRM — React/Vite + Supabase

CRM для недвижимости. Мигрирован с Base44 на Supabase.

## Быстрый старт

### 1. Создай Supabase проект
- Зайди на [supabase.com](https://supabase.com) → New Project
- Дождись инициализации (~2 мин)

### 2. Запусти миграцию
- Supabase Dashboard → SQL Editor
- Вставь содержимое `supabase-migration.sql` и нажми Run

### 3. Настрой Google Auth (опционально)
- Supabase Dashboard → Authentication → Providers → Google
- Включи и добавь Client ID + Secret из [Google Console](https://console.cloud.google.com)
- В Authorized redirect URIs добавь: `https://xxxx.supabase.co/auth/v1/callback`

### 4. Создай .env
```bash
cp .env.example .env
```
Заполни значениями из Supabase Dashboard → Project Settings → API:
- `VITE_SUPABASE_URL` — Project URL
- `VITE_SUPABASE_ANON_KEY` — anon/public key

### 5. Установи зависимости и запусти
```bash
npm install
npm run dev
```

### 6. Деплой на Netlify
```bash
npm run build
# dist/ → Netlify
```
В Netlify → Site Settings → Environment Variables добавь те же переменные.

## Структура проекта

```
src/
├── api/
│   ├── supabase.js      # Supabase клиент
│   ├── entities.js      # CRUD для всех таблиц (замена base44.entities)
│   └── storage.js       # Загрузка файлов (замена base44.integrations.Core.UploadFile)
├── lib/
│   ├── AuthContext.jsx  # Auth через Supabase (Google + email/password)
│   ├── constants.js     # Все справочники (этапы воронки, типы объектов и т.д.)
│   └── query-client.js  # React Query
├── components/
│   ├── layout/          # Sidebar, AppLayout, PageHeader
│   ├── leads/           # Kanban, LeadCard, LeadDetailDialog, LeadFormDialog, ...
│   ├── properties/      # PropertyCard, PropertyFormDialog, PropertyDetailDialog, ...
│   ├── dashboard/       # StatCard, FunnelChart, RecentActivity
│   ├── reports/         # ReportFormDialog
│   └── settings/        # FunnelStagesSettings, RolesSettings, UsersSettings
├── pages/
│   ├── Dashboard.jsx
│   ├── Leads.jsx        # Kanban + таблица
│   ├── Properties.jsx   # Объекты + владельцы + модерация
│   ├── Activities.jsx
│   ├── Reports.jsx
│   ├── Settings.jsx
│   ├── Catalog.jsx      # Публичный каталог
│   ├── ClientSelection.jsx # Публичная подборка для клиента
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── ForgotPassword.jsx
│   └── ResetPassword.jsx
└── App.jsx
```

## Таблицы Supabase

| Таблица | Описание |
|---------|----------|
| `leads` | Лиды / покупатели |
| `properties` | Объекты недвижимости |
| `activities` | Журнал активности |
| `funnel_stages` | Настройки этапов воронки |
| `app_roles` | Роли пользователей |
| `reports` | Отчёты |

## shadcn/ui компоненты

Проект использует shadcn/ui. Установи компоненты:
```bash
npx shadcn@latest init
npx shadcn@latest add button input label textarea select dialog badge card tabs separator skeleton switch toast toaster sonner
```

Или используй components.json из папки исходного проекта.
