import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'peak_offline_store'
const DB_VERSION = 1

export interface OfflineData {
  id: string
  type: 'timetable' | 'assignment' | 'profile' | 'notifications'
  data: any
  updated_at: string
}

export const initDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'id' })
      }
    },
  })
}

export const saveToCache = async (id: string, type: OfflineData['type'], data: any) => {
  const db = await initDB()
  await db.put('cache', {
    id: `${type}_${id}`,
    type,
    data,
    updated_at: new Date().toISOString()
  })
}

export const getFromCache = async (id: string, type: OfflineData['type']) => {
  const db = await initDB()
  return db.get('cache', `${type}_${id}`)
}

export const getAllByType = async (type: OfflineData['type']) => {
  const db = await initDB()
  const all = await db.getAll('cache')
  return all.filter(item => item.type === type)
}

export const clearCache = async () => {
  const db = await initDB()
  await db.clear('cache')
}
