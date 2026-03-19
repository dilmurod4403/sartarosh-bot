import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

// Telegram WebApp initData ni header ga qo'shamiz
const getInitData = () => {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  // Dev rejimi uchun mock
  return import.meta.env.VITE_MOCK_INIT_DATA ?? "";
};

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  config.headers["x-telegram-init-data"] = getInitData();
  return config;
});

export default api;

export const getMe = () => api.get("/me");
export const getSalon = () => api.get("/salon");

// Zakazlar
export const getAppointments = (params?: { date?: string; status?: string }) =>
  api.get("/appointments", { params });
export const getStats = (params?: { date?: string }) => api.get("/appointments/stats", { params });
export const updateAppointment = (id: number, data: object) =>
  api.patch(`/appointments/${id}`, data);

// Jadval
export const getSchedule = () => api.get("/schedule");
export const updateSchedule = (data: object) => api.put("/schedule", data);

// Sartaroshlar (admin)
export const getBarbers = (salonId?: number) =>
  api.get("/barbers", { params: salonId ? { salonId } : undefined });
export const updateBarber = (id: number, data: object) => api.patch(`/barbers/${id}`, data);
export const addBarber = (data: object) => api.post("/barbers", data);

// Salonlar (admin)
export const getSalons = () => api.get("/salons");
export const createSalon = (data: object) => api.post("/salons", data);
export const updateSalon = (id: number, data: object) => api.put(`/salons/${id}`, data);
export const addAdmin = (data: object) => api.post("/admins", data);
