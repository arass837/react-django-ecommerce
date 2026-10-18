
import axios from "axios";


// ============================================================
// KONFIGURACJA POŁĄCZENIA Z DJANGO REST FRAMEWORK
// ============================================================

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000/api/",
});


// ============================================================
// PUBLICZNE ENDPOINTY - BEZ LOGOWANIA
// ============================================================

const isPublicRequest = (config) => {

  const method = (config.method || "get").toLowerCase();

  const path = (config.url || "")
    .split("?")[0]
    .replace(/^\/+/, "");

  // Publiczne pobieranie produktów i kategorii
  if (method === "get") {

    if (path === "products/") {
      return true;
    }

    if (/^products\/\d+\/$/.test(path)) {
      return true;
    }

    if (path === "categories/") {
      return true;
    }
  }

  return false;
};


// ============================================================
// INTERCEPTOR - AUTOMATYCZNE DODAWANIE TOKENU JWT
// ============================================================

api.interceptors.request.use(
  (config) => {

    // Produkty i kategorie dostępne dla wszystkich
    if (isPublicRequest(config)) {

      delete config.headers.Authorization;

      return config;
    }

    // Pobranie tokenu zalogowanego użytkownika
    const token = localStorage.getItem("access");

    // Dodanie JWT tylko do pozostałych żądań
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => Promise.reject(error)
);


// ============================================================
// EKSPORT INSTANCJI AXIOS
// ============================================================

export default api;
