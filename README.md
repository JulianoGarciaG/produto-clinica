# Tempo de espera estimado - Clinica

Sistema publico (sem login) de tempo de espera estimado da fila, acessivel via QR code/link, com
painel administrativo interno para a recepcao. Implementado conforme
`prompt-implementacao-tempo-espera.md`.

## Como rodar

```bash
npm install
cp .env.example .env   # ajuste ADMIN_PASSWORD antes de usar em producao
npm start
```

- Pagina publica: `http://localhost:3000/`
- Painel da recepcao: `http://localhost:3000/admin/` (login com a senha de `ADMIN_PASSWORD`)

Requer Node.js >= 22.5 (usa o modulo nativo `node:sqlite`, sem dependencias nativas para compilar).

## Fluxo

1. Paciente escaneia o QR/link e toca em "Confirmar presenca" (`POST /checkin`) — sem senha, sem
   cadastro. Um token de sessao e salvo no `localStorage` do celular do paciente.
2. A pagina consulta `GET /wait-time` (com o token, se houver) a cada 5 minutos e exibe apenas os
   minutos estimados e o horario da ultima atualizacao (HH:MM) — nunca a posicao numerica.
3. Um job agendado (`node-cron`, a cada 5 minutos) recalcula a media movel dos ultimos N
   atendimentos concluidos e atualiza o horario de "ultima atualizacao".
4. A recepcao usa o painel `/admin` para dar check-out, remover entradas erradas, pausar a fila
   (emergencia) ou ajustar manualmente o tempo medio.

## Decisoes de implementacao (pontos em aberto no prompt)

- **Modo geral**: como o prompt pede "tempo medio atual da fila" sem posicao, ele é calculado como
  a estimativa de quem entrasse na fila agora (`(fila_atual + 1) * tempo_medio`) — ou seja, o tempo
  de espera atual de ponta a ponta da fila.
- **Check-in sem agendamento previo**: tratado como "cheguei agora", sem vinculo a consulta
  especifica, conforme sugerido no prompt.
- **Check-out**: exclusivamente manual pela recepcao (padrao inicial sugerido no prompt).
- **Autenticacao do admin**: o prompt não especificava; para nao deixar o painel totalmente aberto,
  foi adicionado um login simples por senha (cookie de sessao httpOnly, sem cadastro de usuario) —
  zero-friction para o paciente, protegido para a recepcao.

## Estrutura

```
server.js                 # entrypoint Express
src/db.js                 # node:sqlite + schema + settings key/value
src/queue.js              # regras de negocio da fila (check-in, posicao, media movel, estimativa)
src/scheduler.js           # job cron de recalculo a cada 5 min
src/routes/public.js       # POST /checkin, GET /wait-time
src/routes/admin.js        # login/logout/sessao + CRUD da fila (autenticado)
src/middleware/adminAuth.js # sessao em memoria via cookie httpOnly
public/                    # pagina publica (mobile-first)
admin_panel/               # painel interno da recepcao
data/clinica.db            # SQLite (criado automaticamente)
```
