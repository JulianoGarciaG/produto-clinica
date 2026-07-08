(function () {
  const POLL_MS = 15 * 1000; // painel interno pode atualizar mais rapido que o publico

  const loginPanel = document.getElementById('login-panel');
  const dashboard = document.getElementById('dashboard');
  const loginPassword = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  const pausePill = document.getElementById('pause-pill');
  const avgTimeEl = document.getElementById('avg-time');
  const lastUpdatedEl = document.getElementById('last-updated');
  const pauseBtn = document.getElementById('pause-btn');
  const avgInput = document.getElementById('avg-input');
  const avgSetBtn = document.getElementById('avg-set-btn');
  const avgClearBtn = document.getElementById('avg-clear-btn');
  const queueBody = document.getElementById('queue-body');
  const emptyMsg = document.getElementById('empty-msg');

  let currentPaused = false;
  let pollHandle = null;

  function formatHHMM(isoString) {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function minutesSince(isoString) {
    return Math.round((Date.now() - new Date(isoString).getTime()) / 60000);
  }

  function showDashboard() {
    loginPanel.style.display = 'none';
    dashboard.style.display = 'block';
    loadQueue();
    if (!pollHandle) pollHandle = setInterval(loadQueue, POLL_MS);
  }

  function showLogin(message) {
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
    dashboard.style.display = 'none';
    loginPanel.style.display = 'block';
    loginError.textContent = message || '';
  }

  async function loadQueue() {
    const res = await fetch('/admin/api/queue');
    if (res.status === 401) return showLogin();
    if (!res.ok) return;
    const data = await res.json();

    currentPaused = data.paused;
    pausePill.textContent = data.paused ? 'Pausada' : 'Ativa';
    pausePill.className = 'pill ' + (data.paused ? 'pill-paused' : 'pill-active');
    pauseBtn.textContent = data.paused ? 'Retomar fila' : 'Pausar fila';
    avgTimeEl.textContent = data.avgServiceTimeMinutes;
    lastUpdatedEl.textContent = formatHHMM(data.lastUpdatedAt);

    queueBody.innerHTML = '';
    if (data.entries.length === 0) {
      emptyMsg.style.display = 'block';
    } else {
      emptyMsg.style.display = 'none';
      data.entries.forEach((entry, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${formatHHMM(entry.arrival_time)}</td>
          <td>${minutesSince(entry.arrival_time)} min</td>
          <td class="row-actions">
            <button class="btn-checkout" data-id="${entry.id}">Check-out</button>
            <button class="btn-remove" data-id="${entry.id}">Remover</button>
          </td>`;
        queueBody.appendChild(tr);
      });
    }
  }

  loginBtn.addEventListener('click', async () => {
    loginError.textContent = '';
    const res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginPassword.value })
    });
    if (res.ok) {
      loginPassword.value = '';
      showDashboard();
    } else {
      loginError.textContent = 'Senha invalida.';
    }
  });

  loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/admin/api/logout', { method: 'POST' });
    showLogin();
  });

  queueBody.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains('btn-checkout')) {
      await fetch(`/admin/api/checkout/${id}`, { method: 'POST' });
    } else if (e.target.classList.contains('btn-remove')) {
      if (!confirm('Remover esta entrada da fila?')) return;
      await fetch(`/admin/api/queue/${id}`, { method: 'DELETE' });
    }
    loadQueue();
  });

  pauseBtn.addEventListener('click', async () => {
    await fetch('/admin/api/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused: !currentPaused })
    });
    loadQueue();
  });

  avgSetBtn.addEventListener('click', async () => {
    const minutes = Number(avgInput.value);
    if (!minutes || minutes <= 0) return;
    await fetch('/admin/api/avg-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes })
    });
    avgInput.value = '';
    loadQueue();
  });

  avgClearBtn.addEventListener('click', async () => {
    await fetch('/admin/api/avg-clear', { method: 'POST' });
    loadQueue();
  });

  // Estado inicial: verifica se ja existe sessao valida (cookie httpOnly)
  (async () => {
    const res = await fetch('/admin/api/session');
    const data = await res.json();
    if (data.authenticated) showDashboard();
    else showLogin();
  })();
})();
