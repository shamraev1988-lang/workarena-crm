import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Надёжность исполнителя — % отказов и индекс надёжности
// Считается из массива смен сотрудника.
// declined = статус no_show ИЛИ checkin_status no_answer/replaced
// ============================================================
export function employeeReliability(shifts = []) {
  const total = shifts.length
  if (!total) return { total: 0, declined: 0, declinePct: 0, level: 'new', reserveSaves: 0 }
  const declined = shifts.filter(s =>
    s.status === 'no_show' ||
    s.checkin_status === 'no_answer' ||
    s.checkin_status === 'replaced'
  ).length
  const reserveSaves = shifts.filter(s => s.is_reserve && s.checkin_status === 'confirmed').length
  const declinePct = Math.round((declined / total) * 100)
  let level = 'good'
  if (declinePct >= 20) level = 'bad'
  else if (declinePct >= 8) level = 'warn'
  return { total, declined, declinePct, level, reserveSaves }
}

export const RELIABILITY_STYLE = {
  new:  { label: 'Новый',     cls: 'bg-zinc-100 text-zinc-500' },
  good: { label: 'Надёжный',  cls: 'bg-emerald-100 text-emerald-700' },
  warn: { label: 'Внимание',  cls: 'bg-amber-100 text-amber-700' },
  bad:  { label: 'Риск',      cls: 'bg-red-100 text-red-700' },
}
