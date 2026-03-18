import { useEffect, useState } from "react";
import { getAppointments, getStats, updateAppointment } from "../api";
import api from "../api";
import dayjs from "dayjs";

interface Appointment {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  cancelReason?: string;
  client: { name: string; phone?: string };
  barber: { id: number; user: { name: string } };
}

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "⏳ Kutilmoqda",
  CONFIRMED: "✅ Tasdiqlandi",
  RESCHEDULED: "🔄 Ko'chirildi",
  CANCELLED: "❌ Bekor",
  COMPLETED: "✔️ Bajarildi",
};

export default function AppointmentsPage({ role }: { role: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState<{ id: number } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleModal, setRescheduleModal] = useState<{ id: number; barberId: number } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(dayjs().add(1, "day").format("YYYY-MM-DD"));
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [apptRes, statsRes] = await Promise.all([
      getAppointments(selectedDate ? { date: selectedDate } : {}),
      getStats(),
    ]);
    setAppointments(apptRes.data);
    setStats(statsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedDate]);

  const loadSlots = async (barberId: number, date: string) => {
    setSlotsLoading(true);
    const res = await api.get("/slots", { params: { barberId, date } });
    setSlots(res.data);
    setSlotsLoading(false);
  };

  const handleConfirm = async (id: number) => {
    await updateAppointment(id, { status: "CONFIRMED" });
    load();
  };

  const handleCancel = async () => {
    if (!cancelModal || !cancelReason.trim()) return;
    await updateAppointment(cancelModal.id, { status: "CANCELLED", cancelReason });
    setCancelModal(null);
    setCancelReason("");
    load();
  };

  const handleReschedule = async (time: string) => {
    if (!rescheduleModal) return;
    const newStartTime = dayjs(`${rescheduleDate} ${time}`).toISOString();
    await updateAppointment(rescheduleModal.id, { newStartTime });
    setRescheduleModal(null);
    load();
  };

  const openReschedule = (appt: Appointment) => {
    setRescheduleModal({ id: appt.id, barberId: appt.barber.id });
    const date = dayjs().add(1, "day").format("YYYY-MM-DD");
    setRescheduleDate(date);
    loadSlots(appt.barber.id, date);
  };

  const canAction = (status: string) =>
    status !== "CANCELLED" && status !== "COMPLETED";

  return (
    <div className="page">
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Jami</span>
          </div>
          <div className="stat-card confirmed">
            <span className="stat-num">{stats.confirmed}</span>
            <span className="stat-label">Tasdiqlangan</span>
          </div>
          <div className="stat-card pending">
            <span className="stat-num">{stats.pending}</span>
            <span className="stat-label">Kutilmoqda</span>
          </div>
          <div className="stat-card cancelled">
            <span className="stat-num">{stats.cancelled}</span>
            <span className="stat-label">Bekor</span>
          </div>
        </div>
      )}

      <input
        type="date"
        className="date-picker"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        placeholder="Barcha kelgusi zakazlar"
      />
      {selectedDate && (
        <button className="btn-cancel" style={{ marginBottom: 8 }} onClick={() => setSelectedDate("")}>
          ✕ Filterni olib tashlash
        </button>
      )}

      {loading ? (
        <p className="center">Yuklanmoqda...</p>
      ) : appointments.length === 0 ? (
        <p className="center">{selectedDate ? "Bu kunda zakaz yo'q" : "Kelgusi zakaz yo'q"}</p>
      ) : (
        <div className="appt-list">
          {appointments.map((a) => (
            <div key={a.id} className={`appt-card status-${a.status.toLowerCase()}`}>
              <div className="appt-time">
                {dayjs(a.startTime).format("DD.MM HH:mm")} — {dayjs(a.endTime).format("HH:mm")}
              </div>
              <div className="appt-info">
                <strong>{a.client.name}</strong>
                {a.client.phone && <span className="phone"> · {a.client.phone}</span>}
                {role === "ADMIN" && (
                  <div className="barber-name">💈 {a.barber.user.name}</div>
                )}
              </div>
              <div className="appt-status">{STATUS_LABELS[a.status] ?? a.status}</div>

              {canAction(a.status) && (
                <div className="appt-actions">
                  {a.status === "PENDING" && (
                    <button className="btn-confirm" onClick={() => handleConfirm(a.id)}>
                      ✅ Tasdiqlash
                    </button>
                  )}
                  <button className="btn-reschedule" onClick={() => openReschedule(a)}>
                    🔄 Vaqt o'zgartirish
                  </button>
                  <button className="btn-cancel" onClick={() => setCancelModal({ id: a.id })}>
                    ❌ Bekor qilish
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <div className="modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Bekor qilish sababi</h3>
            <textarea
              placeholder="Sababini yozing..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setCancelModal(null)}>Ortga</button>
              <button className="btn-confirm" onClick={handleCancel}>Tasdiqlash</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleModal && (
        <div className="modal-overlay" onClick={() => setRescheduleModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Yangi vaqt tanlash</h3>
            <input
              type="date"
              className="date-picker"
              value={rescheduleDate}
              min={dayjs().add(1, "day").format("YYYY-MM-DD")}
              onChange={(e) => {
                setRescheduleDate(e.target.value);
                loadSlots(rescheduleModal.barberId, e.target.value);
              }}
            />
            {slotsLoading ? (
              <p className="center">Yuklanmoqda...</p>
            ) : slots.length === 0 ? (
              <p className="center">Bu kunda bo'sh vaqt yo'q</p>
            ) : (
              <div className="slots-grid">
                {slots.map((slot) => (
                  <button key={slot} className="btn-slot" onClick={() => handleReschedule(slot)}>
                    {slot}
                  </button>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setRescheduleModal(null)}>Ortga</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
