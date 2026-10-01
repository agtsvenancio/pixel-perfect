import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const TZ_OFFSET = "-03:00"; // Horário de Brasília
// Scheduling config — adjust here
export const SCHEDULE = {
  durationMin: 30,
  bufferMin: 15,
  startHour: 9,
  endHour: 17,
  workDays: [1, 2, 3, 4, 5], // Mon–Fri
  daysAhead: 14,
  minNoticeHours: 2,
};
const DURATION_MIN = SCHEDULE.durationMin;
const DAYS_AHEAD = SCHEDULE.daysAhead;

function gwHeaders() {
  const lk = process.env["LOVABLE_API_KEY"];
  const ck = process.env["GOOGLE_CALENDAR_API_KEY"];
  if (!lk || !ck) throw new Error("Calendar not configured");
  return {
    Authorization: `Bearer ${lk}`,
    "X-Connection-Api-Key": ck,
    "Content-Type": "application/json",
  };
}

async function gw(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GATEWAY}${path}`, { ...init, headers: gwHeaders() });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Calendar request failed [${res.status}]: ${body}`);
    throw new Error(`Calendar request failed [${res.status}]`);
  }
  return res.json();
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const opt = z.string().trim().max(500).nullable().default(null);

export const saveLead = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        empresa: z.string().trim().min(1).max(150),
        email: z.string().trim().email().max(255),
        investe_marketing: z.enum(["Sim", "Não"]),
        whatsapp: z.string().trim().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/),
        utm_source: opt, utm_medium: opt, utm_campaign: opt, utm_content: opt, utm_term: opt,
        gclid: opt, fbclid: opt, landing_page: opt, referrer: opt,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row, error } = await db.from("leads").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// Brasília has no DST: fixed UTC-3
function brDate(d: Date) {
  const s = new Date(d.getTime() - 3 * 3600_000);
  return s.toISOString().slice(0, 10);
}

export const getAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const now = new Date();
  const timeMax = new Date(now.getTime() + (DAYS_AHEAD + 1) * 86400_000);
  const fb = await gw("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: "America/Sao_Paulo",
      items: [{ id: "primary" }],
    }),
  });
  const busy: { start: string; end: string }[] = fb.calendars?.primary?.busy ?? [];
  const busyR: [number, number][] = busy.map((b) => [Date.parse(b.start), Date.parse(b.end)]);
  const minStart = now.getTime() + SCHEDULE.minNoticeHours * 3600_000;
  const buf = SCHEDULE.bufferMin * 60_000;
  const days: { date: string; slots: string[] }[] = [];
  for (let i = 0; i <= DAYS_AHEAD; i++) {
    const date = brDate(new Date(now.getTime() + i * 86400_000));
    const dow = new Date(`${date}T12:00:00${TZ_OFFSET}`).getUTCDay();
    if (!SCHEDULE.workDays.includes(dow)) continue;
    const slots: string[] = [];
    for (let m = SCHEDULE.startHour * 60; m + DURATION_MIN <= SCHEDULE.endHour * 60; m += DURATION_MIN + SCHEDULE.bufferMin) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      const s = Date.parse(`${date}T${hh}:${mm}:00${TZ_OFFSET}`);
      const e = s + DURATION_MIN * 60_000;
      if (s < minStart) continue;
      if (busyR.some(([bs, be]) => s < be + buf && e + buf > bs)) continue;
      slots.push(new Date(s).toISOString());
    }
    if (slots.length) days.push({ date, slots });
  }
  return { duration: DURATION_MIN, days };
});

export const bookSlot = createServerFn({ method: "POST" })
  .validator((d) =>
    z.object({ leadId: z.string().uuid(), start: z.string().datetime() }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: lead, error } = await db.from("leads").select("*").eq("id", data.leadId).single();
    if (error || !lead) throw new Error("Lead não encontrado");
    if (lead.appointment_status === "confirmed") throw new Error("Reunião já agendada");

    const s = Date.parse(data.start);
    const e = s + DURATION_MIN * 60_000;
    // re-check conflicts
    const fb = await gw("/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin: new Date(s - SCHEDULE.bufferMin * 60_000).toISOString(),
        timeMax: new Date(e + SCHEDULE.bufferMin * 60_000).toISOString(),
        items: [{ id: "primary" }],
      }),
    });
    if ((fb.calendars?.primary?.busy ?? []).length) throw new Error("SLOT_TAKEN");

    const description = `Novo lead Scase

Empresa:
${lead.empresa}

E-mail:
${lead.email}

Investe em marketing:
${lead.investe_marketing}

WhatsApp:
${lead.whatsapp}

Origem:
${lead.utm_source ?? "-"}

Campanha:
${lead.utm_campaign ?? "-"}`;

    const ev = await gw("/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", {
      method: "POST",
      body: JSON.stringify({
        summary: `Reunião Scase | ${lead.empresa}`,
        description,
        start: { dateTime: new Date(s).toISOString(), timeZone: "America/Sao_Paulo" },
        end: { dateTime: new Date(e).toISOString(), timeZone: "America/Sao_Paulo" },
        attendees: [{ email: lead.email }],
        conferenceData: {
          createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
        },
      }),
    });
    const meetUrl: string | null =
      ev.hangoutLink ??
      ev.conferenceData?.entryPoints?.find((p: { entryPointType: string }) => p.entryPointType === "video")?.uri ??
      null;

    const upd = {
      appointment_status: "confirmed",
      appointment_date: brDate(new Date(s)),
      appointment_start: new Date(s).toISOString(),
      appointment_end: new Date(e).toISOString(),
      calendar_event_id: ev.id as string,
      meeting_url: meetUrl,
    };
    await db.from("leads").update(upd).eq("id", lead.id);
    return { ...upd, duration: DURATION_MIN, empresa: lead.empresa };
  });
