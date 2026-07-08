const path = require('path');
const express = require('express');
const queue = require('../queue');
const { requireAuth, login, logout, isValid, SESSION_COOKIE, SESSION_TTL_MS } = require('../middleware/adminAuth');

const router = express.Router();

router.use(express.static(path.join(__dirname, '..', '..', 'admin_panel')));

// --- Autenticacao (publicas) ---

router.post('/api/login', (req, res) => {
  const token = login(req.body.password);
  if (!token) return res.status(401).json({ error: 'Senha invalida' });

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS
  });
  res.json({ success: true });
});

router.post('/api/logout', (req, res) => {
  logout(req.cookies && req.cookies[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE);
  res.json({ success: true });
});

router.get('/api/session', (req, res) => {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  res.json({ authenticated: Boolean(token) && isValid(token) });
});

// --- A partir daqui, tudo exige sessao valida ---
router.use(requireAuth);

// GET /admin/api/queue - lista fila atual (uso interno, pode mostrar posicao/hora)
router.get('/api/queue', (req, res) => {
  res.json({
    paused: queue.isPaused(),
    avgServiceTimeMinutes: queue.getAvgServiceTime(),
    lastUpdatedAt: queue.getLastUpdatedAt(),
    entries: queue.listQueue()
  });
});

// POST /admin/api/checkout/:id - marca check-out manual
router.post('/api/checkout/:id', (req, res) => {
  const ok = queue.checkoutPatient(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Entrada nao encontrada ou ja finalizada' });
  res.json({ success: true });
});

// DELETE /admin/api/queue/:id - remove/corrige entrada equivocada
router.delete('/api/queue/:id', (req, res) => {
  const ok = queue.removeEntry(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Entrada nao encontrada' });
  res.json({ success: true });
});

// POST /admin/api/pause  { paused: true|false } - pausa/retoma a fila (ex: emergencia)
router.post('/api/pause', (req, res) => {
  const { paused } = req.body;
  queue.setPaused(Boolean(paused));
  res.json({ paused: queue.isPaused() });
});

// POST /admin/api/avg-override { minutes: number } - ajuste manual do tempo medio
router.post('/api/avg-override', (req, res) => {
  const { minutes } = req.body;
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: 'Valor invalido' });
  }
  queue.setManualAvgOverride(value);
  res.json({ avgServiceTimeMinutes: queue.getAvgServiceTime() });
});

// POST /admin/api/avg-clear - volta a usar a media movel calculada automaticamente
router.post('/api/avg-clear', (req, res) => {
  queue.clearManualAvgOverride();
  queue.recalculate();
  res.json({ avgServiceTimeMinutes: queue.getAvgServiceTime() });
});

module.exports = router;
