-- 0007_knowledge_search.sql — busca que a aplicação consegue usar
--
-- A 0006 criou um índice GIN sobre uma EXPRESSÃO
-- (`to_tsvector('portuguese', title || ' ' || body)`). O Postgres usa esse
-- índice numa query SQL escrita à mão, mas o `supabase-js` só sabe filtrar
-- por COLUNA — `.textSearch()` precisa de uma coluna real. Ou seja: era um
-- índice que a aplicação não alcançava.
--
-- Coluna gerada resolve os dois lados: o Postgres mantém o tsvector
-- atualizado sozinho a cada escrita, e a coluna é consultável pelo cliente
-- como qualquer outra. Nada precisa lembrar de recalcular — que é o tipo de
-- coisa que sempre é esquecida.

alter table knowledge_index
  add column busca tsvector
  generated always as (
    to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) stored;

drop index if exists idx_knowledge_fts;

create index idx_knowledge_busca on knowledge_index using gin (busca);
