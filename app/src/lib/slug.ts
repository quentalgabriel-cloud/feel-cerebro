// Slug para URL, a partir de um nome escrito por gente.
//
// Mora sozinho aqui — sem Supabase, sem Next — porque é usado tanto na
// criação de projeto quanto no bootstrap de organização, e porque o intervalo
// de diacríticos abaixo já se corrompeu uma vez em trânsito entre
// ferramentas: escrito com os caracteres combinantes crus, virou lixo
// silenciosamente e o slug passou a sair com acento. Escreva sempre escapado
// (`[\u0300-\u036f]`) — e `slug.test.ts` existe para
// provar que continua escapado.
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "projeto"
  );
}
