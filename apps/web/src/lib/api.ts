import { useAuthStore } from "../store/authStore"

const BASE_URL = "http://localhost:8000/api/v1" // Dev uvicorn backend port

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

async function refreshSession(): Promise<string | null> {
  const store = useAuthStore.getState()
  if (!store.refreshToken) return null

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: store.refreshToken })
    })

    if (!response.ok) {
      // Refresh token is expired or invalid -> log out
      store.clearAuth()
      return null
    }

    const data = await response.json()
    store.setAuth(data.access_token, data.refresh_token, store.user!)
    return data.access_token
  } catch (error) {
    console.error("Failed to refresh session", error)
    return null
  }
}

export async function apiClient(endpoint: string, options: RequestOptions = {}): Promise<any> {
  const { skipAuth, headers, ...rest } = options
  const store = useAuthStore.getState()
  
  const requestHeaders = new Headers(headers)
  if (!requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json")
  }

  // Inject Access Token
  if (!skipAuth && store.accessToken) {
    requestHeaders.set("Authorization", `Bearer ${store.accessToken}`)
  }

  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

  try {
    let response = await fetch(url, {
      ...rest,
      headers: requestHeaders
    })

    // Auto-refresh interceptor on 401 Unauthorized
    if (response.status === 401 && !skipAuth && store.refreshToken) {
      const newAccessToken = await refreshSession()
      if (newAccessToken) {
        requestHeaders.set("Authorization", `Bearer ${newAccessToken}`)
        // Retry original request
        response = await fetch(url, {
          ...rest,
          headers: requestHeaders
        })
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Request failed with status ${response.status}`)
    }

    // Return JSON data or empty object if 204 No Content
    if (response.status === 204) return {}
    return await response.json()
  } catch (error) {
    // Suppress console.error here to avoid aggressive Next.js dev server error overlays
    // for expected connection failures (e.g. Docker daemon offline)
    throw error
  }
}

export const api = {
  get: (endpoint: string, options?: RequestOptions) => 
    apiClient(endpoint, { ...options, method: "GET" }),
  post: (endpoint: string, body: any, options?: RequestOptions) => 
    apiClient(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: (endpoint: string, body: any, options?: RequestOptions) => 
    apiClient(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
  delete: (endpoint: string, options?: RequestOptions) => 
    apiClient(endpoint, { ...options, method: "DELETE" })
}
