import { nsKey } from './auth'

let _currentUser = null

export function setCurrentUser(user) { _currentUser = user }
export function getCurrentUser()     { return _currentUser }

// storageGet returns parsed object (array/object), or null
export function storageGet(key) {
  try {
    const raw = localStorage.getItem(nsKey(_currentUser, key))
    if (raw === null) return null
    return JSON.parse(raw)
  } catch { return null }
}

// storageSet accepts object/array directly
export function storageSet(key, value) {
  try {
    localStorage.setItem(nsKey(_currentUser, key), JSON.stringify(value))
  } catch {}
}

export function storageRemove(key) {
  try { localStorage.removeItem(nsKey(_currentUser, key)) } catch {}
}
