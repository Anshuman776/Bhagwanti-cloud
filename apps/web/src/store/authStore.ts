import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface UserProfile {
  id: string
  email: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, refreshToken: string, user: UserProfile) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (accessToken, refreshToken, user) => 
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => 
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false
        })
    }),
    {
      name: "bhagwanti-auth-store"
    }
  )
)
