import { Context, SessionFlavor } from "grammy";

export interface SessionData {
  step: string;
  data: {
    name?: string;
    barberId?: number;
    selectedDate?: string;
    selectedTime?: string;
    appointmentId?: number;
  };
}

export type BotContext = Context & SessionFlavor<SessionData>;
