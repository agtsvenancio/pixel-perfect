import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { saveLead, getAvailability, bookSlot } from "@/lib/leads.functions";
import { track, captureAttribution, maskPhone } from "@/lib/tracking";

type Stage = 1 | 2 | 3 | 4 | "schedule" | "done";
type Booked = Awaited<ReturnType<typeof bookSlot>>;

const fmtDay = (iso: string) =>
  new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const fmtLong = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long", year: "numeric" });

export function LeadFlow() {
  const [stage, setStage] = useState<Stage>(1);
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [investe, setInveste] = useState<"Sim" | "Não" | "">("");
  const [whatsapp, setWhatsapp] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [avail, setAvail] = useState<{ duration: number; days: { date: string; slots: string[] }[] } | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  const save = useServerFn(saveLead);
  const fetchAvail = useServerFn(getAvailability);
  const book = useServerFn(bookSlot);

  useEffect(() => track("form_start"), []);

  const go = (s: Stage) => { setError(""); setStage(s); };

  const loadAvail = async () => {
    setAvail(null);
    try {
      const a = await fetchAvail();
      setAvail(a);
      setDay(a.days[0]?.date ?? null);
    } catch {
      setError("Não foi possível carregar os horários. Tente novamente.");
    }
  };

  const submitStep1 = () => {
    if (!empresa.trim()) return setError("Informe o nome da sua empresa.");
    track("form_step_1"); go(2);
  };
  const submitStep2 = () => {
    if (!z.string().email().safeParse(email.trim()).success) return setError("Digite um e-mail válido.");
    track("form_step_2"); go(3);
  };
  const pickInveste = (v: "Sim" | "Não") => {
    setInveste(v); track("form_step_3", { investe_marketing: v });
    setTimeout(() => go(4), 280);
  };
  const submitStep4 = async () => {
    if (!/^\(\d{2}\) \d{4,5}-\d{4}$/.test(whatsapp)) return setError("Digite um WhatsApp válido.");
    if (!agree) return setError("É necessário aceitar a Política de Privacidade.");
    setBusy(true); setError("");
    try {
      track("form_step_4");
      const r = await save({ data: { empresa, email, investe_marketing: investe as "Sim" | "Não", whatsapp, ...captureAttribution() } });
      setLeadId(r.id);
      track("lead");
      setStage("schedule");
      track("schedule_view");
      loadAvail();
    } catch {
      setError("Não foi possível enviar. Tente novamente.");
    } finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!leadId || !slot) return;
    setBusy(true); setError("");
    try {
      const r = await book({ data: { leadId, start: slot } });
      setBooked(r);
      track("schedule_complete", { appointment_start: r.appointment_start });
      setStage("done");
    } catch (e) {
      const taken = e instanceof Error && e.message.includes("SLOT_TAKEN");
      setError(taken ? "Esse horário acabou de ser reservado. Escolha outro." : "Não foi possível agendar. Tente novamente.");
      if (taken) { setSlot(null); loadAvail(); }
    } finally { setBusy(false); }
  };

  const daySlots = useMemo(() => avail?.days.find((d) => d.date === day)?.slots ?? [], [avail, day]);

  const gcalLink = booked
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Reunião Scase | ${booked.empresa}`)}&dates=${booked.appointment_start.replace(/[-:]|\.\d{3}/g, "")}/${booked.appointment_end.replace(/[-:]|\.\d{3}/g, "")}&details=${encodeURIComponent(booked.meeting_url ?? "")}`
    : "#";

  const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); fn(); } };

  return (
    <div className="flow-card">
      {typeof stage === "number" && (
        <div className="mb-10 flex items-center gap-3 text-xs tracking-widest text-muted-foreground">
          <span>{stage} de 4</span>
          <div className="h-px flex-1 bg-border">
            <div className="h-px bg-primary transition-all duration-500" style={{ width: `${stage * 25}%` }} />
          </div>
        </div>
      )}

      <div key={String(stage)} className="flow-step">
        {stage === 1 && (
          <>
            <h2 className="flow-title">Qual é o nome da sua empresa?</h2>
            <input autoFocus className="flow-input" placeholder="Digite o nome da sua empresa" maxLength={150}
              value={empresa} onChange={(e) => setEmpresa(e.target.value)} onKeyDown={onEnter(submitStep1)} />
            <button className="flow-btn" onClick={submitStep1}>Continuar</button>
          </>
        )}
        {stage === 2 && (
          <>
            <h2 className="flow-title">Qual é o seu melhor e-mail?</h2>
            <input autoFocus type="email" inputMode="email" className="flow-input" placeholder="seuemail@empresa.com.br" maxLength={255}
              value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onEnter(submitStep2)} />
            <button className="flow-btn" onClick={submitStep2}>Continuar</button>
          </>
        )}
        {stage === 3 && (
          <>
            <h2 className="flow-title">Sua empresa investe em marketing atualmente?</h2>
            <div className="grid grid-cols-2 gap-4">
              {(["Sim", "Não"] as const).map((v) => (
                <button key={v} className={`flow-option ${investe === v ? "is-active" : ""}`} onClick={() => pickInveste(v)}>{v}</button>
              ))}
            </div>
          </>
        )}
        {stage === 4 && (
          <>
            <h2 className="flow-title">Qual é o seu WhatsApp?</h2>
            <p className="-mt-4 mb-6 text-muted-foreground">Vamos usar esse número apenas para falar sobre sua solicitação e sua reunião.</p>
            <input autoFocus type="tel" inputMode="numeric" className="flow-input" placeholder="(11) 99999-9999"
              value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} onKeyDown={onEnter(submitStep4)} />
            <label className="mb-8 flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>Li e concordo com a Política de Privacidade e autorizo o contato da equipe Scase.</span>
            </label>
            <button className="flow-btn" disabled={busy} onClick={submitStep4}>{busy ? "Enviando..." : "Ver horários disponíveis"}</button>
          </>
        )}
        {stage === "schedule" && (
          <>
            <h2 className="flow-title">Agora escolha o melhor horário para conversarmos.</h2>
            <p className="-mt-4 mb-2 text-muted-foreground">Selecione um dia e horário disponível para falar com a equipe Scase.</p>
            <p className="mb-8 text-xs tracking-widest text-muted-foreground uppercase">
              Duração: {avail?.duration ?? 30} min · Horário de Brasília
            </p>
            {!avail && !error && <p className="text-muted-foreground">Carregando horários…</p>}
            {avail && avail.days.length === 0 && <p className="text-muted-foreground">Nenhum horário disponível no momento.</p>}
            {avail && avail.days.length > 0 && (
              <>
                <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                  {avail.days.map((d) => (
                    <button key={d.date} className={`flow-chip ${day === d.date ? "is-active" : ""}`}
                      onClick={() => { setDay(d.date); setSlot(null); }}>{fmtDay(d.date)}</button>
                  ))}
                </div>
                <div className="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {daySlots.map((s) => (
                    <button key={s} className={`flow-chip ${slot === s ? "is-active" : ""}`}
                      onClick={() => { setSlot(s); track("schedule_select", { slot: s }); }}>{fmtTime(s)}</button>
                  ))}
                </div>
                <button className="flow-btn" disabled={!slot || busy} onClick={confirm}>
                  {busy ? "Agendando..." : "Confirmar horário"}
                </button>
              </>
            )}
          </>
        )}
        {stage === "done" && booked && (
          <>
            <h2 className="flow-title">Reunião agendada.</h2>
            <p className="-mt-4 mb-8 text-muted-foreground">Seu horário está reservado. Enviamos os detalhes para o seu e-mail.</p>
            <dl className="mb-8 grid gap-4 border-y border-border py-6 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Data</dt><dd className="capitalize">{fmtLong(booked.appointment_start)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Horário</dt><dd>{fmtTime(booked.appointment_start)} (Brasília)</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Duração</dt><dd>{booked.duration} minutos</dd></div>
              {booked.meeting_url && (
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Google Meet</dt>
                  <dd><a className="text-primary underline" href={booked.meeting_url} target="_blank" rel="noreferrer">Entrar na reunião</a></dd></div>
              )}
            </dl>
            <a className="flow-btn inline-flex" href={gcalLink} target="_blank" rel="noreferrer">Adicionar ao calendário</a>
            <p className="mt-10 whitespace-pre-line font-display text-xl">{"Nos vemos em breve.\nEquipe Scase."}</p>
          </>
        )}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
