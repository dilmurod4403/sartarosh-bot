import { useEffect, useState } from "react";
import { getSchedule, updateSchedule } from "../api";

const DAYS = [
  { key: "MONDAY", label: "Dushanba" },
  { key: "TUESDAY", label: "Seshanba" },
  { key: "WEDNESDAY", label: "Chorshanba" },
  { key: "THURSDAY", label: "Payshanba" },
  { key: "FRIDAY", label: "Juma" },
  { key: "SATURDAY", label: "Shanba" },
  { key: "SUNDAY", label: "Yakshanba" },
];

interface Schedule {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  isDayOff: boolean;
}

export default function SchedulePage() {
  const [slotDuration, setSlotDuration] = useState(30);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchedule().then((r) => {
      setSlotDuration(r.data.slotDuration);
      const map: Record<string, Schedule> = {};
      r.data.schedules.forEach((s: Schedule) => { map[s.dayOfWeek] = s; });
      setSchedules(
        DAYS.map((d) => map[d.key] ?? {
          dayOfWeek: d.key,
          startTime: "09:00",
          endTime: "18:00",
          breakStart: "13:00",
          breakEnd: "14:00",
          isDayOff: false,
        })
      );
      setLoading(false);
    });
  }, []);

  const update = (index: number, field: keyof Schedule, value: any) => {
    setSchedules((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async () => {
    await updateSchedule({ slotDuration, schedules });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <p className="center">Yuklanmoqda...</p>;

  return (
    <div className="page">
      <div className="slot-row">
        <label>Slot davomiyligi (daqiqa):</label>
        <select value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value))}>
          {[15, 20, 30, 45, 60, 90].map((v) => (
            <option key={v} value={v}>{v} daqiqa</option>
          ))}
        </select>
      </div>

      <div className="schedule-list">
        {DAYS.map((day, i) => {
          const s = schedules[i];
          return (
            <div key={day.key} className={`schedule-card ${s.isDayOff ? "day-off" : ""}`}>
              <div className="schedule-header">
                <strong>{day.label}</strong>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={s.isDayOff}
                    onChange={(e) => update(i, "isDayOff", e.target.checked)}
                  />
                  <span className="slider" />
                </label>
                <span className="day-off-label">{s.isDayOff ? "Dam olish" : "Ish kuni"}</span>
              </div>

              {!s.isDayOff && (
                <div className="schedule-times">
                  <div className="time-row">
                    <span>Ish vaqti:</span>
                    <input type="time" value={s.startTime} onChange={(e) => update(i, "startTime", e.target.value)} />
                    <span>—</span>
                    <input type="time" value={s.endTime} onChange={(e) => update(i, "endTime", e.target.value)} />
                  </div>
                  <div className="time-row">
                    <span>Tushlik:</span>
                    <input type="time" value={s.breakStart ?? ""} onChange={(e) => update(i, "breakStart", e.target.value)} />
                    <span>—</span>
                    <input type="time" value={s.breakEnd ?? ""} onChange={(e) => update(i, "breakEnd", e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-save" onClick={handleSave}>
        {saved ? "✅ Saqlandi!" : "💾 Saqlash"}
      </button>
    </div>
  );
}
