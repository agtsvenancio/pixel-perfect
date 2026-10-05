import { createFileRoute } from "@tanstack/react-router";
import { LeadFlow } from "@/components/LeadFlow";
import logo from "@/assets/logo-scase.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agência Scase | Diagnóstico e reunião" },
      { name: "description", content: "Responda 4 perguntas rápidas e escolha um horário para conversar com o time da Agência Scase." },
      { property: "og:title", content: "Agência Scase | Diagnóstico e reunião" },
      { property: "og:description", content: "Responda 4 perguntas rápidas e agende uma conversa com o time Scase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col px-5 sm:px-10">
      <header className="flex h-20 items-center">
        <img src={logo.url} alt="Agência Scase" className="h-7 w-auto" />
      </header>
      <section className="flex flex-1 items-center justify-center py-12 sm:py-20">
        <LeadFlow />
      </section>
      <footer className="flex flex-col gap-2 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-lg font-extrabold tracking-tight">SCASE<span className="text-primary">.</span></span>
        <span className="font-mono-label">Branding | Design | Performance</span>
        <span className="font-mono-label">© Agência Scase</span>
      </footer>
    </main>
  );
}
