import { useEffect, useState } from "react";
import { getSalons, createSalon, updateSalon, addAdmin } from "../api";

interface Salon {
  id: number;
  name: string;
  address?: string;
  isActive: boolean;
  _count: { barbers: number };
}

type Modal =
  | { type: "create" }
  | { type: "edit"; salon: Salon }
  | { type: "admin"; salonId: number; salonName: string };

export default function SalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [adminTelegramId, setAdminTelegramId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => getSalons().then((r) => { setSalons(r.data); setLoading(false); });

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setFormName(""); setFormAddress(""); setError("");
    setModal({ type: "create" });
  };

  const openEdit = (salon: Salon) => {
    setFormName(salon.name); setFormAddress(salon.address ?? ""); setError("");
    setModal({ type: "edit", salon });
  };

  const openAdmin = (salon: Salon) => {
    setAdminTelegramId(""); setAdminName(""); setError("");
    setModal({ type: "admin", salonId: salon.id, salonName: salon.name });
  };

  const handleSaveSalon = async () => {
    if (!formName.trim()) { setError("Salon nomi kiritilmadi"); return; }
    setSaving(true); setError("");
    try {
      if (modal?.type === "edit") {
        await updateSalon(modal.salon.id, { name: formName.trim(), address: formAddress.trim() });
      } else {
        await createSalon({ name: formName.trim(), address: formAddress.trim() });
      }
      setModal(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!adminTelegramId.trim()) { setError("Telegram ID kiritilmadi"); return; }
    if (modal?.type !== "admin") return;
    setSaving(true); setError("");
    try {
      await addAdmin({
        telegramId: adminTelegramId.trim(),
        name: adminName.trim() || undefined,
        salonId: modal.salonId,
      });
      setModal(null);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Xato yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="center">Yuklanmoqda...</p>;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Salonlar ({salons.length})</h2>
        <button className="btn-confirm" style={{ padding: "8px 14px" }} onClick={openCreate}>
          + Yangi salon
        </button>
      </div>

      {/* Salon yaratish / tahrirlash formasi */}
      {modal && (modal.type === "create" || modal.type === "edit") && (
        <div className="form-card">
          <h3>{modal.type === "edit" ? "Salonni tahrirlash" : "Yangi salon"}</h3>
          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
          <input className="date-picker" placeholder="Salon nomi *" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <input className="date-picker" placeholder="Manzil (ixtiyoriy)" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-cancel" style={{ flex: 1, padding: 10 }} onClick={() => setModal(null)}>Bekor</button>
            <button className="btn-save" style={{ flex: 2 }} onClick={handleSaveSalon} disabled={saving}>
              {saving ? "Saqlanmoqda..." : modal.type === "edit" ? "💾 Saqlash" : "✅ Yaratish"}
            </button>
          </div>
        </div>
      )}

      {/* Admin qo'shish formasi */}
      {modal?.type === "admin" && (
        <div className="form-card">
          <h3>Admin qo'shish — {modal.salonName}</h3>
          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
          <input
            className="date-picker"
            placeholder="Telegram ID (raqam) *"
            type="number"
            value={adminTelegramId}
            onChange={(e) => setAdminTelegramId(e.target.value)}
          />
          <input
            className="date-picker"
            placeholder="Ism (ixtiyoriy)"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-cancel" style={{ flex: 1, padding: 10 }} onClick={() => setModal(null)}>Bekor</button>
            <button className="btn-save" style={{ flex: 2 }} onClick={handleAddAdmin} disabled={saving}>
              {saving ? "Qo'shilmoqda..." : "✅ Admin qo'shish"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#888" }}>* Foydalanuvchi avval bot bilan /start bosgan bo'lishi shart</p>
        </div>
      )}

      <div className="schedule-list">
        {salons.map((s) => (
          <div key={s.id} className="schedule-card">
            <div className="schedule-header">
              <strong>💈 {s.name}</strong>
              <span className={`status-badge ${s.isActive ? "active" : "inactive"}`}>
                {s.isActive ? "Faol" : "Nofaol"}
              </span>
            </div>
            {s.address && <div style={{ fontSize: 13, color: "#666" }}>📍 {s.address}</div>}
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>👤 {s._count.barbers} sartarosh</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn-reschedule" style={{ flex: 1, padding: "6px 10px", fontSize: 13 }} onClick={() => openEdit(s)}>
                ✏️ Tahrirlash
              </button>
              <button className="btn-confirm" style={{ flex: 1, padding: "6px 10px", fontSize: 13 }} onClick={() => openAdmin(s)}>
                👤 Admin
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
