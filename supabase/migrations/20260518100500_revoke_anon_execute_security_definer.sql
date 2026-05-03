-- Supabase linter 0028: impedir que o role `anon` invoque funções SECURITY DEFINER em `public` via PostgREST.
-- Mantém EXECUTE para `authenticated` (RPC legítimas da app).

do $body$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format('revoke execute on function %s from anon', r.fn);
  end loop;
end;
$body$;
