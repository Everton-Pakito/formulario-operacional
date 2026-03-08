
const perguntas = {
  direcao: [
    'Faz uso correto do cinto de segurança?',
    'Mantém atenção em cruzamentos e acessos?',
    'Conduz o veículo de forma consciente e segura?',
    'Mantém distância segura do veículo à frente?',
    'Realiza ultrapassagens somente em local permitido?',
    'Evita formação de comboio?',
    'Adequa a velocidade em curvas acentuadas?',
    'Reduz velocidade em chuva e baixa visibilidade?',
    'Respeita velocidade em trechos de serra?',
    'Utiliza corretamente as setas de direção?',
    'Confere e utiliza faróis de serviço corretamente?'
  ],
  procedimentos: [
    'Confere documentação do cavalo e composições?',
    'Utiliza marcha adequada durante a condução?',
    'Efetua trocas de marcha sem trancos ou ruídos?',
    'Usa corretamente freios e embreagem?',
    'Executa procedimento correto em declives e lombadas?',
    'Executa amarração e desamarração corretamente?',
    'Segue procedimento de carregamento e descarregamento?',
    'Utiliza os EPIs obrigatórios?',
    'Preenche checklist corretamente?',
    'Confere rotograma antes da viagem?',
    'Participa do DDS quando aplicável?',
    'Mantém limpeza e organização do equipamento?',
    'Respeita pontos de parada autorizados?',
    'Executa corretamente subida e descida da cabine?',
    'Utiliza corretamente o rádio/comunicação?',
    'Usa corretamente sistemas de monitoramento?'
  ]
};

const DB_NAME = 'prando-avaliacao-db';
const DB_VERSION = 1;
const DRAFT_STORE = 'drafts';
const HISTORY_STORE = 'history';
const CURRENT_DRAFT_ID = 'current';
const LS_META_KEY = 'prando_avaliacao_meta_v3';
const AUTO_SAVE_DELAY = 500;

const els = {
  form: document.getElementById('avaliacaoForm'),
  direcaoList: document.getElementById('direcaoList'),
  procedimentosList: document.getElementById('procedimentosList'),
  statusPersistencia: document.getElementById('statusPersistencia'),
  statusUltimoSave: document.getElementById('statusUltimoSave'),
  historicoList: document.getElementById('historicoList'),
  printArea: document.getElementById('printArea')
};

let dbPromise = null;
let autoSaveTimer = null;
let signaturePads = {};
let photoCache = {};
let booting = true;

function rotulo(v) {
  if (v === 'conforme') return 'Conforme';
  if (v === 'nao_conforme') return 'Não conforme';
  if (v === 'nao_aplicavel') return 'Não aplicável';
  return 'Não respondido';
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbPut(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function criarQuestoes() {
  for (const [grupo, itens] of Object.entries(perguntas)) {
    const target = grupo === 'direcao' ? els.direcaoList : els.procedimentosList;
    target.innerHTML = '';

    itens.forEach((texto, idx) => {
      const id = `${grupo}_${idx}`;
      const card = document.createElement('div');
      card.className = 'question-card';
      card.innerHTML = `
        <div class="question-title">${idx + 1}. ${texto}</div>
        <div class="choices">
          ${['conforme','nao_conforme','nao_aplicavel'].map(v => `
            <label class="choice">
              <input type="radio" name="${id}" value="${v}" />
              <span>${rotulo(v)}</span>
            </label>
          `).join('')}
        </div>

        <div class="meta-grid">
          <label>
            <span>Justificativa</span>
            <textarea data-justificativa="${id}" rows="2" placeholder="Descreva a observação quando necessário"></textarea>
            <small class="help">Obrigatória quando marcar Não conforme.</small>
          </label>

          <label>
            <span>Fotos</span>
            <input type="file" data-fotos="${id}" accept="image/*" multiple />
            <small class="help">As imagens são salvas localmente no dispositivo.</small>
            <div class="photo-preview-list" data-preview="${id}"></div>
          </label>
        </div>
      `;
      target.appendChild(card);
    });
  }
}

function setupSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');

  function resizeCanvas(keepImage = true) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    const snapshot = keepImage ? canvas.toDataURL('image/png') : null;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    if (snapshot && snapshot !== 'data:,') {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = snapshot;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }

  resizeCanvas(false);
  window.addEventListener('resize', () => resizeCanvas(true));

  let drawing = false;
  let moved = false;

  const getPos = e => {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = e => {
    drawing = true;
    moved = false;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  };

  const move = e => {
    if (!drawing) return;
    moved = true;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    e.preventDefault();
  };

  const end = () => {
    if (!drawing) return;
    drawing = false;
    if (moved) triggerAutoSave();
  };

  ['mousedown', 'touchstart'].forEach(ev => canvas.addEventListener(ev, start, { passive: false }));
  ['mousemove', 'touchmove'].forEach(ev => canvas.addEventListener(ev, move, { passive: false }));
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => canvas.addEventListener(ev, end));

  signaturePads[canvasId] = {
    clear() {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    },
    toDataURL() {
      return canvas.toDataURL('image/png');
    },
    fromDataURL(dataUrl) {
      this.clear();
      if (!dataUrl || dataUrl === 'data:,') return;
      const img = new Image();
      img.onload = () => {
        const rect = canvas.getBoundingClientRect();
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = dataUrl;
    }
  };
}

function bindEvents() {
  document.addEventListener('input', event => {
    if (event.target.matches('input[type="text"], input[type="date"], input[type="number"], textarea')) {
      calcular();
      triggerAutoSave();
    }
  });

  document.addEventListener('change', async event => {
    const target = event.target;

    if (target.matches('input[type="radio"]')) {
      calcular();
      triggerAutoSave();
      return;
    }

    if (target.matches('input[type="file"][data-fotos]')) {
      const id = target.dataset.fotos;
      const files = Array.from(target.files || []);
      const existing = photoCache[id] || [];
      const converted = await Promise.all(files.map(fileToDataUrl));
      photoCache[id] = existing.concat(converted.map((dataUrl, index) => ({
        id: cryptoRandom(),
        name: files[index].name,
        dataUrl
      })));
      renderPhotoPreview(id);
      target.value = '';
      triggerAutoSave();
      return;
    }
  });

  document.querySelectorAll('[data-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.clear;
      signaturePads[id].clear();
      triggerAutoSave();
    });
  });

  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-remove-photo]');
    if (!btn) return;
    const qid = btn.dataset.removePhoto;
    const pid = btn.dataset.photoId;
    photoCache[qid] = (photoCache[qid] || []).filter(item => item.id !== pid);
    renderPhotoPreview(qid);
    triggerAutoSave();
  });

  document.getElementById('btnSalvar').addEventListener('click', async () => {
    await saveDraft(true);
    await salvarNoHistorico();
    await renderHistorico();
    alert('Avaliação salva localmente com sucesso.');
  });

  document.getElementById('btnNovoFormulario').addEventListener('click', async () => {
    const ok = confirm('Deseja iniciar um novo formulário? O rascunho atual será limpo do formulário. Antes disso, salve se quiser manter uma cópia no histórico.');
    if (!ok) return;
    await clearCurrentDraft();
    limparFormulario();
    calcular();
    updateSaveStatus('Novo formulário iniciado.');
  });

  document.getElementById('btnPdf').addEventListener('click', async () => {
    await saveDraft(true);
    await gerarRelatorioImpressao();
    window.print();
  });
}

function cryptoRandom() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formValue(name) {
  return els.form.querySelector(`[name="${name}"]`)?.value || '';
}

function getAnsweredQuestionIds() {
  const ids = [];
  for (const [grupo, itens] of Object.entries(perguntas)) {
    itens.forEach((_, idx) => ids.push(`${grupo}_${idx}`));
  }
  return ids;
}

function collectDraft() {
  const formData = Object.fromEntries(new FormData(els.form).entries());
  const respostas = {};
  for (const id of getAnsweredQuestionIds()) {
    respostas[id] = {
      resposta: document.querySelector(`input[name="${id}"]:checked`)?.value || '',
      justificativa: document.querySelector(`[data-justificativa="${id}"]`)?.value || '',
      fotos: photoCache[id] || []
    };
  }

  return {
    id: CURRENT_DRAFT_ID,
    updatedAt: new Date().toISOString(),
    formData,
    respostas,
    assinaturas: {
      motorista: signaturePads.assinaturaMotorista.toDataURL(),
      instrutor: signaturePads.assinaturaInstrutor.toDataURL()
    },
    metricas: getMetricas()
  };
}

function getMetricas() {
  let possiveis = 0;
  let realizados = 0;
  let nc = 0;
  let na = 0;

  for (const [grupo, itens] of Object.entries(perguntas)) {
    itens.forEach((_, idx) => {
      const answer = document.querySelector(`input[name="${grupo}_${idx}"]:checked`)?.value || '';
      if (!answer) return;
      if (answer === 'nao_aplicavel') {
        na += 1;
        return;
      }
      possiveis += 1;
      if (answer === 'conforme') realizados += 1;
      if (answer === 'nao_conforme') nc += 1;
    });
  }

  const aproveitamento = possiveis ? Math.round((realizados / possiveis) * 100) : 0;
  const status = !possiveis ? 'Em avaliação' : (aproveitamento >= 80 && nc <= 3 ? 'Aprovado' : 'Reprovado');

  return { possiveis, realizados, nc, na, aproveitamento, status };
}

function calcular() {
  const m = getMetricas();
  document.getElementById('pontosPossiveis').textContent = m.possiveis;
  document.getElementById('pontosRealizados').textContent = m.realizados;
  document.getElementById('naoConformidades').textContent = m.nc;
  document.getElementById('naoAplicaveis').textContent = m.na;
  document.getElementById('aproveitamento').textContent = `${m.aproveitamento}%`;

  const status = document.getElementById('statusFinal');
  status.textContent = m.status;
  status.className = m.status === 'Aprovado' ? 'status-ok' : (m.status === 'Reprovado' ? 'status-bad' : '');
}

function renderPhotoPreview(questionId) {
  const wrap = document.querySelector(`[data-preview="${questionId}"]`);
  if (!wrap) return;
  const fotos = photoCache[questionId] || [];
  wrap.innerHTML = fotos.map(item => `
    <div class="photo-chip">
      <img src="${item.dataUrl}" alt="Foto do item" />
      <button type="button" class="ghost" data-remove-photo="${questionId}" data-photo-id="${item.id}">Excluir</button>
    </div>
  `).join('');
}

function applyDraft(draft) {
  limparFormulario(false);

  if (draft?.formData) {
    Object.entries(draft.formData).forEach(([name, value]) => {
      const field = els.form.querySelector(`[name="${name}"]`);
      if (field && field.type !== 'file') field.value = value;
    });
  }

  photoCache = {};
  for (const id of getAnsweredQuestionIds()) {
    const info = draft?.respostas?.[id];
    if (info?.resposta) {
      const radio = document.querySelector(`input[name="${id}"][value="${info.resposta}"]`);
      if (radio) radio.checked = true;
    }
    const just = document.querySelector(`[data-justificativa="${id}"]`);
    if (just) just.value = info?.justificativa || '';

    photoCache[id] = Array.isArray(info?.fotos) ? info.fotos : [];
    renderPhotoPreview(id);
  }

  signaturePads.assinaturaMotorista.fromDataURL(draft?.assinaturas?.motorista || '');
  signaturePads.assinaturaInstrutor.fromDataURL(draft?.assinaturas?.instrutor || '');
  calcular();
}

function limparFormulario(clearStatus = true) {
  els.form.reset();
  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  document.querySelectorAll('[data-justificativa]').forEach(t => t.value = '');
  photoCache = {};
  document.querySelectorAll('[data-preview]').forEach(div => div.innerHTML = '');
  if (signaturePads.assinaturaMotorista) signaturePads.assinaturaMotorista.clear();
  if (signaturePads.assinaturaInstrutor) signaturePads.assinaturaInstrutor.clear();
  if (clearStatus) {
    localStorage.removeItem(LS_META_KEY);
  }
}

async function saveDraft(showCleanMessage = false) {
  const draft = collectDraft();
  await idbPut(DRAFT_STORE, draft);

  const meta = {
    updatedAt: draft.updatedAt,
    motorista: draft.formData.motorista || '',
    placa: draft.formData.placa || '',
    status: draft.metricas.status
  };
  localStorage.setItem(LS_META_KEY, JSON.stringify(meta));

  const when = new Date(draft.updatedAt).toLocaleString('pt-BR');
  updateSaveStatus(showCleanMessage ? `Salvo em ${when}` : `Rascunho salvo automaticamente em ${when}`);
}

async function salvarNoHistorico() {
  const draft = collectDraft();
  const id = `${Date.now()}`;
  const item = {
    ...draft,
    id,
    title: `${draft.formData.motorista || 'Sem motorista'} - ${draft.formData.placa || 'Sem placa'}`,
    savedAt: new Date().toISOString()
  };
  await idbPut(HISTORY_STORE, item);
}

async function clearCurrentDraft() {
  await idbDelete(DRAFT_STORE, CURRENT_DRAFT_ID);
  localStorage.removeItem(LS_META_KEY);
}

function updateSaveStatus(message) {
  els.statusPersistencia.textContent = 'Rascunho protegido';
  els.statusUltimoSave.textContent = message;
}

function triggerAutoSave() {
  if (booting) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveDraft(false).catch(() => {
      els.statusPersistencia.textContent = 'Falha ao salvar';
      els.statusUltimoSave.textContent = 'Tente salvar manualmente.';
    });
  }, AUTO_SAVE_DELAY);
}

async function restoreOnLoad() {
  const localMeta = JSON.parse(localStorage.getItem(LS_META_KEY) || 'null');
  const draft = await idbGet(DRAFT_STORE, CURRENT_DRAFT_ID);
  if (draft) {
    applyDraft(draft);
    const when = new Date(draft.updatedAt).toLocaleString('pt-BR');
    updateSaveStatus(`Rascunho restaurado. Último salvamento: ${when}`);
  } else if (localMeta) {
    updateSaveStatus(`Meta local encontrada em ${new Date(localMeta.updatedAt).toLocaleString('pt-BR')}, mas sem rascunho completo no banco local.`);
  } else {
    els.statusPersistencia.textContent = 'Sem rascunho salvo';
    els.statusUltimoSave.textContent = 'Preencha o formulário. O app salva automaticamente.';
  }
}

async function renderHistorico() {
  const itens = await idbGetAll(HISTORY_STORE);
  itens.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  if (!itens.length) {
    els.historicoList.innerHTML = `<p class="muted">Nenhuma cópia salva no histórico ainda.</p>`;
    return;
  }

  els.historicoList.innerHTML = itens.slice(0, 10).map(item => `
    <div class="history-card">
      <div>
        <p><strong>${escapeHtml(item.title || 'Avaliação salva')}</strong></p>
        <p class="muted">${new Date(item.savedAt).toLocaleString('pt-BR')} • ${escapeHtml(item.metricas?.status || 'Sem status')}</p>
      </div>
      <div class="top-actions">
        <button type="button" class="ghost" data-load-history="${item.id}">Carregar</button>
        <button type="button" class="ghost danger" data-delete-history="${item.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  els.historicoList.querySelectorAll('[data-load-history]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const item = await idbGet(HISTORY_STORE, btn.dataset.loadHistory);
      if (!item) return;
      applyDraft(item);
      await saveDraft(true);
      alert('Avaliação carregada no formulário atual.');
    });
  });

  els.historicoList.querySelectorAll('[data-delete-history]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = confirm('Excluir esta cópia do histórico?');
      if (!ok) return;
      await idbDelete(HISTORY_STORE, btn.dataset.deleteHistory);
      await renderHistorico();
    });
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildRows(grupo) {
  return perguntas[grupo].map((texto, idx) => {
    const id = `${grupo}_${idx}`;
    const resposta = document.querySelector(`input[name="${id}"]:checked`)?.value || '';
    const justificativa = document.querySelector(`[data-justificativa="${id}"]`)?.value || '';
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(texto)}</td>
        <td>${escapeHtml(rotulo(resposta))}</td>
        <td>${escapeHtml(justificativa || '-')}</td>
      </tr>
    `;
  }).join('');
}

function collectPrintablePhotos() {
  const entries = [];
  for (const [grupo, itens] of Object.entries(perguntas)) {
    itens.forEach((texto, idx) => {
      const id = `${grupo}_${idx}`;
      const fotos = photoCache[id] || [];
      fotos.forEach((foto, fidx) => {
        entries.push({
          legenda: `${texto} (${fidx + 1})`,
          dataUrl: foto.dataUrl
        });
      });
    });
  }
  return entries;
}

async function gerarRelatorioImpressao() {
  const draft = collectDraft();
  const info = draft.formData;
  const m = draft.metricas;
  const fotos = collectPrintablePhotos();

  const page1 = `
    <div class="print-page">
      <div class="print-header">
        <img src="Logo-prando-dourada.png" alt="Prando" />
        <div class="print-title">
          <h1>Avaliação Prática de Direção</h1>
          <p>Logística Florestal • Relatório operacional em formato A4</p>
        </div>
      </div>

      <div class="print-grid">
        ${printField('Unidade', info.unidade)}
        ${printField('Data', info.data)}
        ${printField('KM Início', info.kmInicio)}
        ${printField('KM Final', info.kmFinal)}
        ${printField('Motorista', info.motorista)}
        ${printField('Instrutor', info.instrutor)}
        ${printField('Placa', info.placa)}
        ${printField('Nº da Viagem', info.viagem)}
        ${printField('Empresa', info.empresa, true)}
        ${printField('Observações Gerais', info.observacoesGerais, true)}
      </div>

      <div class="print-section">
        <h2>Resumo</h2>
        <div class="print-summary">
          <div class="print-box"><span>Pontos possíveis</span><strong>${m.possiveis}</strong></div>
          <div class="print-box"><span>Pontos realizados</span><strong>${m.realizados}</strong></div>
          <div class="print-box"><span>Não conformidades</span><strong>${m.nc}</strong></div>
          <div class="print-box"><span>Aproveitamento</span><strong>${m.aproveitamento}%</strong></div>
        </div>
      </div>

      <div class="print-section">
        <h2>Direção Preventiva</h2>
        <table class="print-table">
          <thead>
            <tr>
              <th style="width:8%">#</th>
              <th style="width:42%">Item</th>
              <th style="width:18%">Resposta</th>
              <th style="width:32%">Justificativa</th>
            </tr>
          </thead>
          <tbody>${buildRows('direcao')}</tbody>
        </table>
      </div>

      <div class="print-footer">Prando - Operação Florestal Suzano</div>
    </div>
  `;

  const page2Photos = fotos.length ? `
    <div class="print-section">
      <h2>Registro fotográfico</h2>
      <div class="print-photos">
        ${fotos.map(f => `
          <figure>
            <img src="${f.dataUrl}" alt="Foto anexada" />
            <figcaption>${escapeHtml(f.legenda)}</figcaption>
          </figure>
        `).join('')}
      </div>
    </div>
  ` : `
    <div class="print-section">
      <h2>Registro fotográfico</h2>
      <p>Nenhuma foto anexada nesta avaliação.</p>
    </div>
  `;

  const page2 = `
    <div class="print-page">
      <div class="print-header">
        <img src="Logo-prando-dourada.png" alt="Prando" />
        <div class="print-title">
          <h1>Avaliação Prática de Direção</h1>
          <p>Continuação do relatório • Procedimentos, fotos e assinaturas</p>
        </div>
      </div>

      <div class="print-section">
        <h2>Procedimentos e Normas Gerais de Ação</h2>
        <table class="print-table">
          <thead>
            <tr>
              <th style="width:8%">#</th>
              <th style="width:42%">Item</th>
              <th style="width:18%">Resposta</th>
              <th style="width:32%">Justificativa</th>
            </tr>
          </thead>
          <tbody>${buildRows('procedimentos')}</tbody>
        </table>
      </div>

      ${page2Photos}

      <div class="print-section">
        <h2>Assinaturas</h2>
        <div class="print-signatures">
          <div class="sign">
            <img src="${draft.assinaturas.motorista}" alt="Assinatura do Motorista" />
            <strong>Motorista</strong>
          </div>
          <div class="sign">
            <img src="${draft.assinaturas.instrutor}" alt="Assinatura do Instrutor" />
            <strong>Instrutor</strong>
          </div>
        </div>
      </div>

      <div class="print-footer">Prando - Operação Florestal Suzano</div>
    </div>
  `;

  els.printArea.innerHTML = page1 + page2;
}

function printField(key, value, full = false) {
  return `
    <div class="print-field ${full ? 'full' : ''}">
      <span class="k">${escapeHtml(key)}</span>
      <span class="v">${escapeHtml(value || '-')}</span>
    </div>
  `;
}

async function init() {
  criarQuestoes();
  setupSignaturePad('assinaturaMotorista');
  setupSignaturePad('assinaturaInstrutor');
  bindEvents();
  await restoreOnLoad();
  await renderHistorico();
  calcular();
  booting = false;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}

init().catch(err => {
  console.error(err);
  els.statusPersistencia.textContent = 'Falha na inicialização';
  els.statusUltimoSave.textContent = 'Reabra o app.';
});
