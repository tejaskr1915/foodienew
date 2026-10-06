import axios from 'axios';

export const PRIMARY_API_URL =
  import.meta.env.VITE_MAIN_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

export const BACKUP_API_URL =
  import.meta.env.VITE_BACKUP_API_URL ||
  '';

// ── Unified token storage helpers ────────────────────────────
export const getAccessToken = () =>
  sessionStorage.getItem('foodie_access_token') ||
  localStorage.getItem('foodie_access_token');

export const getRefreshToken = () =>
  sessionStorage.getItem('foodie_refresh_token') ||
  localStorage.getItem('foodie_refresh_token');

export const setTokens = (access, refresh) => {
  if (access) {
    sessionStorage.setItem('foodie_access_token', access);
    localStorage.setItem('foodie_access_token', access);
  }
  if (refresh) {
    sessionStorage.setItem('foodie_refresh_token', refresh);
    localStorage.setItem('foodie_refresh_token', refresh);
  }
};

export const clearTokens = () => {
  ['foodie_access_token', 'foodie_refresh_token',
   'foodie_token_admin', 'foodie_token_customer',
   'foodie_auth_admin', 'foodie_auth_customer'].forEach(k => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  });
};

const api = axios.create({
  baseURL: PRIMARY_API_URL.replace(/\/+$/, ''),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// ── Request Interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API REQUEST ERROR]', error);
    return Promise.reject(error);
  }
);

// ── Token refresh state ──────────────────────────────────────

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

const onRefreshFailed = () => {
  refreshSubscribers.forEach(cb => cb(null));
  refreshSubscribers = [];
};

const subscribeToRefresh = (cb) => refreshSubscribers.push(cb);

const handleAuthFailure = () => {
  clearTokens();
  try { window.dispatchEvent(new CustomEvent('foodie_logout')); } catch(e) {}
  if (window.location.pathname !== '/login' && window.location.pathname !== '/customer/welcome' && window.location.pathname !== '/') {
    window.location.href = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/employee') ? '/login' : '/customer/welcome';
  }
};

// ── Response Interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'state' in response.data && 'data' in response.data) {
      response.apiEnvelope = response.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Skip refresh for auth endpoints to prevent loops
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        handleAuthFailure();
        return Promise.reject(error);
      }

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        handleAuthFailure();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(resolve => {
          subscribeToRefresh((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              resolve(Promise.reject(error));
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(`${PRIMARY_API_URL.replace(/\/+$/, '')}/auth/refresh/`, {
          refresh: refreshToken
        });
        
        const newAccess = refreshResponse.data?.data?.access || refreshResponse.data?.access;
        if (!newAccess) throw new Error("No access token in refresh response");
        
        setTokens(newAccess, refreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        
        onRefreshed(newAccess);
        return api(originalRequest);
      } catch (refreshError) {
        onRefreshFailed();
        handleAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// -- GET deduplication & caching ------------------------------
const originalGet = api.get.bind(api);
const pendingGetRequests = new Map();
const cacheGetStore = new Map();
const DEFAULT_CACHE_TTL = 4000;

export const clearApiCache = () => cacheGetStore.clear();

api.get = function (url, config = {}) {
  // Only cache if explicit opt-in (optional, or default to all)
  // We'll just deduplicate pending requests to stop floods.
  const cacheKey = url + JSON.stringify(config.params || {});
  
  if (pendingGetRequests.has(cacheKey)) {
    return pendingGetRequests.get(cacheKey);
  }
  
  const promise = originalGet(url, config).finally(() => {
    pendingGetRequests.delete(cacheKey);
  });
  
  pendingGetRequests.set(cacheKey, promise);
  return promise;
};
