import { Context, SessionFlavor } from "grammy";

export interface SessionData {
  step: string;
  data: {
    name?: string;
    salonId?: number;
    barberId?: number;
    selectedDate?: string;
    selectedTime?: string;
    appointmentId?: number;
    schedDay?: string;
    schedStart?: string;
    schedEnd?: string;
  };
}

export type BotContext = Context & SessionFlavor<SessionData>;
