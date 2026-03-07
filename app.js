const STORAGE_KEY = 'prando_teste_pratico_direcao_v1';

const generalFields = [
  { id: 'unidade', label: 'Unidade / Local', type: 'text', span: 4, placeholder: 'Ex.: 035 - UNF SP' },
  { id: 'codigo', label: 'Código da avaliação', type: 'text', span: 4, placeholder: 'Ex.: F26030600132' },
  { id: 'dataAvaliacao', label: 'Data da avaliação', type: 'date', span: 4 },
  { id: 'horaInicio', label: 'Hora início', type: 'time', span: 3 },
  { id: 'horaFim', label: 'Hora fim', type: 'time', span: 3 },
  { id: 'origem', label: 'Origem', type: 'select', span: 3, options: ['Via mobile', 'Presencial', 'Tablet', 'Outro'] },
  { id: 'resultadoFinal', label: 'Resultado final manual', type: 'select', span: 3, options: ['Em andamento', 'Aprovado', 'Reprovado'] }
];

const identificationFields = [
  { id: 'placa', label: 'Placa do veículo', type: 'text', span: 3, placeholder: 'AAA0A00' },
  { id: 'motorista', label: 'Motorista', type: 'text', span: 5, placeholder: 'Nome do motorista' },
  { id: 'instrutor', label: 'Instrutor', type: 'text', span: 4, placeholder: 'Nome do instrutor' },
  { id: 'numeroViagem', label: 'Número da viagem', type: 'text', span: 3, placeholder: 'Ex.: 1 viagem' },
  { id: 'empresa', label: 'Transportadora', type: 'text', span: 5, placeholder: 'Ex.: SUZANO S/A' },
  { id: 'tipoMotorista', label: 'Classificação', type: 'select', span: 4, options: ['Proprio', 'Terceiro', 'Agregado', 'Outro'] },
  { id: 'comentario', label: 'Comentário geral da identificação', type: 'textarea', span: 12, placeholder: 'Ex.: Teste prático - motorista Prando.' }
];

const closureFields = [
  { id: 'acoesCorretivas', label: 'Plano de ação / orientação aplicada', type: 'textarea', span: 6, placeholder: 'Descreva a orientação aplicada e próximos passos.' },
  { id: 'observacoesFinais', label: 'Observações finais', type: 'textarea', span: 6, placeholder: 'Registre informações finais da avaliação.' }
];

const preventiva = [
  'Fez uso do cinto de segurança?',
  'Apresenta alguma alteração em condições ambientais adversas como chuva, sol ou neblina?',
  'Teve atenção na condução em cruzamentos sinalizados ou sem sinalização?',
  'Conduz o veículo de forma consciente e segura quando está em rodovia?',
  'Conduz o veículo de forma prevenida de acordo com as adversidades do trânsito?',
  'Mantém a distância segura entre veículos?',
  'Executou somente ultrapassagem permitida?',
  'Participou da formação de comboio?',
  'Realiza curvas acentuadas em velocidade compatível?',
  'Respeita velocidade de segurança na chuva ou em condições precárias de tráfego?',
  'Respeita velocidade de segurança em trechos de serra?',
  'Faz a utilização correta das setas?',
  'Confere se os faróis de serviço estão ligados?'
];

const procedimentos = [
  'Confere a documentação do cavalo e composições?',
  'Utiliza marcha adequada para colocar o veículo em movimento?',
  'As trocas de marcha ocorrem sem trancos e ruídos?',
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
  'Respeitou os pontos de paradas autorizadas?',
  'Executa corretamente o procedimento de subir e descer da cabine?',
  'Comunica ocorrências e desvios operacionais corretamente?'
];

function createField(field) {
  const wrap = document.createElement('div');
  wrap.className = `field span-${field.span}`;
  const label = document.createElement('label');
  label.setAttribute('for', field.id);
  label.textContent = field.label;
  let input;

  if (field.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 4;
  } else if (field.type === 'select') {
    input = document.createElement('select');
    field.options.forEach((option, index) => {
      const el = document.createElement('option');
      el.value = option;
      el.textContent = option;
      if (index === 0) el.selected = true;
      input.appendChild(el);
    });
  } else {
    input = document.createElement('input');
    input.type = field.type;
  }

  input.id = field.id;
  input.name = field.id;
  if (field.placeholder) input.placeholder = field.placeholder;
  input.addEventListener('input', saveDraftSilently);
  input.addEventListener('change', saveDraftSilently);
  wrap.append(label, input);
  return wrap;
}

function mountFields(targetId, fields) {
  const root = document.getElementById(targetId);
  fields.forEach(field => root.appendChild(createField(field)));
}

function createQuestionCard(sectionName, question, index) {
  const template = document.getElementById('questionTemplate');
  const clone = template.content.cloneNode(true);
  const article = clone.querySelector('.question-card');
  const name = `${sectionName}_${index}`;
  clone.querySelector('.question-number').textContent = `Item ${index + 1}`;
  clone.querySelector('.question-title').textContent = question;

  const radios = clone.querySelectorAll('input[type="radio"]');
  radios.forEach((radio, radioIndex) => {
    const id = `${name}_${radioIndex}`;
    radio.name = name;
    radio.id = id;
    radio.addEventListener('change', () => {
      updateMetrics();
      saveDraftSilently();
    });
    const label = radio.parentElement;
    label.setAttribute('for', id);
  });

  const textarea = clone.querySelector('.question-note');
  textarea.dataset.question = name;
  textarea.addEventListener('input', saveDraftSilently);

  const fileInput = clone.querySelector('.question-files');
  const fileList = clone.querySelector('.file-list');
  fileInput.dataset.question = name;
  fileInput.addEventListener('change', () => {
    fileList.innerHTML = '';
    Array.from(fileInput.files).forEach(file => {
      const pill = document.createElement('span');
      pill.className = 'file-pill';
      pill.textContent = file.name;
      fileList.appendChild(pill);
    });
    saveDraftSilently();
  });

  article.dataset.section = sectionName;
  article.dataset.questionName = name;
  return clone;
}

function mountQuestions() {
  const preventivaRoot = document.getElementById('preventivaQuestions');
  preventiva.forEach((q, i) => preventivaRoot.appendChild(createQuestionCard('preventiva', q, i)));

  const procedimentosRoot = document.getElementById('procedimentosQuestions');
  procedimentos.forEach((q, i) => procedimentosRoot.appendChild(createQuestionCard('procedimentos', q, i)));
}

function calculateSection(sectionName) {
  const cards = Array.from(document.querySelectorAll(`.question-card[data-section="${sectionName}"]`));
  let pp = 0, pr = 0, nc = 0, na = 0;

  cards.forEach(card => {
    const checked = card.querySelector('input[type="radio"]:checked');
    if (!checked) return;
    if (checked.value === 'Não aplicável') {
      na += 1;
      return;
    }
    pp += 1;
    if (checked.value === 'Conforme') pr += 1;
    if (checked.value === 'Não conforme') nc += 1;
  });

  const ap = pp > 0 ? (pr / pp) * 100 : 0;
  return { pp, pr, nc, na, ap };
}

function setMiniStats(targetId, stats) {
  const root = document.getElementById(targetId);
  root.innerHTML = [
    `PP: ${stats.pp}`,
    `PR: ${stats.pr}`,
    `NC: ${stats.nc}`,
    `NA: ${stats.na}`,
    `AP: ${stats.ap.toFixed(2).replace('.', ',')}%`
  ].map(text => `<span class="mini-stat">${text}</span>`).join('');
}

function updateMetrics() {
  const prev = calculateSection('preventiva');
  const proc = calculateSection('procedimentos');
  const total = {
    pp: prev.pp + proc.pp,
    pr: prev.pr + proc.pr,
    nc: prev.nc + proc.nc,
    na: prev.na + proc.na
  };
  total.ap = total.pp > 0 ? (total.pr / total.pp) * 100 : 0;

  document.getElementById('ppValue').textContent = total.pp;
  document.getElementById('prValue').textContent = total.pr;
  document.getElementById('ncValue').textContent = total.nc;
  document.getElementById('naValue').textContent = total.na;
  document.getElementById('aproveitamentoValue').textContent = `${total.ap.toFixed(2).replace('.', ',')}%`;
  document.getElementById('progressBarFill').style.width = `${total.ap}%`;

  const statusBox = document.getElementById('statusBox');
  let status = 'Em andamento';
  if (total.pp > 0) {
    status = total.ap >= 90 ? 'Aprovado' : 'Reprovado';
  }
  statusBox.textContent = `Status: ${status}`;
  statusBox.style.background = status === 'Aprovado' ? 'rgba(61,165,109,.15)' : status === 'Reprovado' ? 'rgba(196,76,76,.15)' : 'rgba(212,175,55,.15)';
  statusBox.style.color = status === 'Aprovado' ? '#98e1b4' : status === 'Reprovado' ? '#efb0b0' : '#f4deb0';
  statusBox.style.borderColor = status === 'Aprovado' ? 'rgba(61,165,109,.45)' : status === 'Reprovado' ? 'rgba(196,76,76,.45)' : 'rgba(212,175,55,.35)';

  setMiniStats('preventivaStats', prev);
  setMiniStats('procedimentosStats', proc);
}

function collectFormState() {
  const state = { fields: {}, questions: {}, signatures: {} };
  document.querySelectorAll('.field input, .field select, .field textarea').forEach(el => {
    state.fields[el.id] = el.value;
  });

  document.querySelectorAll('.question-card').forEach(card => {
    const q = card.dataset.questionName;
    state.questions[q] = {
      answer: card.querySelector('input[type="radio"]:checked')?.value || '',
      note: card.querySelector('.question-note').value,
      files: Array.from(card.querySelector('.question-files').files).map(file => file.name)
    };
  });

  state.signatures.signatureDriver = document.getElementById('signatureDriver').toDataURL('image/png');
  state.signatures.signatureInstructor = document.getElementById('signatureInstructor').toDataURL('image/png');
  return state;
}

function saveDraftSilently() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormState()));
  } catch (error) {
    console.warn('Não foi possível salvar o rascunho localmente.', error);
  }
}

function restoreState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    Object.entries(state.fields || {}).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });

    Object.entries(state.questions || {}).forEach(([questionName, payload]) => {
      const card = document.querySelector(`.question-card[data-question-name="${questionName}"]`);
      if (!card) return;
      if (payload.answer) {
        const radio = Array.from(card.querySelectorAll('input[type="radio"]')).find(r => r.value === payload.answer);
        if (radio) radio.checked = true;
      }
      card.querySelector('.question-note').value = payload.note || '';
      const fileList = card.querySelector('.file-list');
      fileList.innerHTML = '';
      (payload.files || []).forEach(fileName => {
        const pill = document.createElement('span');
        pill.className = 'file-pill';
        pill.textContent = fileName;
        fileList.appendChild(pill);
      });
    });

    restoreSignature('signatureDriver', state.signatures?.signatureDriver);
    restoreSignature('signatureInstructor', state.signatures?.signatureInstructor);
  } catch (error) {
    console.warn('Rascunho inválido.', error);
  }
}

function setupSignatureCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#111';

  function resizeCanvas() {
    const snapshot = canvas.toDataURL('image/png');
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    if (snapshot && snapshot.length > 1000) restoreSignature(canvasId, snapshot);
  }

  let drawing = false;
  let lastX = 0;
  let lastY = 0;

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0] || event;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function start(event) {
    drawing = true;
    const p = pointFromEvent(event);
    lastX = p.x;
    lastY = p.y;
  }

  function move(event) {
    if (!drawing) return;
    event.preventDefault();
    const p = pointFromEvent(event);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x;
    lastY = p.y;
  }

  function end() {
    if (!drawing) return;
    drawing = false;
    saveDraftSilently();
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(resizeCanvas);
}

function restoreSignature(canvasId, dataUrl) {
  if (!dataUrl) return;
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
  };
  img.src = dataUrl;
}

function clearSignature(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  saveDraftSilently();
}

function setupActions() {
  document.getElementById('saveDraftBtn').addEventListener('click', () => {
    saveDraftSilently();
    alert('Rascunho salvo no navegador deste dispositivo.');
  });

  document.getElementById('newFormBtn').addEventListener('click', () => {
    if (!confirm('Deseja limpar o formulário atual e iniciar uma nova avaliação?')) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });

  document.getElementById('printBtn').addEventListener('click', () => window.print());

  document.querySelectorAll('[data-clear-signature]').forEach(button => {
    button.addEventListener('click', () => clearSignature(button.dataset.clearSignature));
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW não registrado:', err));
    });
  }
}

function presetToday() {
  const dateInput = document.getElementById('dataAvaliacao');
  if (!dateInput.value) {
    const now = new Date();
    dateInput.value = now.toISOString().slice(0, 10);
  }
}

mountFields('generalFields', generalFields);
mountFields('identificationFields', identificationFields);
mountFields('closureFields', closureFields);
mountQuestions();
setupSignatureCanvas('signatureDriver');
setupSignatureCanvas('signatureInstructor');
setupActions();
presetToday();
restoreState();
updateMetrics();
registerServiceWorker();
