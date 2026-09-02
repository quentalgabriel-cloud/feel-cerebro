export default function WorkPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
        Work
      </h1>
      <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-8">
        <p className="text-sm font-medium">Ainda não há execução ligada.</p>
        <p className="mt-1 text-sm text-neutral-500">
          Esta tela mostra o que está sendo construído de verdade — PRs, checks,
          deploys — ligado à decisão que os originou. Entra na Fase 07, depois
          que existir memória canônica para conectar. Não há dado falso aqui de
          propósito.
        </p>
      </div>
    </main>
  );
}
