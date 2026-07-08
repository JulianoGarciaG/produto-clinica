const express = require('express');
const queue = require('../queue');

const router = express.Router();

// POST /checkin - registra presenca, retorna token de sessao (1 toque, sem senha/cadastro)
router.post('/checkin', (req, res) => {
  const { token, arrivalTime } = queue.checkin();
  res.status(201).json({ token, arrivalTime });
});

// GET /wait-time?token=... - modo geral (sem token) ou personalizado (com token valido)
router.get('/wait-time', (req, res) => {
  const token = req.query.token || null;
  const estimate = queue.getWaitTimeEstimate(token);
  res.json(estimate);
});

module.exports = router;
