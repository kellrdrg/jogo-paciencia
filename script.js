const naipes = ['spades', 'hearts', 'diamonds', 'clubs'];
const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let baralho = [];
let colunasTableau = [[], [], [], [], [], [], []];
let monteCompra = [];
let monteDescarte = [];
let fundacoes = { spades: [], hearts: [], diamonds: [], clubs: [] };

// Estrutura para rastrear a origem do arrasto
let cartaArrastadaInfo = null;

function criarBaralho() {
  const novoBaralho = [];
  for (let naipe of naipes) {
    for (let i = 0; i < valores.length; i++) {
      novoBaralho.push({
        naipe: naipe,
        valor: valores[i],
        peso: i + 1,
        cor: (naipe === 'hearts' || naipe === 'diamonds') ? 'red' : 'black',
        viradaParaBaixo: true
      });
    }
  }
  return embaralhar(novoBaralho);
}

function embaralhar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function iniciarJogo() {
  baralho = criarBaralho();
  colunasTableau = [[], [], [], [], [], [], []];
  monteDescarte = [];
  fundacoes = { spades: [], hearts: [], diamonds: [], clubs: [] };
  
  // Distribui as cartas no Tableau
  for (let i = 0; i < 7; i++) {
    for (let j = i; j < 7; j++) {
      colunasTableau[j].push(baralho.pop());
    }
    if (colunasTableau[i].length > 0) {
      colunasTableau[i][colunasTableau[i].length - 1].viradaParaBaixo = false;
    }
  }
  
  monteCompra = baralho;
  
  configurarInteracoes();
  atualizarTabuleiro();
}

function configurarInteracoes() {
  // Clique no monte de compra (Estoque)
  const stockPile = document.getElementById('stock-pile');
  stockPile.onclick = () => {
    if (monteCompra.length === 0 && monteDescarte.length === 0) return;
    
    if (monteCompra.length === 0) {
      monteCompra = monteDescarte.reverse().map(c => {
        c.viradaParaBaixo = true;
        return c;
      });
      monteDescarte = [];
    } else {
      const carta = monteCompra.pop();
      carta.viradaParaBaixo = false;
      monteDescarte.push(carta);
    }
    atualizarTabuleiro();
  };

  // Configuração de Drop para as Colunas do Tableau
  document.querySelectorAll('.tableau-column').forEach(coluna => {
    coluna.addEventListener('dragover', e => e.preventDefault());
    coluna.addEventListener('drop', e => {
      e.preventDefault();
      const destIdx = parseInt(coluna.getAttribute('data-column'));
      if (cartaArrastadaInfo) moverParaTableau(destIdx);
    });
  });

  // Configuração de Drop para as Fundações do topo
  document.querySelectorAll('.pile.foundation').forEach(fundacao => {
    fundacao.addEventListener('dragover', e => e.preventDefault());
    fundacao.addEventListener('drop', e => {
      e.preventDefault();
      const suit = fundacao.getAttribute('data-suit');
      if (cartaArrastadaInfo) moverParaFundacao(suit);
    });
  });
}

function moverParaTableau(destinoIdx) {
  const { tipoOrigem, idxOrigem, idxCarta } = cartaArrastadaInfo;
  let cartasParaMover = [];

  if (tipoOrigem === 'tableau') {
    cartasParaMover = colunasTableau[idxOrigem].slice(idxCarta);
  } else if (tipoOrigem === 'waste' && monteDescarte.length > 0) {
    cartasParaMover = [monteDescarte[monteDescarte.length - 1]];
  }

  if (cartasParaMover.length === 0) return;
  const primeiraCarta = cartasParaMover[0];
  const colunaDestino = colunasTableau[destinoIdx];
  let valido = false;

  if (colunaDestino.length === 0) {
    if (primeiraCarta.peso === 13) valido = true; // Apenas Rei (K) em coluna vazia
  } else {
    const ultimaCarta = colunaDestino[colunaDestino.length - 1];
    if (primeiraCarta.cor !== ultimaCarta.cor && primeiraCarta.peso === ultimaCarta.peso - 1) {
      valido = true;
    }
  }

  if (valido) {
    colunasTableau[destinoIdx] = colunaDestino.concat(cartasParaMover);
    if (tipoOrigem === 'tableau') {
      colunasTableau[idxOrigem] = colunasTableau[idxOrigem].slice(0, idxCarta);
      if (colunasTableau[idxOrigem].length > 0) colunasTableau[idxOrigem][colunasTableau[idxOrigem].length - 1].viradaParaBaixo = false;
    } else if (tipoOrigem === 'waste') {
      monteDescarte.pop();
    }
    atualizarTabuleiro();
  }
  cartaArrastadaInfo = null;
}

function moverParaFundacao(suitDestino) {
  const { tipoOrigem, idxOrigem, idxCarta } = cartaArrastadaInfo;
  let carta = null;

  if (tipoOrigem === 'tableau') {
    // Só permite mover para a fundação se for a última carta da coluna
    if (idxCarta === colunasTableau[idxOrigem].length - 1) {
      carta = colunasTableau[idxOrigem][idxCarta];
    }
  } else if (tipoOrigem === 'waste') {
    carta = monteDescarte[monteDescarte.length - 1];
  }

  if (!carta || carta.naipe !== suitDestino) {
    cartaArrastadaInfo = null;
    return;
  }

  const pilhaFundacao = fundacoes[suitDestino];
  let valido = false;

  if (pilhaFundacao.length === 0) {
    if (carta.peso === 1) valido = true; // Começa com Ás (peso 1)
  } else {
    const topoFundacao = pilhaFundacao[pilhaFundacao.length - 1];
    if (carta.peso === topoFundacao.peso + 1) valido = true; // Crescente: 2, 3, 4...
  }

  if (valido) {
    pilhaFundacao.push(carta);
    if (tipoOrigem === 'tableau') {
      colunasTableau[idxOrigem].pop();
      if (colunasTableau[idxOrigem].length > 0) colunasTableau[idxOrigem][colunasTableau[idxOrigem].length - 1].viradaParaBaixo = false;
    } else if (tipoOrigem === 'waste') {
      monteDescarte.pop();
    }
    atualizarTabuleiro();
    verificarVitoria();
  }
  cartaArrastadaInfo = null;
}

function atualizarTabuleiro() {
  // Renderiza Monte de Compra e Descarte
  const stockPile = document.getElementById('stock-pile');
  const wastePile = document.getElementById('waste-pile');
  stockPile.innerHTML = monteCompra.length > 0 ? `<div class="card face-down-texture"></div>` : `<div class="empty-icon">🔄</div>`;
  wastePile.innerHTML = '';
  
  if (monteDescarte.length > 0) {
    const topo = monteDescarte[monteDescarte.length - 1];
    const cardDiv = criarElementoCarta(topo);
    cardDiv.addEventListener('dragstart', () => {
      cartaArrastadaInfo = { tipoOrigem: 'waste', idxOrigem: null, idxCarta: null };
    });
    wastePile.appendChild(cardDiv);
  }

  // Renderiza Fundações
  document.querySelectorAll('.pile.foundation').forEach(fundacaoElemento => {
    const suit = fundacaoElemento.getAttribute('data-suit');
    const pilha = fundacoes[suit];
    fundacaoElemento.innerHTML = '';
    if (pilha.length > 0) {
      const topo = pilha[pilha.length - 1];
      const cardDiv = criarElementoCarta(topo);
      cardDiv.setAttribute('draggable', 'false'); // Cartas nas fundações não precisam ser arrastadas de volta por simplicidade
      fundacaoElemento.appendChild(cardDiv);
    } else {
      fundacaoElemento.innerHTML = `<div class="foundation-suit-icon">${traduzirNaipe(suit)}</div>`;
    }
  });

  // Renderiza as 7 colunas do Tableau
  for (let i = 0; i < 7; i++) {
    const colunaElemento = document.querySelector(`[data-column="${i}"]`);
    colunaElemento.innerHTML = '';
    
    colunasTableau[i].forEach((carta, index) => {
      const cardDiv = document.createElement('div');
      cardDiv.classList.add('card');
      
      if (carta.viradaParaBaixo) {
        cardDiv.classList.add('face-down');
      } else {
        cardDiv.classList.add(carta.cor);
        cardDiv.innerHTML = `<div>${carta.valor}</div><div class="suit-center">${traduzirNaipe(carta.naipe)}</div>`;
        cardDiv.setAttribute('draggable', 'true');
        
        cardDiv.addEventListener('dragstart', e => {
          cartaArrastadaInfo = { tipoOrigem: 'tableau', idxOrigem: i, idxCarta: index };
        });
      }
      
      cardDiv.style.top = `${index * 28}px`;
      colunaElemento.appendChild(cardDiv);
    });
  }
}

function criarElementoCarta(carta) {
  const cardDiv = document.createElement('div');
  cardDiv.classList.add('card', carta.cor);
  cardDiv.innerHTML = `<div>${carta.valor}</div><div class="suit-center">${traduzirNaipe(carta.naipe)}</div>`;
  cardDiv.setAttribute('draggable', 'true');
  return cardDiv;
}

function traduzirNaipe(naipe) {
  const simbolos = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
  return simbolos[naipe] || naipe;
}

function verificarVitoria() {
  if (fundacoes.spades.length === 13 && fundacoes.hearts.length === 13 && 
      fundacoes.diamonds.length === 13 && fundacoes.clubs.length === 13) {
    alert('Parabéns! Você venceu o jogo de Solitaire! 🎉');
  }
}

document.getElementById('btn-restart').onclick = iniciarJogo;
window.onload = iniciarJogo;
