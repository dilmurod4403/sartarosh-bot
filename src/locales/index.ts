import { uz } from "./uz";
import { ru } from "./ru";
import { Language } from "../generated/prisma";

export const t = (lang: Language) => (lang === Language.RU ? ru : uz);
