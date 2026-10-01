import { createFileRoute } from "@tanstack/react-router";
import { LeadFlow } from "@/components/LeadFlow";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agência Scase | Agende sua reunião" },
      { name: "description", content: "Responda 4 perguntas rápidas e agende uma conversa com a equipe da Agência Scase." },
      { property: "og:title", content: "Agência Scase | Agende sua reunião" },
      { property: "og:description", content: "Responda 4 perguntas rápidas e agende uma conversa com a equipe Scase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col px-6 py-8">
      <header className="mx-auto w-full max-w-xl font-display text-2xl tracking-tight">Scase<span className="text-primary">.</span></header>
      <section className="flex flex-1 items-center justify-center py-12">
        <LeadFlow />
      </section>
    </main>
  );
}
