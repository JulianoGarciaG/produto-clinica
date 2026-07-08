const { v4: uuidv4 } = require('uuid');
const { db, getSetting, setSetting } = require('./db');

const DEFAULT_SERVICE_TIME = Number(process.env.DEFAULT_SERVICE_TIME_MINUTES || 15);

/** Registra o check-in de um paciente. Sempre 1 acao, sem dados pessoais obrigatorios. */
function checkin() {
  const token = uuidv4();
  const arrivalTime = new Date().toISOString();
  db.prepare(
    'INSERT INTO queue (token, arrival_time, status) VALUES (?, ?, ?)'
  ).run(token, arrivalTime, 'waiting');
  return { token, arrivalTime };
}

/** Posicao (1-based) de um paciente 'waiting' na fila FIFO. Retorna null se nao esta esperando. */
function getPosition(token) {
  const entry = db
    .prepare('SELECT * FROM queue WHERE token = ?')
    .get(token);

  if (!entry || entry.status !== 'waiting') return null;

  const { count } = db
    .prepare(
      `SELECT COUNT(*) as count FROM queue
       WHERE status = 'waiting' AND arrival_time <= ?`
    )
    .get(entry.arrival_time);

  return count; // inclui o proprio paciente => posicao 1 = proximo a ser atendido
}

function countWaiting() {
  const { count } = db
    .prepare(`SELECT COUNT(*) as count FROM queue WHERE status = 'waiting'`)
    .get();
  return count;
}

/** Media movel dos ultimos N atendimentos concluidos (em minutos). */
function computeMovingAverage(n) {
  const rows = db
    .prepare(
      `SELECT arrival_time, checkout_time FROM queue
       WHERE status = 'done' AND checkout_time IS NOT NULL
       ORDER BY checkout_time DESC LIMIT ?`
    )
    .all(n);

  if (rows.length === 0) return null;

  const durations = rows.map((r) => {
    const ms = new Date(r.checkout_time) - new Date(r.arrival_time);
    return ms / 60000;
  });

  const sum = durations.reduce((a, b) => a + b, 0);
  return sum / durations.length;
}

/**
 * Recalcula tempo_medio_atendimento e atualiza o horario da ultima atualizacao.
 * Executado pelo job agendado a cada RECALC_CYCLE_MINUTES.
 * Se houver override manual definido pela recepcao, o valor calculado NAO sobrescreve o override.
 */
function recalculate() {
  const manualOverride = getSetting('manual_override') === 'true';

  if (!manualOverride) {
    const n = Number(process.env.MOVING_AVERAGE_N || 20);
    const avg = computeMovingAverage(n);
    setSetting('avg_service_time_minutes', avg !== null ? avg.toFixed(2) : DEFAULT_SERVICE_TIME);
  }

  setSetting('last_updated_at', new Date().toISOString());
}

function getAvgServiceTime() {
  return Number(getSetting('avg_service_time_minutes', DEFAULT_SERVICE_TIME));
}

function isPaused() {
  return getSetting('queue_paused') === 'true';
}

function setPaused(paused) {
  setSetting('queue_paused', paused ? 'true' : 'false');
}

function setManualAvgOverride(minutes) {
  setSetting('avg_service_time_minutes', Number(minutes).toFixed(2));
  setSetting('manual_override', 'true');
}

function clearManualAvgOverride() {
  setSetting('manual_override', 'false');
}

function getLastUpdatedAt() {
  return getSetting('last_updated_at');
}

/**
 * Tempo estimado exibido publicamente. Nunca retorna erro/vazio.
 * - modo personalizado: posicao real do paciente * tempo medio.
 * - modo geral: estimativa de quem entrasse na fila agora (fim da fila) * tempo medio,
 *   representando o tempo medio atual de espera da fila.
 */
function getWaitTimeEstimate(token) {
  const avg = getAvgServiceTime();
  const paused = isPaused();

  let mode = 'geral';
  let position = null;

  if (token) {
    position = getPosition(token);
    if (position !== null) mode = 'personalizado';
  }

  if (mode === 'geral') {
    position = countWaiting() + 1; // posicao hipotetica de quem chegasse agora
  }

  const estimatedMinutes = paused ? null : Math.round(position * avg);

  return {
    mode,
    estimatedMinutes,
    paused,
    lastUpdatedAt: getLastUpdatedAt()
  };
}

// --- Operacoes administrativas ---

function listQueue() {
  return db
    .prepare(
      `SELECT id, token, arrival_time, checkout_time, status FROM queue
       WHERE status = 'waiting' ORDER BY arrival_time ASC`
    )
    .all();
}

function checkoutPatient(id) {
  const info = db
    .prepare(
      `UPDATE queue SET status = 'done', checkout_time = ? WHERE id = ? AND status = 'waiting'`
    )
    .run(new Date().toISOString(), id);
  return info.changes > 0;
}

function removeEntry(id) {
  const info = db
    .prepare(`UPDATE queue SET status = 'removed' WHERE id = ?`)
    .run(id);
  return info.changes > 0;
}

module.exports = {
  checkin,
  getPosition,
  countWaiting,
  computeMovingAverage,
  recalculate,
  getAvgServiceTime,
  isPaused,
  setPaused,
  setManualAvgOverride,
  clearManualAvgOverride,
  getLastUpdatedAt,
  getWaitTimeEstimate,
  listQueue,
  checkoutPatient,
  removeEntry
};
