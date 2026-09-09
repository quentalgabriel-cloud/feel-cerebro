-- 0009_reservar_display_id.sql — a única porta pública para a sequência
--
-- `private.next_display_id` vive em `private` porque o PostgREST expõe como
-- endpoint RPC tudo que está em `public` — foi assim que os helpers de
-- autorização viraram chamáveis de fora, e a correção foi mover para um
-- schema não exposto.
--
-- Mas a promoção precisa reservar o id a partir do app, e o app fala com o
-- banco via PostgREST. Então esta função existe: um invólucro em `public`,
-- deliberadamente exposto, com a checagem de autorização DENTRO dela.
--
-- A regra que a torna segura não é ela estar escondida — é ela recusar quem
-- não pode escrever no projeto, mesmo que chame direto. `SECURITY DEFINER`
-- sem essa checagem seria exatamente o furo que a 0004 fechou.

create function public.next_display_id(p_project uuid, p_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sem isto, qualquer pessoa autenticada incrementaria o contador de
  -- qualquer projeto só sabendo o uuid — barulho no acervo alheio, e uma
  -- forma de descobrir quantos itens existem lá dentro.
  if not private.can_write_project(p_project) then
    raise exception 'sem permissao de escrita neste projeto'
      using errcode = '42501';
  end if;

  if p_type not in ('decision','reasoning','insight','open-loop','project-state','source') then
    raise exception 'tipo invalido: %', p_type using errcode = '22023';
  end if;

  return private.next_display_id(p_project, p_type);
end;
$$;

revoke execute on function public.next_display_id(uuid, text) from public;
grant execute on function public.next_display_id(uuid, text) to authenticated;
