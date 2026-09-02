export default function ExplorePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
        Explore
      </h1>
      <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-8">
        <p className="text-sm font-medium">Ainda não há grafo.</p>
        <p className="mt-1 text-sm text-neutral-500">
          Grafo sem relações é enfeite. Esta tela abre na Fase 05, quando
          existirem relações tipadas entre conhecimento promovido — e, para o
          mapa por eixos, quando os eixos da Feel estiverem definidos.
        </p>
      </div>
    </main>
  );
}
