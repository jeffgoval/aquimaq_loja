-- Supabase linter 0028: `anon` herda EXECUTE via role `PUBLIC`.
-- Revogar EXECUTE em `PUBLIC` e conceder explicitamente a roles que precisam (PostgREST + manutenção).

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
    execute format('revoke execute on function %s from public', r.fn);
    execute format('grant execute on function %s to authenticated', r.fn);
    execute format('grant execute on function %s to postgres', r.fn);
    execute format('grant execute on function %s to service_role', r.fn);
  end loop;
end;
$body$;
