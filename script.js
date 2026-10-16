// ================= Configuração =================
// Quantos gomos cabem na largura: menos no celular para não ficarem minúsculos,
// e mais (zoom out) quando a colmeia cresce e não cabe mais na tela.
function colunas() {
  const base = colmeia.clientWidth < 600 ? 9 : 13;
  const chaves = estado ? [...estado.tabuleiro.keys()] : [];
  if (!chaves.length) return base;

  const xs = chaves.map((k) => { const [q, r] = coords(k); return q + r / 2; });
  const rs = chaves.map((k) => coords(k)[1]);
  const largura = Math.max(...xs) - Math.min(...xs) + 1;
  const linhas = Math.max(...rs) - Math.min(...rs) + 1;

  // Colunas necessárias para caber as linhas, dada a proporção da tela
  const proporcao = colmeia.clientWidth / colmeia.clientHeight;
  const pelaAltura = ((linhas + 4) * 1.5) / (Math.sqrt(3) * proporcao);

  return Math.min(24, Math.max(base, Math.ceil(largura + 4), Math.ceil(pelaAltura)));
}
const ESPESSURA = 1.5;  // espessura do contorno (px) — gomos vizinhos somam 2x

// Para trocar o emoji por imagem depois, basta adicionar "img: 'caminho.png'"
const TIPOS = {
  rainha:    { nome: 'Abelha Rainha', emoji: '🐝', qtd: 1, regra: 'Anda 1 espaço deslizando.' },
  besouro:   { nome: 'Besouro',       emoji: '🪲', qtd: 2, regra: 'Anda 1 espaço e pode subir em cima de outras peças, prendendo-as.' },
  gafanhoto: { nome: 'Gafanhoto',     emoji: '🦗', qtd: 3, regra: 'Pula em linha reta por cima das peças até o primeiro espaço vazio.' },
  aranha:    { nome: 'Aranha',        emoji: '🕷️', qtd: 2, regra: 'Anda exatamente 3 espaços contornando a colmeia.' },
  formiga:   { nome: 'Formiga',       emoji: '🐜', qtd: 3, regra: 'Anda quantos espaços quiser ao redor da colmeia.' },
};

const JOGADORES = { branco: 'Brancas', preto: 'Amarelas' };

// Direções axiais em ordem circular (cada uma é vizinha da seguinte)
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

// ================= Elementos =================
const colmeia = document.getElementById('colmeia');
const elStatus = document.getElementById('status');
const elMensagem = document.getElementById('mensagem');
const elInfo = document.getElementById('info');

let celulas = new Map();   // "q,r" -> elemento do gomo
let centro = [0, 0];       // coordenada que fica no meio da tela
let estado;

// ================= Utilidades de coordenadas =================
const chave = (q, r) => q + ',' + r;
const coords = (k) => k.split(',').map(Number);
const outro = (j) => (j === 'branco' ? 'preto' : 'branco');
const existe = (k) => celulas.has(k);

function vizinhoDir(k, i) {
  const [q, r] = coords(k);
  return chave(q + DIRS[i][0], r + DIRS[i][1]);
}

function vizinhos(k) {
  return DIRS.map((_, i) => vizinhoDir(k, i));
}

const altura = (tab, k) => (tab.get(k) || []).length;
const topoEm = (tab, k) => { const p = tab.get(k); return p ? p[p.length - 1] : null; };
const topo = (k) => topoEm(estado.tabuleiro, k);

// ================= Desenho da grade =================
function desenharColmeia() {
  if (!colmeia.clientWidth || !colmeia.clientHeight) return;   // janela oculta
  colmeia.innerHTML = '';
  celulas = new Map();
  colmeia.style.setProperty('--espessura', ESPESSURA + 'px');

  const largura = colmeia.clientWidth;
  const alturaTela = colmeia.clientHeight;

  const COLUNAS = colunas();
  const passoX = largura / COLUNAS;
  const raio = passoX / Math.sqrt(3);
  const passoY = raio * 1.5;
  colmeia.style.setProperty('--fonte', passoX * 0.48 + 'px');

  const linhas = Math.ceil(alturaTela / passoY) + 1;

  // Gomo central vira a coordenada (0,0)
  const linhaC = Math.round((alturaTela / 2 - raio / 2) / passoY);
  const deslC = linhaC % 2 ? passoX / 2 : 0;
  const colC = Math.round((largura / 2 - deslC) / passoX);
  const [q0, r0] = paraAxial(linhaC, colC);

  for (let linha = 0; linha < linhas; linha++) {
    const deslocamento = linha % 2 ? passoX / 2 : 0;

    for (let col = 0; col <= COLUNAS; col++) {
      const [q, r] = paraAxial(linha, col);
      const k = chave(q - q0 + centro[0], r - r0 + centro[1]);

      const gomo = document.createElement('div');
      gomo.className = 'gomo';
      gomo.dataset.chave = k;
      gomo.style.left = col * passoX + deslocamento - passoX / 2 + 'px';
      gomo.style.top = linha * passoY - raio / 2 + 'px';
      gomo.style.width = passoX + 'px';
      gomo.style.height = raio * 2 + 'px';
      gomo.innerHTML = '<div class="borda"><div class="miolo"></div></div>';

      gomo.addEventListener('click', () => aoClicarGomo(k));
      colmeia.appendChild(gomo);
      celulas.set(k, gomo);
    }
  }
}

// Linhas ímpares deslocadas para a direita ("odd-r")
function paraAxial(linha, col) {
  return [col - (linha - (linha & 1)) / 2, linha];
}

// ================= Estado do jogo =================
function novoJogo() {
  clearTimeout(timerMaquina);
  timerMaquina = null;
  centro = [0, 0];
  desenharColmeia();
  const reserva = () => Object.fromEntries(Object.entries(TIPOS).map(([t, d]) => [t, d.qtd]));
  estado = {
    tabuleiro: new Map(),            // "q,r" -> pilha de peças (topo = última)
    reserva: { branco: reserva(), preto: reserva() },
    vez: 'branco',
    jogadas: { branco: 0, preto: 0 },
    colocadas: 0,
    selecao: null,                   // { origem: 'reserva', tipo } | { origem: 'tabuleiro', chave }
    destinos: new Set(),
    mensagem: '',
    fim: null,
    ultima: null,                    // destino da última jogada
  };
  render();
}

const rainhaEmJogo = (j) => estado.reserva[j].rainha === 0;

// Na 4ª jogada, se a rainha ainda não entrou, só ela pode ser colocada
function tiposPermitidos(j) {
  const r = estado.reserva[j];
  if (estado.jogadas[j] === 3 && !rainhaEmJogo(j)) return ['rainha'];
  return Object.keys(TIPOS).filter((t) => r[t] > 0);
}

function copiarTabuleiro() {
  const tab = new Map();
  for (const [k, p] of estado.tabuleiro) tab.set(k, p.slice());
  return tab;
}

// ================= Regras: colocação =================
function locaisColocacao(j) {
  const tab = estado.tabuleiro;
  if (estado.colocadas === 0) return ['0,0'];
  if (estado.colocadas === 1) {
    const [primeira] = tab.keys();
    return vizinhos(primeira).filter((v) => !tab.has(v) && existe(v));
  }

  const candidatos = new Set();
  for (const [k, pilha] of tab) {
    if (pilha[pilha.length - 1].jogador !== j) continue;
    for (const v of vizinhos(k)) if (!tab.has(v) && existe(v)) candidatos.add(v);
  }
  return [...candidatos].filter((v) =>
    vizinhos(v).every((n) => { const t = topo(n); return !t || t.jogador === j; })
  );
}

// ================= Regras: movimento =================
function colmeiaConectada(tab) {
  const chaves = [...tab.keys()];
  if (chaves.length <= 1) return true;
  const vistos = new Set([chaves[0]]);
  const fila = [chaves[0]];
  while (fila.length) {
    const k = fila.pop();
    for (const v of vizinhos(k)) {
      if (tab.has(v) && !vistos.has(v)) { vistos.add(v); fila.push(v); }
    }
  }
  return vistos.size === chaves.length;
}

// Um passo deslizando no chão: o destino está vazio, a passagem não está
// bloqueada pelas duas laterais e a peça continua encostada na colmeia.
function passosChao(tab, k) {
  const res = [];
  DIRS.forEach((_, i) => {
    const b = vizinhoDir(k, i);
    if (tab.has(b) || !existe(b)) return;
    const lado1 = tab.has(vizinhoDir(k, (i + 1) % 6));
    const lado2 = tab.has(vizinhoDir(k, (i + 5) % 6));
    if (lado1 !== lado2) res.push(b);
  });
  return res;
}

function movimentosBesouro(tab, k) {
  const res = [];
  const hA = altura(tab, k);
  DIRS.forEach((_, i) => {
    const b = vizinhoDir(k, i);
    if (!existe(b)) return;
    const hB = altura(tab, b);
    const h1 = altura(tab, vizinhoDir(k, (i + 1) % 6));
    const h2 = altura(tab, vizinhoDir(k, (i + 5) % 6));
    if (hA === 0 && hB === 0) {
      if ((h1 > 0) !== (h2 > 0)) res.push(b);   // andando no chão
    } else if (Math.min(h1, h2) <= Math.max(hA, hB)) {
      res.push(b);                              // subindo/descendo/andando por cima
    }
  });
  return res;
}

function movimentosGafanhoto(tab, k) {
  const res = [];
  DIRS.forEach((_, i) => {
    let atual = vizinhoDir(k, i);
    if (!tab.has(atual)) return;
    while (tab.has(atual)) atual = vizinhoDir(atual, i);
    if (existe(atual)) res.push(atual);
  });
  return res;
}

function movimentosAranha(tab, k) {
  const res = new Set();
  const visitados = new Set([k]);
  const andar = (atual, n) => {
    if (n === 3) { res.add(atual); return; }
    for (const b of passosChao(tab, atual)) {
      if (visitados.has(b)) continue;
      visitados.add(b);
      andar(b, n + 1);
      visitados.delete(b);
    }
  };
  andar(k, 0);
  return [...res];
}

function movimentosFormiga(tab, k) {
  const vistos = new Set([k]);
  const fila = [k];
  while (fila.length) {
    const atual = fila.shift();
    for (const b of passosChao(tab, atual)) {
      if (!vistos.has(b)) { vistos.add(b); fila.push(b); }
    }
  }
  vistos.delete(k);
  return [...vistos];
}

function movimentosValidos(k) {
  const peca = topo(k);
  if (!peca || !rainhaEmJogo(peca.jogador)) return [];

  // Tira a peça do tabuleiro e confere a regra da colmeia única
  const tab = copiarTabuleiro();
  tab.get(k).pop();
  if (tab.get(k).length === 0) tab.delete(k);
  if (!colmeiaConectada(tab)) return [];

  const gerador = {
    rainha: (t, c) => passosChao(t, c),
    besouro: movimentosBesouro,
    gafanhoto: movimentosGafanhoto,
    aranha: movimentosAranha,
    formiga: movimentosFormiga,
  }[peca.tipo];

  return gerador(tab, k).filter((d) => d !== k);
}

function temAlgumaJogada(j) {
  const podeColocar = tiposPermitidos(j).some((t) => estado.reserva[j][t] > 0);
  if (podeColocar && locaisColocacao(j).length) return true;
  if (!rainhaEmJogo(j)) return false;
  for (const [k] of estado.tabuleiro) {
    if (topo(k).jogador === j && movimentosValidos(k).length) return true;
  }
  return false;
}

// ================= Fim de jogo =================
function rainhaCercada(j) {
  for (const [k, pilha] of estado.tabuleiro) {
    if (pilha.some((p) => p.tipo === 'rainha' && p.jogador === j)) {
      return vizinhos(k).every((v) => estado.tabuleiro.has(v));
    }
  }
  return false;
}

function verificarFim() {
  const b = rainhaCercada('branco');
  const p = rainhaCercada('preto');
  if (b && p) estado.fim = 'Empate! As duas rainhas foram cercadas.';
  else if (b) estado.fim = '🏆 As Amarelas venceram!';
  else if (p) estado.fim = '🏆 As Brancas venceram!';
  return !!estado.fim;
}

// ================= Turnos =================
function limparSelecao() {
  estado.selecao = null;
  estado.destinos = new Set();
}

function proximoTurno() {
  estado.jogadas[estado.vez]++;
  limparSelecao();
  if (verificarFim()) return;

  estado.vez = outro(estado.vez);
  if (!temAlgumaJogada(estado.vez)) {
    const quem = estado.vez;
    estado.jogadas[quem]++;
    estado.vez = outro(quem);
    estado.mensagem = `As ${JOGADORES[quem]} não têm jogadas possíveis e passaram a vez.`;
    if (!temAlgumaJogada(estado.vez)) estado.fim = 'Empate! Nenhum jogador consegue jogar.';
  }
}

function executarJogada(destino) {
  const tab = estado.tabuleiro;
  const sel = estado.selecao;

  if (sel.origem === 'reserva') {
    if (!tab.has(destino)) tab.set(destino, []);
    tab.get(destino).push({ jogador: estado.vez, tipo: sel.tipo });
    estado.reserva[estado.vez][sel.tipo]--;
    estado.colocadas++;
  } else {
    const pilha = tab.get(sel.chave);
    const peca = pilha.pop();
    if (pilha.length === 0) tab.delete(sel.chave);
    if (!tab.has(destino)) tab.set(destino, []);
    tab.get(destino).push(peca);
  }
  estado.ultima = destino;
  recentralizar();
  proximoTurno();
}

// Quando a colmeia chega perto da borda da tela, move a vista para o meio dela
function recentralizar() {
  const chaves = [...estado.tabuleiro.keys()];
  if (!chaves.length) return;

  const pertoDaBorda = chaves.some((k) =>
    vizinhos(k).some((v) => !existe(v) || vizinhos(v).some((w) => !existe(w)))
  );
  if (!pertoDaBorda) return;

  const media = (i) => Math.round(chaves.reduce((s, k) => s + coords(k)[i], 0) / chaves.length);
  centro = [media(0), media(1)];
  desenharColmeia();   // também recalcula o zoom
}

// ================= Máquina =================
const MAQUINA = 'preto';
let modo = 'dois';        // 'dois' | 'maquina'
let nivel = 'normal';     // 'facil' | 'normal'
let timerMaquina = null;

const popupAberto = () => document.getElementById('inicio').classList.contains('aberto');
const vezDaMaquina = () => !!estado && modo === 'maquina' && estado.vez === MAQUINA && !estado.fim;

function distancia(a, b) {
  const [q1, r1] = coords(a);
  const [q2, r2] = coords(b);
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
}

function posRainha(j) {
  for (const [k, pilha] of estado.tabuleiro) {
    if (pilha.some((p) => p.tipo === 'rainha' && p.jogador === j)) return k;
  }
  return null;
}

function cerco(j) {
  const k = posRainha(j);
  return k ? vizinhos(k).filter((v) => estado.tabuleiro.has(v)).length : 0;
}

function listarAcoes(j) {
  const acoes = [];
  const locais = locaisColocacao(j);
  for (const tipo of tiposPermitidos(j)) {
    for (const destino of locais) acoes.push({ origem: 'reserva', tipo, destino });
  }
  if (rainhaEmJogo(j)) {
    for (const [k, pilha] of estado.tabuleiro) {
      const peca = pilha[pilha.length - 1];
      if (peca.jogador !== j) continue;
      for (const destino of movimentosValidos(k)) {
        acoes.push({ origem: 'tabuleiro', chave: k, tipo: peca.tipo, destino });
      }
    }
  }
  return acoes;
}

// Aplica a ação temporariamente, roda fn() e desfaz
function simular(acao, j, fn) {
  const salvo = copiarTabuleiro();
  const tab = estado.tabuleiro;
  let peca = { jogador: j, tipo: acao.tipo };
  if (acao.origem === 'reserva') {
    estado.reserva[j][acao.tipo]--;
    estado.colocadas++;
  } else {
    const pilha = tab.get(acao.chave);
    peca = pilha.pop();
    if (!pilha.length) tab.delete(acao.chave);
  }
  if (!tab.has(acao.destino)) tab.set(acao.destino, []);
  tab.get(acao.destino).push(peca);

  const resultado = fn();

  estado.tabuleiro = salvo;
  if (acao.origem === 'reserva') {
    estado.reserva[j][acao.tipo]++;
    estado.colocadas--;
  }
  return resultado;
}

function avaliar(acao, j) {
  const inimigo = cerco(outro(j));
  const proprio = cerco(j);
  if (inimigo === 6 && proprio === 6) return -50;
  if (inimigo === 6) return 1000;
  if (proprio === 6) return -1000;

  let nota = inimigo * 10 - proprio * 12;

  // Aproximar as peças da rainha inimiga
  const alvo = posRainha(outro(j));
  if (alvo) nota -= distancia(acao.destino, alvo) * 0.6;

  if (acao.origem === 'reserva') {
    nota += 1;
    if (acao.tipo === 'rainha' && estado.jogadas[j] >= 1) nota += 4;
    if (acao.tipo === 'formiga') nota += 1;
  }
  return nota;
}

// O adversário consegue fechar o cerco da minha rainha na próxima jogada?
function emPerigo(j) {
  const k = posRainha(j);
  if (!k) return false;
  const livres = vizinhos(k).filter((v) => !estado.tabuleiro.has(v));
  if (livres.length !== 1) return false;
  const ladoRainha = vizinhos(k);
  return listarAcoes(outro(j)).some((a) =>
    a.destino === livres[0] && !(a.origem === 'tabuleiro' && ladoRainha.includes(a.chave))
  );
}

function escolherAcao(j) {
  const acoes = listarAcoes(j);
  if (!acoes.length) return null;

  const ruido = nivel === 'facil' ? 15 : 1.5;
  const notas = acoes
    .map((a) => ({ a, nota: simular(a, j, () => avaliar(a, j)) + Math.random() * ruido }))
    .sort((x, y) => y.nota - x.nota);

  if (nivel === 'normal') {
    for (const { a, nota } of notas.slice(0, 12)) {
      if (nota >= 900 || !simular(a, j, () => emPerigo(j))) return a;
    }
  }
  return notas[0].a;
}

function jogarMaquina() {
  timerMaquina = null;
  if (!vezDaMaquina() || popupAberto()) return;   // ao fechar o popup, render() agenda de novo
  const acao = escolherAcao(MAQUINA);
  if (acao) {
    estado.selecao = acao;
    executarJogada(acao.destino);
  }
  render();
}

// ================= Cliques =================
function aoClicarGomo(k) {
  if (estado.fim || vezDaMaquina()) return;
  estado.mensagem = '';

  if (estado.selecao && estado.destinos.has(k)) {
    executarJogada(k);
  } else if (topo(k) && topo(k).jogador === estado.vez &&
             !(estado.selecao && estado.selecao.chave === k)) {
    selecionarPecaTabuleiro(k);
  } else {
    limparSelecao();
  }
  render();
}

function selecionarPecaTabuleiro(k) {
  limparSelecao();
  if (!rainhaEmJogo(estado.vez)) {
    estado.mensagem = 'Coloque sua Abelha Rainha antes de mover peças.';
    return;
  }
  const destinos = movimentosValidos(k);
  if (!destinos.length) {
    estado.mensagem = 'Essa peça não pode se mover agora.';
    return;
  }
  estado.selecao = { origem: 'tabuleiro', chave: k, tipo: topo(k).tipo };
  estado.destinos = new Set(destinos);
}

function aoClicarReserva(j, tipo) {
  if (estado.fim || vezDaMaquina()) return;
  estado.mensagem = '';

  if (estado.selecao && estado.selecao.origem === 'reserva' && estado.selecao.tipo === tipo) {
    limparSelecao();
  } else if (!tiposPermitidos(j).includes(tipo)) {
    limparSelecao();
    estado.mensagem = 'Este é o seu 4º turno: você precisa colocar a Abelha Rainha.';
  } else {
    const locais = locaisColocacao(j);
    limparSelecao();
    if (!locais.length) {
      estado.mensagem = 'Não há espaço válido para colocar peças.';
    } else {
      estado.selecao = { origem: 'reserva', tipo };
      estado.destinos = new Set(locais);
    }
  }
  render();
}

// ================= Desenho =================
function conteudoPeca(tipo) {
  const t = TIPOS[tipo];
  return t.img ? `<img src="${t.img}" alt="${t.nome}" style="width:70%">` : t.emoji;
}

function render() {
  const sel = estado.selecao;

  // Tabuleiro
  for (const [k, gomo] of celulas) {
    const pilha = estado.tabuleiro.get(k);
    const peca = pilha && pilha[pilha.length - 1];
    const miolo = gomo.querySelector('.miolo');

    gomo.classList.toggle('destino', estado.destinos.has(k));
    gomo.classList.toggle('origem', !!(sel && sel.chave === k));
    gomo.classList.toggle('ultima', estado.ultima === k && !estado.destinos.size);
    miolo.className = 'miolo' + (peca ? ' peca ' + peca.jogador : '');
    miolo.innerHTML = peca
      ? conteudoPeca(peca.tipo) + (pilha.length > 1 ? `<span class="altura">${pilha.length}</span>` : '')
      : '';
    gomo.title = peca ? `${TIPOS[peca.tipo].nome} (${JOGADORES[peca.jogador]})` : '';
  }

  // Reservas
  for (const j of ['branco', 'preto']) {
    const caixa = document.getElementById('reserva-' + j);
    caixa.classList.toggle('vez', estado.vez === j && !estado.fim);
    const ehMaquina = modo === 'maquina' && j === MAQUINA;
    caixa.querySelector('h2').textContent =
      JOGADORES[j] + (modo === 'maquina' ? (ehMaquina ? ' · 🤖 Máquina' : ' · Você') : '');
    const lista = caixa.querySelector('.pecas');
    lista.innerHTML = '';

    for (const [tipo, dados] of Object.entries(TIPOS)) {
      const qtd = estado.reserva[j][tipo];
      const slot = document.createElement('div');
      slot.className = 'slot';

      const botao = document.createElement('button');
      const ativa = sel && sel.origem === 'reserva' && sel.tipo === tipo && estado.vez === j;
      botao.className = `ficha ${j}` + (ativa ? ' ativa' : '');
      botao.title = dados.nome;
      botao.disabled = qtd === 0 || estado.vez !== j || !!estado.fim || ehMaquina;
      botao.innerHTML = `<span class="face">${conteudoPeca(tipo)}</span>`;
      botao.addEventListener('click', () => aoClicarReserva(j, tipo));

      const contador = document.createElement('span');
      contador.className = 'qtd';
      contador.textContent = '×' + qtd;

      slot.append(botao, contador);
      lista.appendChild(slot);
    }
  }

  // Status e mensagens
  const turno = estado.jogadas[estado.vez] + 1;
  elStatus.innerHTML = estado.fim
    ? 'Fim de jogo'
    : vezDaMaquina()
    ? `<span class="bolinha ${estado.vez}"></span> 🤖 Máquina pensando…`
    : `<span class="bolinha ${estado.vez}"></span> Vez das ${JOGADORES[estado.vez]} — turno ${turno}`;

  elMensagem.textContent = estado.fim || estado.mensagem;
  elMensagem.classList.toggle('vitoria', !!estado.fim);

  elInfo.innerHTML = sel
    ? `<b>${TIPOS[sel.tipo].emoji} ${TIPOS[sel.tipo].nome}:</b> ${TIPOS[sel.tipo].regra}<br>` +
      `<small>${sel.origem === 'reserva' ? 'Escolha um gomo verde para colocar.' : 'Escolha um gomo verde para mover.'}</small>`
    : '';

  document.getElementById('modo-atual').textContent = modo === 'maquina'
    ? `🤖 Contra a máquina · ${nivel === 'facil' ? 'Fácil' : 'Normal'}`
    : '👥 2 Jogadores';

  if (vezDaMaquina() && !timerMaquina) timerMaquina = setTimeout(jogarMaquina, 700);
}

// ================= Início =================
let timer;
// Redesenha quando o tamanho do tabuleiro muda (janela, celular girando, dica aparecendo)
let tamanhoAnterior = '';
new ResizeObserver(() => {
  const tamanho = colmeia.clientWidth + 'x' + colmeia.clientHeight;
  if (tamanho === tamanhoAnterior) return;
  tamanhoAnterior = tamanho;
  clearTimeout(timer);
  timer = setTimeout(() => { desenharColmeia(); if (estado) render(); }, 60);
}).observe(colmeia);

// Menu (no celular abre por cima da tela)
const menu = document.getElementById('menu');
const fecharMenu = () => menu.classList.remove('aberto');
document.getElementById('abrir-menu').addEventListener('click', () => menu.classList.add('aberto'));
document.getElementById('fechar-menu').addEventListener('click', fecharMenu);
menu.addEventListener('click', (e) => { if (e.target === menu) fecharMenu(); });

// Popup de nova partida: escolhe modo e nível antes de começar
const inicio = document.getElementById('inicio');
const fecharInicioBtn = document.getElementById('fechar-inicio');
let escolhaModo = modo;
let escolhaNivel = nivel;

function marcarEscolhas() {
  document.querySelectorAll('.opcao').forEach((b) => b.classList.toggle('ativo', b.dataset.modo === escolhaModo));
  document.querySelectorAll('.nivel-op').forEach((b) => b.classList.toggle('ativo', b.dataset.nivel === escolhaNivel));
  document.getElementById('niveis').hidden = escolhaModo !== 'maquina';
}

// podeVoltar: ao reiniciar, dá para fechar e continuar a partida atual
function abrirInicio(podeVoltar) {
  escolhaModo = modo;
  escolhaNivel = nivel;
  marcarEscolhas();
  fecharInicioBtn.hidden = !podeVoltar;
  fecharMenu();
  inicio.classList.add('aberto');
  document.getElementById('comecar').focus();
}

function fecharInicio() {
  inicio.classList.remove('aberto');
  render();   // retoma a máquina, se for a vez dela
}

document.querySelectorAll('.opcao').forEach((b) =>
  b.addEventListener('click', () => { escolhaModo = b.dataset.modo; marcarEscolhas(); })
);
document.querySelectorAll('.nivel-op').forEach((b) =>
  b.addEventListener('click', () => { escolhaNivel = b.dataset.nivel; marcarEscolhas(); })
);

document.getElementById('comecar').addEventListener('click', () => {
  modo = escolhaModo;
  nivel = escolhaNivel;
  inicio.classList.remove('aberto');
  novoJogo();
});

fecharInicioBtn.addEventListener('click', fecharInicio);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && inicio.classList.contains('aberto') && !fecharInicioBtn.hidden) fecharInicio();
});

document.getElementById('reiniciar').addEventListener('click', () => abrirInicio(true));

desenharColmeia();
novoJogo();
abrirInicio(false);
