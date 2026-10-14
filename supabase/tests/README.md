# Testes do banco (Postgres 16 local)

Cenários em SQL das regras do backend (Folga, conquistas, avisos, planos, desafios, endurecimento).
Eles rodam num Postgres comum com um _stub_ do schema `auth` do Supabase; **não tocam o projeto real**.

```bash
pg_ctlcluster 16 main start
su postgres -c "psql -q -c 'create database lumitest'"
su postgres -c "psql -q -d lumitest -f supabase/tests/stub.sql"
for f in supabase/migrations/0*.sql; do   # sem as variantes 00015_circles_* (só a 00015_circles.sql)
  su postgres -c "psql -q -v ON_ERROR_STOP=1 -d lumitest -f $f"
done
for s in seed-content seed-content-batch-2 seed-content-batch-3 seed-content-structure-fill seed-reading-plans seed-challenges; do
  su postgres -c "psql -q -d lumitest -f supabase/$s.sql"
done
su postgres -c "psql -q -d lumitest -f supabase/tests/t22.sql"   # e t16..t20, t22..t26
```

Cada arquivo imprime o que espera (`esperado: ...`) ao lado do resultado. Erros `permission denied`
são intencionais (provam que o cliente não acessa tabelas fechadas). Os testes apagam os dados do
banco de teste (`truncate`): use sempre um banco de teste descartável.
