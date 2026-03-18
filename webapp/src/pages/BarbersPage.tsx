import { useEffect, useState } from "react";
import { getBarbers, updateBarber, addBarber, getSalons } from "../api";

interface Barber {
  id: number;
  isActive: boolean;
  slotDuration: number;
  user: { name: string; phone?: string; telegramId: string };
}

interface Salon {
  id: number;
  name: string;
}

export default function BarbersPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [telegramId, setTelegramId] = useState("");
  const [name, setName] = useState("");
  const [slotDuration, setSlotDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSalons().then((r) => {
      setSalons(r.data);
      if (r.data.length > 0) setSelectedSalonId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedSalonId) return;
    setLoading(true);
    getBarbers(selectedSalonId).then((r) => {
      setBarbers(r.data);
      setLoading(false);
    });
  }, [selectedSalonId]);

  const toggleActive = async (id: number, isActive: boolean) => {
    await updateBarber(id, { isActive: !isActive });
    getBarbers(selectedSalonId!).then((r) => setBarbers(r.data));
  };

  const handleAdd = async () => {
    if (!telegramId.trim()) { setError("Telegram ID kiritilmadi"); return; }
    if (!selectedSalonId) { setError("Salon tanlanmadi"); return; }
    setSaving(true);
    setError("");
    try {
      await addBarber({
        telegramId: telegramId.trim(),
        name: name.trim() || undefined,
        slotDuration,
        salonId: selectedSalonId,
      });
      setShowForm(false);
      setTelegramId("");
      setName("");
      setSlotDuration(30);
      getBarbers(selectedSalonId).then((r) => setBarbers(r.data));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const selectedSalon = salons.find((s) => s.id === selectedSalonId);

  return (
    <div className="page">
      {salons.length > 1 && (
        <select
          className="date-picker"
          value={selectedSalonId ?? ""}
          onChange={(e) => setSelectedSalonId(parseInt(e.target.value))}
        >
          {salons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{selectedSalon?.name ?? "Sartaroshlar"} ({barbers.length})</h2>
        <button className="btn-confirm" style={{ padding: "8px 14px" }} onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Yopish" : "+ Qo'shish"}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>Yangi sartarosh — {selectedSalon?.name}</h3>
          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
          <input
            className="date-picker"
            placeholder="Telegram ID (raqam)"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            type="number"
          />
          <input
            className="date-picker"
            placeholder="Ism (ixtiyoriy)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="time-row" style={{ marginTop: 4 }}>
            <span>Slot davomiyligi:</span>
            <select
              value={slotDuration}
              onChange={(e) => setSlotDuration(parseInt(e.target.value))}
              style={{ padding: "6px", borderRadius: 6, border: "1px solid #ddd" }}
            >
              <option value={20}>20 daqiqa</option>
              <option value={30}>30 daqiqa</option>
              <option value={45}>45 daqiqa</option>
              <option value={60}>60 daqiqa</option>
            </select>
          </div>
          <button className="btn-save" onClick={handleAdd} disabled={saving}>
            {saving ? "Saqlanmoqda..." : "✅ Qo'shish"}
          </button>
          <p style={{ fontSize: 12, color: "#888" }}>
            * Sartarosh avval bot bilan /start bosgan bo'lishi shart
          </p>
        </div>
      )}

      {loading ? (
        <p className="center">Yuklanmoqda...</p>
      ) : (
        <div className="barbers-list">
          {barbers.length === 0 && <p className="center">Sartaroshlar yo'q</p>}
          {barbers.map((b) => (
            <div key={b.id} className={`barber-card ${b.isActive ? "" : "inactive"}`}>
              <div className="barber-info">
                <strong>💈 {b.user.name}</strong>
                {b.user.phone && <div className="phone">{b.user.phone}</div>}
                <div className="telegram-id">ID: {b.user.telegramId}</div>
                <div className="slot">Slot: {b.slotDuration} daqiqa</div>
              </div>
              <div className="barber-actions">
                <span className={`status-badge ${b.isActive ? "active" : "inactive"}`}>
                  {b.isActive ? "Faol" : "Nofaol"}
                </span>
                <button
                  className={b.isActive ? "btn-cancel" : "btn-confirm"}
                  onClick={() => toggleActive(b.id, b.isActive)}
                >
                  {b.isActive ? "O'chirish" : "Faollashtirish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
