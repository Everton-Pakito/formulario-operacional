const STORAGE_KEY = 'prando_avaliacao_rascunho_v4';
const FORM_ARCHIVE_KEY = 'prando_avaliacao_historico_v1';
const DB_NAME = 'prando_avaliacao_db';
const DB_STORE = 'drafts';
const DRAFT_ID = 'current';

const questions = [
'Fez uso do cinto de segurança?',
'Apresenta alguma alteração em condições ambientais adversas como chuva, sol, neblina?',
'Teve atenção na condução em cruzamentos sinalizados ou sem sinalização?',
'Conduz o veículo de forma consciente e segura quando está em rodovia?',
'Conduz o veículo de forma prevenida de acordo com as adversidades do trânsito?',
'Mantém a distância segura entre veículos?',
'Executou somente ultrapassagem permitida?',
'Participou da formação de comboio?',
'Realiza curvas acentuadas em velocidade compatível?',
'Respeita uma velocidade de segurança na chuva ou em condições precárias de tráfego?',
'Respeita uma velocidade de segurança em trechos de serra?',
'Faz a utilização correta das setas?',
'Confere se os faróis de serviço estão ligados?',
'Confere a documentação do cavalo e composições?',
'Utiliza marcha adequada para colocar o veículo em movimento?',
'As trocas de marcha ocorrem sem trancos e ruído?',
'Faz uso correto dos freios e embreagem?',
'Passa de forma adequada por declives, lombadas e semáforos?',
'Executa procedimentos corretos durante a amarração e desamarração da carga?',
'Executa procedimentos corretos durante o carregamento e descarregamento?',
'Fez uso dos equipamentos de proteção individual (EPI\'s)?',
'Preencheu corretamente o checklist?',
'Conferiu as informações do rotograma?',
'Participou de DDS?',
'Cuida da aparência pessoal?',
'Realiza a limpeza do equipamento?',
'Respeitou os pontos de parada autorizadas?',
'Executa corretamente o procedimento de subir e descer da cabine?',
'Faz utilização correta do rádio?',
'Utiliza corretamente os sistemas de monitoramento da direção segura?'
];

let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function idbSet(value) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put({ id: DRAFT_ID, payload: value, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IndexedDB indisponível', e);
  }
}

async function idbGet() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(DRAFT_ID);
      req.onsuccess = () => resolve(req.result ? req.result.payload : null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IndexedDB indisponível', e);
    return null;
  }
}

async function idbDelete() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(DRAFT_ID);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IndexedDB indisponível', e);
  }
}

function buildQuestions() {
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';
  questions.forEach((text, index) => {
    const id = index + 1;
    const card = document.createElement('details');
    card.className = 'question-card';
    card.dataset.questionId = id;
    if (id <= 2) card.open = true;
    card.innerHTML = `
      <summary class="question-summary">
        <span class="question-number">${id}</span>
        <span class="question-title">${text}</span>
        <span class="question-status" id="status_q_${id}">Pendente</span>
        <span class="chevron">▾</span>
      </summary>
      <div class="question-body">
        <div class="options">
          <label><input type="radio" name="q_${id}" value="conforme"> Conforme</label>
          <label><input type="radio" name="q_${id}" value="nao_conforme"> Não Conforme</label>
          <label><input type="radio" name="q_${id}" value="nao_aplicavel"> Não Aplicável</label>
        </div>
        <div class="question-meta">
          <label>Justificativa
            <textarea rows="3" id="justificativa_${id}" placeholder="Descreva a observação, orientação ou não conformidade"></textarea>
          </label>
          <label>Fotos
            <input type="file" id="foto_${id}" accept="image/*" multiple />
            <div class="image-preview" id="preview_${id}"></div>
          </label>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

function updateQuestionVisual(id) {
  const value = document.querySelector(`input[name="q_${id}"]:checked`)?.value || '';
  const statusEl = document.getElementById(`status_q_${id}`);
  if (!statusEl) return;
  statusEl.className = 'question-status';
  if (!value) {
    statusEl.textContent = 'Pendente';
    return;
  }
  if (value === 'conforme') {
    statusEl.textContent = 'Conforme';
    statusEl.classList.add('is-ok');
    return;
  }
  if (value === 'nao_conforme') {
    statusEl.textContent = 'Não Conforme';
    statusEl.classList.add('is-nc');
    return;
  }
  statusEl.textContent = 'Não Aplicável';
  statusEl.classList.add('is-na');
}

function setAllQuestionCards(open) {
  document.querySelectorAll('.question-card').forEach(card => {
    card.open = open;
  });
}

function getFieldIds() {
  return ['data','unidade','codigo','empresa','motorista','instrutor','placa','viagem','kmInicio','kmFinal','observacoesGerais'];
}

function getSignatureData(canvasId) {
  const canvas = document.getElementById(canvasId);
  return isCanvasBlank(canvas) ? '' : canvas.toDataURL('image/png');
}

function collectFormData() {
  const metadata = {};
  getFieldIds().forEach(id => metadata[id] = document.getElementById(id).value || '');

  const respostas = questions.map((q, idx) => {
    const id = idx + 1;
    const checked = document.querySelector(`input[name="q_${id}"]:checked`);
    const previewImgs = [...document.querySelectorAll(`#preview_${id} img`)];
    return {
      id,
      pergunta: q,
      resposta: checked ? checked.value : '',
      justificativa: document.getElementById(`justificativa_${id}`).value || '',
      fotos: previewImgs.map(img => img.src)
    };
  });

  return {
    metadata,
    respostas,
    assinaturaMotorista: getSignatureData('assinaturaMotorista'),
    assinaturaInstrutor: getSignatureData('assinaturaInstrutor'),
    updatedAt: new Date().toISOString()
  };
}

function applyFormData(data) {
  if (!data) return;
  if (data.metadata) {
    getFieldIds().forEach(id => {
      document.getElementById(id).value = data.metadata[id] || '';
    });
  }
  if (Array.isArray(data.respostas)) {
    data.respostas.forEach(item => {
      if (item.resposta) {
        const radio = document.querySelector(`input[name="q_${item.id}"][value="${item.resposta}"]`);
        if (radio) radio.checked = true;
      }
      const textarea = document.getElementById(`justificativa_${item.id}`);
      if (textarea) textarea.value = item.justificativa || '';
      const preview = document.getElementById(`preview_${item.id}`);
      if (preview) {
        preview.innerHTML = '';
        (item.fotos || []).forEach(src => addPreviewImage(preview, src));
      }
      updateQuestionVisual(item.id);
    });
  }
  if (data.assinaturaMotorista) drawImageOnCanvas('assinaturaMotorista', data.assinaturaMotorista);
  if (data.assinaturaInstrutor) drawImageOnCanvas('assinaturaInstrutor', data.assinaturaInstrutor);
  updateSummary();
}

function addPreviewImage(previewElement, src) {
  const img = document.createElement('img');
  img.src = src;
  previewElement.appendChild(img);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleFiles(input) {
  const qid = input.id.split('_')[1];
  const preview = document.getElementById(`preview_${qid}`);
  const files = [...input.files];
  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    addPreviewImage(preview, dataUrl);
  }
  input.value = '';
  persistDraft();
}

function updateSummary() {
  let possiveis = 0, realizados = 0, nc = 0, na = 0;
  questions.forEach((_, idx) => {
    const qid = idx + 1;
    const value = document.querySelector(`input[name="q_${qid}"]:checked`)?.value || '';
    updateQuestionVisual(qid);
    if (!value) return;
    if (value === 'nao_aplicavel') {
      na++;
      return;
    }
    possiveis++;
    if (value === 'conforme') realizados++;
    if (value === 'nao_conforme') nc++;
  });

  const aproveitamento = possiveis ? Math.round((realizados / possiveis) * 100) : 0;
  const status = possiveis === 0 ? 'Pendente' : (aproveitamento >= 80 ? 'Aprovado' : 'Reprovado');
  document.getElementById('pontosPossiveis').textContent = possiveis;
  document.getElementById('pontosRealizados').textContent = realizados;
  document.getElementById('naoConformidades').textContent = nc;
  document.getElementById('naoAplicaveis').textContent = na;
  document.getElementById('aproveitamento').textContent = `${aproveitamento}%`;
  const statusEl = document.getElementById('statusFinal');
  statusEl.textContent = status;
  statusEl.className = status === 'Aprovado' ? 'badge-ok' : (status === 'Reprovado' ? 'badge-nc' : 'badge-na');
}

async function persistDraft() {
  const data = collectFormData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await idbSet(data);
}

function archiveCurrentForm(data) {
  const existing = JSON.parse(localStorage.getItem(FORM_ARCHIVE_KEY) || '[]');
  existing.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    savedAt: new Date().toISOString(),
    motorista: data.metadata?.motorista || '',
    placa: data.metadata?.placa || '',
    data: data.metadata?.data || '',
    payload: data
  });
  localStorage.setItem(FORM_ARCHIVE_KEY, JSON.stringify(existing.slice(0, 20)));
}

async function loadDraft() {
  const fromIdb = await idbGet();
  const fromLs = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  applyFormData(fromIdb || fromLs);
}

function clearSignatureCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function clearFormUi() {
  getFieldIds().forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  questions.forEach((_, idx) => {
    const id = idx + 1;
    document.querySelectorAll(`input[name="q_${id}"]`).forEach(radio => { radio.checked = false; });
    const textarea = document.getElementById(`justificativa_${id}`);
    if (textarea) textarea.value = '';
    const preview = document.getElementById(`preview_${id}`);
    if (preview) preview.innerHTML = '';
    const fileInput = document.getElementById(`foto_${id}`);
    if (fileInput) fileInput.value = '';
    updateQuestionVisual(id);
  });

  clearSignatureCanvas('assinaturaMotorista');
  clearSignatureCanvas('assinaturaInstrutor');
  setAllQuestionCards(false);
  const firstCard = document.querySelector('.question-card');
  if (firstCard) firstCard.open = true;
  updateSummary();
}

async function newForm() {
  if (!confirm('Deseja iniciar um novo formulário? O rascunho atual será arquivado e o formulário será limpo.')) return;
  const current = collectFormData();
  const hasContent = JSON.stringify(current.metadata).match(/[\wÀ-ÿ]/) || current.respostas.some(r => r.resposta || r.justificativa || (r.fotos && r.fotos.length)) || current.assinaturaMotorista || current.assinaturaInstrutor;
  if (hasContent) archiveCurrentForm(current);
  localStorage.removeItem(STORAGE_KEY);
  await idbDelete();
  clearFormUi();
  await persistDraft();
  alert('Novo formulário iniciado. O formulário anterior foi limpo deste aparelho.');
}

function setupAutosave() {
  document.querySelectorAll('input, textarea, select').forEach(el => {
    const eventName = el.type === 'radio' || el.type === 'file' ? 'change' : 'input';
    el.addEventListener(eventName, () => {
      updateSummary();
      persistDraft();
    });
  });

  questions.forEach((_, idx) => {
    document.getElementById(`foto_${idx + 1}`).addEventListener('change', e => handleFiles(e.target));
  });
}

function setupSignatures() {
  ['assinaturaMotorista', 'assinaturaInstrutor'].forEach(setupSignaturePad);
  document.querySelectorAll('[data-clear-signature]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.clearSignature;
      const canvas = document.getElementById(id);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      persistDraft();
    });
  });
}

function setupSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#111827';

  const resizeCanvas = () => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    const snapshot = isCanvasBlank(canvas) ? null : canvas.toDataURL('image/png');
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    if (snapshot) drawImageOnCanvas(canvasId, snapshot);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let drawing = false;
  const point = evt => {
    const rect = canvas.getBoundingClientRect();
    const source = evt.touches ? evt.touches[0] : evt;
    return { x: source.clientX - rect.left, y: source.clientY - rect.top };
  };
  const start = evt => { drawing = true; const p = point(evt); ctx.beginPath(); ctx.moveTo(p.x, p.y); evt.preventDefault(); };
  const move = evt => { if (!drawing) return; const p = point(evt); ctx.lineTo(p.x, p.y); ctx.stroke(); evt.preventDefault(); };
  const end = () => { if (drawing) persistDraft(); drawing = false; };
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);
}

function drawImageOnCanvas(canvasId, src) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.drawImage(img, 0, 0, w, h);
  };
  img.src = src;
}

function isCanvasBlank(canvas) {
  const ctx = canvas.getContext('2d');
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return !pixels.some(channel => channel !== 0);
}

async function saveCurrentForm() {
  updateSummary();
  await persistDraft();
  alert('Formulário salvo com sucesso no dispositivo.');
}

function printPdf() {
  setAllQuestionCards(true);
  window.print();
}

function bindAction(button, action) {
  if (!button) return;
  if (action === 'salvar') button.addEventListener('click', saveCurrentForm);
  if (action === 'novo') button.addEventListener('click', newForm);
  if (action === 'pdf') button.addEventListener('click', printPdf);
}

function setupButtons() {
  bindAction(document.getElementById('btnSalvar'), 'salvar');
  bindAction(document.getElementById('btnNovo'), 'novo');
  bindAction(document.getElementById('btnPdf'), 'pdf');
  document.querySelectorAll('[data-action]').forEach(btn => bindAction(btn, btn.dataset.action));
  document.getElementById('btnExpandir')?.addEventListener('click', () => setAllQuestionCards(true));
  document.getElementById('btnRecolher')?.addEventListener('click', () => setAllQuestionCards(false));
}

async function init() {
  buildQuestions();
  setupAutosave();
  setupSignatures();
  setupButtons();
  await loadDraft();
  updateSummary();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
  }
}

document.addEventListener('DOMContentLoaded', init);
