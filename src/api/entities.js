/**
 * entities.js — Workarena CRM data layer
 * Замена base44.entities на Supabase
 */
import { supabase } from './supabase'

function makeEntity(tableName) {
  return {
    async list(orderBy = '-created_at', limit = 1000) {
      const col = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy
      const asc = !orderBy.startsWith('-')
      const { data, error } = await supabase
        .from(tableName).select('*')
        .order(col, { ascending: asc }).limit(limit)
      if (error) throw error
      return data
    },
    async get(id) {
      const { data, error } = await supabase
        .from(tableName).select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
    async create(payload) {
      const { data, error } = await supabase
        .from(tableName).insert([payload]).select().single()
      if (error) throw error
      return data
    },
    async update(id, payload) {
      const { data, error } = await supabase
        .from(tableName).update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
      return true
    },
    async filter(filters = {}, orderBy = '-created_at', limit = 1000) {
      const col = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy
      const asc = !orderBy.startsWith('-')
      let query = supabase.from(tableName).select('*')
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value)
        }
      }
      const { data, error } = await query.order(col, { ascending: asc }).limit(limit)
      if (error) throw error
      return data
    },
  }
}

export const entities = {
  Shift:      makeEntity('shifts'),       // Смены / Табель
  Order:      makeEntity('orders'),       // Заявки (заказы)
  Employee:   makeEntity('employees'),    // Сотрудники
  Client:     makeEntity('clients'),      // Заказчики (компании)
  Object:     makeEntity('objects'),      // Объекты (площадки)
  CashFlow:   makeEntity('cash_flows'),   // Финансы / Кассы
  Invoice:    makeEntity('invoices'),     // Счета
  AppRole:    makeEntity('app_roles'),    // Роли пользователей
}
