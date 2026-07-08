(function () {
  const POLL_MS = 5 * 60 * 1000; // ciclo de 5 minutos, igual ao backend
  const TOKEN_KEY = 'clinica_checkin_token';

  const minutesEl = document.getElementById('minutes');
  const minutesLabelEl = document.getElementById('minutes-label');
  const modeHintEl = document.getElementById('mode-hint');
  const lastUpdatedEl = document.getElementById('last-updated');
  const checkinBtn = document.getElementById('checkin-btn');
  const checkinStatusEl = document.getElementById('checkin-status');

  function formatHHMM(isoString) {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function getStoredToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function render(data) {
    lastUpdatedEl.textContent = formatHHMM(data.lastUpdatedAt);

    if (data.paused) {
      minutesEl.textContent = '--';
      minutesLabelEl.textContent = 'fila pausada';
      modeHintEl.textContent = 'O atendimento esta temporariamente pausado. Aguarde novas atualizacoes.';
      return;
    }

    minutesEl.textContent = data.estimatedMinutes;
    minutesLabelEl.textContent = data.estimatedMinutes === 1 ? 'minuto' : 'minutos';

    modeHintEl.textContent =
      data.mode === 'personalizado'
        ? 'Estimativa baseada na sua posicao na fila.'
        : 'Tempo medio atual da fila (faca check-in para uma estimativa personalizada).';
  }

  async function fetchWaitTime() {
    const token = getStoredToken();
    const url = token ? `/wait-time?token=${encodeURIComponent(token)}` : '/wait-time';
    try {
      const res = await fetch(url);
      const data = await res.json();
      render(data);
    } catch (err) {
      // Nunca deixar tela vazia: mantem ultimo valor exibido em caso de falha de rede.
      modeHintEl.textContent = 'Nao foi possivel atualizar agora. Mostrando ultima estimativa conhecida.';
    }
  }

  async function doCheckin() {
    checkinBtn.disabled = true;
    try {
      const res = await fetch('/checkin', { method: 'POST' });
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      checkinStatusEl.textContent = 'Presenca confirmada!';
      checkinBtn.textContent = 'Presenca confirmada';
      await fetchWaitTime();
    } catch (err) {
      checkinBtn.disabled = false;
      checkinStatusEl.textContent = 'Falha ao confirmar presenca. Tente novamente.';
    }
  }

  if (getStoredToken()) {
    checkinBtn.textContent = 'Presenca ja confirmada';
    checkinBtn.disabled = true;
  } else {
    checkinBtn.addEventListener('click', doCheckin);
  }

  fetchWaitTime();
  setInterval(fetchWaitTime, POLL_MS);
})();
