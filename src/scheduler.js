const cron = require('node-cron');
const { recalculate } = require('./queue');

function startScheduler() {
  const minutes = Number(process.env.RECALC_CYCLE_MINUTES || 5);
  const expression = `*/${minutes} * * * *`;

  // Roda uma vez imediatamente para nao deixar o front-end sem dado no start.
  recalculate();

  cron.schedule(expression, () => {
    recalculate();
    console.log(`[scheduler] tempo medio recalculado em ${new Date().toISOString()}`);
  });

  console.log(`[scheduler] job agendado a cada ${minutes} minuto(s) (${expression})`);
}

module.exports = { startScheduler };
