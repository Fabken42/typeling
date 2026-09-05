'use client'

import { create } from 'zustand'
import { api } from '@/lib/client'
import { DEFAULT_SETTINGS, type ClientSettings } from '@/lib/settingsDefaults'

interface SettingsState {
  settings: ClientSettings
  loaded: boolean
  loading: boolean
  load: () => Promise<void>
  hydrate: (settings: ClientSettings) => void
  update: (patch: Partial<ClientSettings>) => Promise<void>
  applyTheme: (theme: ClientSettings['theme']) => void
}

const initial: ClientSettings = { ...DEFAULT_SETTINGS }

function applyThemeToDom(theme: ClientSettings['theme']) {
  if (typeof document === 'undefined') return
  const sysLight = window.matchMedia('(prefers-color-scheme: light)').matches
  const light = theme === 'light' || (theme === 'system' && sysLight)
  document.documentElement.classList.toggle('light', light)
  try {
    localStorage.setItem('typeling-theme', theme)
  } catch {
    /* ignore */
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: initial,
  loaded: false,
  loading: false,

  // Seed settings from server-provided data (avoids a client round trip, e.g.
  // on the play page which is server-rendered).
  hydrate: (settings) => {
    if (get().loaded) return
    set({ settings, loaded: true })
    applyThemeToDom(settings.theme)
  },

  load: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true })
    try {
      const s = await api.get<ClientSettings & { userId?: string }>(
        '/api/settings',
      )
      const { ...settings } = s
      delete (settings as { userId?: string }).userId
      set({ settings: settings as ClientSettings, loaded: true })
      applyThemeToDom((settings as ClientSettings).theme)
    } finally {
      set({ loading: false })
    }
  },

  update: async (patch) => {
    const prev = get().settings
    const optimistic = { ...prev, ...patch }
    set({ settings: optimistic })
    if (patch.theme) applyThemeToDom(patch.theme)
    try {
      const s = await api.patch<ClientSettings & { userId?: string }>(
        '/api/settings',
        patch,
      )
      delete (s as { userId?: string }).userId
      set({ settings: s as ClientSettings })
    } catch (err) {
      set({ settings: prev }) // rollback
      throw err
    }
  },

  applyTheme: applyThemeToDom,
}))
