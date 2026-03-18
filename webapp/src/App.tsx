import { useEffect, useState } from "react";
import { getMe } from "./api";
import AppointmentsPage from "./pages/AppointmentsPage";
import SchedulePage from "./pages/SchedulePage";
import BarbersPage from "./pages/BarbersPage";
import SalonsPage from "./pages/SalonsPage";
import "./App.css";

type Tab = "appointments" | "schedule" | "barbers" | "salons";

interface Me {
  id: number;
  name: string;
  role: "ADMIN" | "BARBER" | "CLIENT";
  salonId: number;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initData: string;
      };
    };
  }
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>("appointments");
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    getMe()
      .then((r) => setMe(r.data))
      .catch((e) => setError(`Xato: ${e?.response?.data?.error ?? e?.message ?? "Noma'lum xato"}`));
  }, []);

  if (error) return <div className="error-screen">{error}</div>;
  if (!me) return <div className="loading-screen">Yuklanmoqda...</div>;

  return (
    <div className="app">
      <header className="header">
        <h1>💈 Admin Panel</h1>
        <span className="role-badge">
          {me.role === "ADMIN" ? "Administrator" : "Sartarosh"} — {me.name}
        </span>
      </header>

      <nav className="tabs">
        <button
          className={tab === "appointments" ? "tab active" : "tab"}
          onClick={() => setTab("appointments")}
        >
          📋 Zakazlar
        </button>
        {me.role === "BARBER" && (
          <button
            className={tab === "schedule" ? "tab active" : "tab"}
            onClick={() => setTab("schedule")}
          >
            🗓 Jadval
          </button>
        )}
        {me.role === "ADMIN" && (
          <button
            className={tab === "salons" ? "tab active" : "tab"}
            onClick={() => setTab("salons")}
          >
            🏪 Salonlar
          </button>
        )}
        {me.role === "ADMIN" && (
          <button
            className={tab === "barbers" ? "tab active" : "tab"}
            onClick={() => setTab("barbers")}
          >
            👤 Sartaroshlar
          </button>
        )}
      </nav>

      <main className="content">
        {tab === "appointments" && <AppointmentsPage role={me.role} />}
        {tab === "schedule" && <SchedulePage />}
        {tab === "salons" && me.role === "ADMIN" && <SalonsPage />}
        {tab === "barbers" && me.role === "ADMIN" && <BarbersPage />}
      </main>
    </div>
  );
}
