(function () {
  'use strict';

  var CHAVE = 'entrelinhas.registros.v1';
  var HUMORES = [
    { nome: 'tranquila', cor: '#8FAE86' },
    { nome: 'em paz', cor: '#7FA3AE' },
    { nome: 'grata', cor: '#D4A246' },
    { nome: 'animada', cor: '#E0874E' },
    { nome: 'pensativa', cor: '#9C8DB5' },
    { nome: 'cansada', cor: '#AA9C8C' },
    { nome: 'ansiosa', cor: '#C7A65C' },
    { nome: 'angustiada', cor: '#8E6878' },
    { nome: 'triste', cor: '#6F8BAE' },
    { nome: 'irritada', cor: '#B9543C' }
  ];
  var CORES = {};
  HUMORES.forEach(function (h) { CORES[h.nome] = h.cor; });

  function ponto(humor) {
    var s = document.createElement('span');
    s.className = 'ponto';
    s.setAttribute('aria-hidden', 'true');
    if (humor && CORES[humor]) s.style.setProperty('--cor', CORES[humor]);
    return s;
  }

  var INSTRUCAO_REFLEXAO =
    'Quero refletir sobre este registro do meu diário. Responda em português com acolhimento e sem julgamento. ' +
    'Resuma brevemente o que entendeu e pergunte se entendeu certo. Se fizer sentido, ofereça um olhar possível a partir da psicologia, da psicanálise ou da neurociência, em linguagem simples e como hipótese, nunca como certeza. ' +
    'Depois me dê uma motivação sincera e um conselho prático, pequeno e gentil para hoje. Faça no máximo uma pergunta aberta, sem me pressionar. ' +
    'Não faça diagnósticos nem se apresente como psicólogo, psicanalista, neurocientista ou profissional de saúde. ' +
    'Não force interpretações psicanalíticas. Se eu disser que só quero ser ouvida, apenas me escute, sem análise nem conselho.';

  var CHAVE_API = 'entrelinhas.chaveApi';
  var CHAVE_AUTO = 'entrelinhas.reflexaoAutomatica';
  var MODELO = 'claude-sonnet-5-5';

  var SISTEMA_REFLEXAO = [
    'Você é a voz de reflexão do Entrelinhas, um diário pessoal. Fala com uma mulher adulta que acabou de escrever um registro sobre como está.',
    'Seu jeito: acolhedor, caloroso, curioso e cuidadoso, em português do Brasil, com frases simples e humanas. Nunca use travessão; use vírgula, ponto ou dois-pontos.',
    'Você tem bons conhecimentos gerais de psicologia, de abordagens psicodinâmicas e psicanalíticas e de neurociência, e pode usá-los para apoiar a reflexão. Mas você não é psicóloga, psicanalista, neurocientista nem profissional de saúde, não alega credenciais nem experiência clínica, e não descreve a conversa como terapia.',
    'Regras:',
    '1. Apresente conceitos como informação geral, em linguagem simples. Toda leitura sobre ela é uma possibilidade, nunca um fato ou diagnóstico: deixe a incerteza clara (por exemplo, "talvez", "pode ser que") e convide ela a ver se combina com a experiência dela.',
    '2. Não interprete sonhos, infância, inconsciente, personalidade ou padrões como se soubesse o que significam. Não reduza sentimentos a explicações cerebrais nem use termos técnicos para dar falsa certeza.',
    '3. Não recomende interromper ou alterar medicação, tratamento ou acompanhamento profissional.',
    '4. A motivação deve ser sincera e ligada ao que ela escreveu, sem frases feitas nem positividade forçada. Valide antes de encorajar.',
    '5. O conselho deve ser um único passo prático, pequeno, gentil e opcional para hoje (algo que caiba no dia dela), nunca uma lista nem uma ordem.',
    '6. No máximo uma pergunta aberta, sem pressionar.',
    '7. Se ela pedir só para ser ouvida, ou se o campo so_ouvir for verdadeiro, escreva apenas o acolhimento: deixe olhar, conselho e pergunta vazios, e a motivação também, a não ser que caiba uma frase curta de presença.',
    '8. Se o registro mostrar sofrimento intenso, acolha com cuidado, pergunte do que ela precisa agora e incentive apoio de alguém de confiança ou de um profissional. Se houver qualquer sinal de que ela pode se machucar ou está em perigo, priorize a segurança: diga com carinho e clareza para buscar ajuda agora, presencialmente ou pelo CVV (ligue 188, gratuito, 24 horas) ou SAMU 192, e deixe o olhar psicológico de lado. Nesse caso preencha o campo cuidado com essa orientação.',
    'Formato: responda SOMENTE com um objeto JSON válido, sem texto antes ou depois, com estas chaves (strings; use "" quando não se aplicar):',
    '{"acolhimento": "2 a 4 frases refletindo o que você entendeu, terminando com uma checagem como se entendeu certo", "olhar": "1 a 3 frases com um olhar possível da psicologia, psicanálise ou neurociência, como hipótese", "motivacao": "1 a 2 frases", "conselho": "1 a 2 frases com um passo pequeno", "pergunta": "uma pergunta aberta", "cuidado": "só se houver sofrimento intenso ou risco"}',
    'Seja breve: no total, até cerca de 180 palavras.'
  ].join('\n');

  var $ = function (id) { return document.getElementById(id); };
  var registroAberto = null;
  var armazenamentoOk = true;

  /* ---------- Armazenamento ---------- */

  function carregar() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      if (!bruto) return [];
      var dados = JSON.parse(bruto);
      return Array.isArray(dados) ? dados.filter(valido) : [];
    } catch (e) {
      armazenamentoOk = false;
      return [];
    }
  }

  function salvar(lista) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(lista));
      return true;
    } catch (e) {
      avisar('Não foi possível guardar. O armazenamento do navegador pode estar cheio ou bloqueado.');
      return false;
    }
  }

  function reflexaoValida(x) {
    return x && typeof x === 'object' && typeof x.criadaEm === 'string' && x.partes && typeof x.partes === 'object';
  }

  function valido(r) {
    return r && typeof r === 'object' &&
      typeof r.id === 'string' &&
      typeof r.texto === 'string' &&
      typeof r.criadoEm === 'string' && !isNaN(Date.parse(r.criadoEm)) &&
      (r.humor === null || r.humor === undefined || typeof r.humor === 'string');
  }

  function novoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function ordenar(lista) {
    return lista.slice().sort(function (a, b) { return b.criadoEm.localeCompare(a.criadoEm); });
  }

  /* ---------- Formatação ---------- */

  var fmtData = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var fmtCurta = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  var fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

  function dataLonga(iso) {
    var d = new Date(iso);
    var s = fmtData.format(d);
    return s.charAt(0).toUpperCase() + s.slice(1) + ', ' + fmtHora.format(d);
  }
  function dataCurta(iso) {
    var d = new Date(iso);
    return fmtCurta.format(d) + ', ' + fmtHora.format(d);
  }
  function trecho(texto) {
    var t = texto.replace(/\s+/g, ' ').trim();
    return t.length > 140 ? t.slice(0, 140).trim() + '…' : t;
  }

  /* ---------- Avisos e diálogo ---------- */

  var timerAviso;
  function avisar(msg) {
    var el = $('aviso');
    el.textContent = msg;
    el.classList.add('visivel');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { el.classList.remove('visivel'); }, 3200);
  }

  function confirmar(titulo, texto, rotulo) {
    var dlg = $('dialogo');
    if (!dlg || typeof dlg.showModal !== 'function') {
      return Promise.resolve(window.confirm(titulo + '\n\n' + texto));
    }
    $('dialogo-titulo').textContent = titulo;
    $('dialogo-texto').textContent = texto;
    $('dialogo-confirmar').textContent = rotulo || 'Apagar';
    return new Promise(function (resolve) {
      function fechar() {
        dlg.removeEventListener('close', fechar);
        resolve(dlg.returnValue === 'confirmar');
      }
      dlg.returnValue = '';
      dlg.addEventListener('close', fechar);
      dlg.showModal();
      $('dialogo-cancelar').focus();
    });
  }

  /* ---------- Área de transferência ---------- */

  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiarAntigo(texto); });
    }
    return Promise.resolve(copiarAntigo(texto));
  }

  function copiarAntigo(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.fontSize = '16px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, texto.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  /* ---------- Navegação ---------- */

  var TELAS = ['escrever', 'registros', 'detalhe', 'sobre'];

  function ir(nome, opcoes) {
    if (!(opcoes && opcoes.manterAviso)) { clearTimeout(timerAviso); $('aviso').classList.remove('visivel'); }
    TELAS.forEach(function (t) { $('tela-' + t).hidden = (t !== nome); });
    var abaAtiva = nome === 'detalhe' ? 'registros' : nome;
    document.querySelectorAll('.aba').forEach(function (b) {
      if (b.dataset.ir === abaAtiva) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    if (nome === 'registros') renderLista();
    if (nome === 'sobre') renderInfo();
    window.scrollTo(0, 0);
    if (!(opcoes && opcoes.semFoco)) {
      var titulo = document.querySelector('#tela-' + nome + ' h2');
      if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
    }
  }

  document.addEventListener('click', function (e) {
    var alvo = e.target.closest('[data-ir]');
    if (alvo) ir(alvo.dataset.ir);
  });

  /* ---------- Escrever ---------- */

  function renderHumores() {
    var caixa = $('lista-humores');
    var opcoes = [{ valor: '', rotulo: 'Prefiro não escolher', classe: 'sem-humor' }]
      .concat(HUMORES.map(function (h) { return { valor: h.nome, rotulo: h.nome }; }));
    opcoes.forEach(function (o, i) {
      var div = document.createElement('div');
      div.className = 'chip' + (o.classe ? ' ' + o.classe : '');
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'humor';
      input.id = 'humor-' + i;
      input.value = o.valor;
      if (i === 0) input.checked = true;
      var label = document.createElement('label');
      label.htmlFor = input.id;
      if (o.valor) label.appendChild(ponto(o.valor));
      label.appendChild(document.createTextNode(o.rotulo));
      div.appendChild(input);
      div.appendChild(label);
      caixa.appendChild(div);
    });
  }

  $('form-registro').addEventListener('submit', function (e) {
    e.preventDefault();
    var campo = $('campo-texto');
    var texto = campo.value.trim();
    if (!texto) {
      avisar('Escreva alguma coisa antes de guardar.');
      campo.focus();
      return;
    }
    var marcado = document.querySelector('input[name="humor"]:checked');
    var humor = marcado && marcado.value ? marcado.value : null;
    var soOuvir = $('so-ouvir').checked;
    var novo = { id: novoId(), criadoEm: new Date().toISOString(), humor: humor, texto: texto };
    if (soOuvir) novo.soOuvir = true;
    var lista = carregar();
    lista.push(novo);
    if (!salvar(lista)) return;
    campo.value = '';
    try { sessionStorage.removeItem('entrelinhas.rascunho'); } catch (err) {}
    $('humor-0').checked = true;
    $('so-ouvir').checked = false;
    abrir(novo.id, { manterAviso: true });
    avisar('Registro guardado.');
    if (reflexaoLigada()) pedirReflexao(novo.id);
  });

  // Rascunho temporário para não perder o texto se o app for fechado sem querer
  $('campo-texto').addEventListener('input', function (e) {
    try { sessionStorage.setItem('entrelinhas.rascunho', e.target.value); } catch (err) {}
  });

  /* ---------- Lista ---------- */

  function renderLista() {
    var lista = ordenar(carregar());
    var ul = $('lista-registros');
    ul.innerHTML = '';
    $('vazio').hidden = lista.length > 0;
    $('contagem').textContent = lista.length === 0 ? '' :
      (lista.length === 1 ? '1 registro neste aparelho.' : lista.length + ' registros neste aparelho.');

    lista.forEach(function (r) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'item';
      b.setAttribute('aria-label',
        'Registro de ' + dataCurta(r.criadoEm) + (r.humor ? ', humor ' + r.humor : ', sem humor') + '. ' + trecho(r.texto));

      var topo = document.createElement('div');
      topo.className = 'item-topo';
      var data = document.createElement('span');
      data.className = 'item-data';
      data.textContent = dataCurta(r.criadoEm);
      topo.appendChild(data);
      if (r.humor) {
        var h = document.createElement('span');
        h.className = 'item-humor';
        h.appendChild(ponto(r.humor));
        h.appendChild(document.createTextNode(r.humor));
        topo.appendChild(h);
      }
      var p = document.createElement('p');
      p.className = 'item-trecho';
      p.textContent = trecho(r.texto);

      b.appendChild(topo);
      b.appendChild(p);
      b.addEventListener('click', function () { abrir(r.id); });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  /* ---------- Detalhe ---------- */

  function abrir(id, opcoes) {
    var r = carregar().filter(function (x) { return x.id === id; })[0];
    if (!r) { avisar('Registro não encontrado.'); ir('registros'); return; }
    registroAberto = r;
    $('titulo-detalhe').textContent = dataLonga(r.criadoEm);
    var tag = $('detalhe-humor');
    tag.textContent = '';
    if (r.humor) tag.appendChild(ponto(r.humor));
    tag.appendChild(document.createTextNode(r.humor ? r.humor : 'sem humor escolhido'));
    $('detalhe-texto').textContent = r.texto;
    $('ajuda-reflexao').hidden = true;
    ir('detalhe', opcoes);
    renderReflexao(r);
  }

  /* ---------- Reflexão automática ---------- */

  function lerChave() { try { return localStorage.getItem(CHAVE_API) || ''; } catch (e) { return ''; } }
  function reflexaoLigada() {
    try { return !!lerChave() && localStorage.getItem(CHAVE_AUTO) !== 'nao'; } catch (e) { return false; }
  }

  var pedindo = {};

  function textoDoPedido(r) {
    return 'Registro de ' + dataLonga(r.criadoEm) + (r.humor ? ' (humor: ' + r.humor + ')' : '') + '.\n' +
      'so_ouvir: ' + (r.soOuvir ? 'verdadeiro' : 'falso') + '\n\n' + r.texto;
  }

  function chamarClaude(chave, sistema, mensagem, maxTokens) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, 60000) : null;
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl ? ctrl.signal : undefined,
      headers: {
        'content-type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: MODELO, max_tokens: maxTokens, system: sistema, messages: [{ role: 'user', content: mensagem }] })
    }).then(function (resp) {
      if (t) clearTimeout(t);
      return resp.json().catch(function () { return {}; }).then(function (dados) {
        if (!resp.ok) {
          var err = new Error((dados && dados.error && dados.error.message) || ('Erro ' + resp.status));
          err.status = resp.status;
          throw err;
        }
        var texto = (dados.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
        return texto;
      });
    }, function (err) { if (t) clearTimeout(t); throw err; });
  }

  function lerPartes(texto) {
    var limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    var ini = limpo.indexOf('{'), fim = limpo.lastIndexOf('}');
    try {
      var obj = JSON.parse(limpo.slice(ini, fim + 1));
      var partes = {};
      ['acolhimento', 'olhar', 'motivacao', 'conselho', 'pergunta', 'cuidado'].forEach(function (k) {
        partes[k] = typeof obj[k] === 'string' ? obj[k].trim() : '';
      });
      if (partes.acolhimento || partes.cuidado) return partes;
    } catch (e) {}
    return { acolhimento: texto.trim(), olhar: '', motivacao: '', conselho: '', pergunta: '', cuidado: '' };
  }

  function mensagemDeErro(err) {
    if (!navigator.onLine) return 'Sem conexão agora. Você pode pedir a reflexão quando estiver com internet.';
    if (err && err.status === 401) return 'A chave de API não foi aceita. Confira a chave em Seus dados.';
    if (err && (err.status === 402 || err.status === 403)) return 'A conta da API recusou o pedido. Verifique se há créditos ou permissão no console da Anthropic.';
    if (err && err.status === 429) return 'Muitos pedidos em pouco tempo. Tente de novo daqui a um minuto.';
    if (err && err.status >= 500) return 'O serviço do Claude está instável agora. Tente de novo em instantes.';
    if (err && err.name === 'AbortError') return 'A reflexão demorou demais. Tente de novo.';
    return 'Não foi possível gerar a reflexão agora. Tente de novo em instantes.';
  }

  function pedirReflexao(id) {
    var chave = lerChave();
    if (!chave) { renderReflexao(registroAberto); return; }
    var r = carregar().filter(function (x) { return x.id === id; })[0];
    if (!r || pedindo[id]) return;
    pedindo[id] = true;
    if (registroAberto && registroAberto.id === id) renderReflexao(r, { carregando: true });
    chamarClaude(chave, SISTEMA_REFLEXAO, textoDoPedido(r), 900).then(function (texto) {
      var partes = lerPartes(texto);
      var lista = carregar();
      lista.forEach(function (x) { if (x.id === id) x.reflexao = { criadaEm: new Date().toISOString(), modelo: MODELO, partes: partes }; });
      salvar(lista);
      delete pedindo[id];
      if (registroAberto && registroAberto.id === id) {
        registroAberto = lista.filter(function (x) { return x.id === id; })[0];
        renderReflexao(registroAberto, { recemChegada: true });
      }
    }, function (err) {
      delete pedindo[id];
      if (registroAberto && registroAberto.id === id) renderReflexao(r, { erro: mensagemDeErro(err) });
    });
  }

  var ROTULOS = [
    ['cuidado', 'Antes de tudo'],
    ['acolhimento', 'O que eu entendi'],
    ['olhar', 'Um olhar possível'],
    ['motivacao', 'Para te fortalecer'],
    ['conselho', 'Um passo gentil para hoje'],
    ['pergunta', 'Para seguir pensando']
  ];

  function renderReflexao(r, estado) {
    var caixa = $('reflexao');
    caixa.innerHTML = '';
    caixa.classList.remove('carregando');
    estado = estado || {};
    if (!r) return;
    var temChave = !!lerChave();

    var titulo = document.createElement('h3');
    titulo.className = 'reflexao-titulo';
    titulo.textContent = 'Reflexão';
    caixa.appendChild(titulo);

    if (pedindo[r.id] || estado.carregando) {
      caixa.classList.add('carregando');
      var p = document.createElement('p');
      p.className = 'reflexao-espera';
      p.textContent = 'Lendo o seu registro com cuidado…';
      caixa.appendChild(p);
      return;
    }

    if (r.reflexao && r.reflexao.partes) {
      ROTULOS.forEach(function (par) {
        var valor = r.reflexao.partes[par[0]];
        if (!valor) return;
        var bloco = document.createElement('section');
        bloco.className = 'reflexao-parte parte-' + par[0];
        var h = document.createElement('h4');
        h.textContent = par[1];
        var t = document.createElement('p');
        t.textContent = valor;
        bloco.appendChild(h);
        bloco.appendChild(t);
        caixa.appendChild(bloco);
      });
      var nota = document.createElement('p');
      nota.className = 'reflexao-nota';
      nota.textContent = 'Reflexão gerada por IA, como apoio. Não é terapia nem diagnóstico.';
      caixa.appendChild(nota);
      if (temChave) caixa.appendChild(botaoPedir('Gerar outra reflexão', r.id, true));
      if (estado.recemChegada) caixa.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (estado.erro) {
      var e = document.createElement('p');
      e.className = 'reflexao-erro';
      e.textContent = estado.erro;
      caixa.appendChild(e);
    }

    if (temChave) {
      caixa.appendChild(botaoPedir(estado.erro ? 'Tentar de novo' : 'Pedir reflexão', r.id, false));
    } else {
      var info = document.createElement('p');
      info.className = 'dica';
      info.textContent = 'Para receber a reflexão aqui automaticamente, adicione sua chave do Claude em Seus dados. Ou use o botão abaixo para copiar o pedido e colar no app do Claude.';
      caixa.appendChild(info);
      var ir2 = document.createElement('button');
      ir2.type = 'button';
      ir2.className = 'botao secundario';
      ir2.textContent = 'Configurar reflexão automática';
      ir2.addEventListener('click', function () { ir('sobre'); });
      caixa.appendChild(ir2);
    }
  }

  function botaoPedir(rotulo, id, refazer) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = refazer ? 'botao texto' : 'botao principal';
    b.textContent = rotulo;
    b.addEventListener('click', function () { pedirReflexao(id); });
    return b;
  }

  function renderConfigReflexao() {
    var chave = lerChave();
    $('estado-chave').textContent = chave
      ? 'Chave guardada neste aparelho (termina em ' + chave.slice(-4) + ').'
      : 'Nenhuma chave guardada.';
    $('campo-chave').value = '';
    $('botao-remover-chave').hidden = !chave;
    $('linha-auto').hidden = !chave;
    try { $('reflexao-auto').checked = localStorage.getItem(CHAVE_AUTO) !== 'nao'; } catch (e) {}
  }

  $('form-chave').addEventListener('submit', function (e) {
    e.preventDefault();
    var chave = $('campo-chave').value.trim();
    if (!chave) { avisar('Cole a chave antes de guardar.'); return; }
    var botao = $('botao-guardar-chave');
    botao.disabled = true;
    botao.textContent = 'Testando a chave…';
    chamarClaude(chave, 'Responda apenas: ok', 'teste', 5).then(function () {
      try { localStorage.setItem(CHAVE_API, chave); localStorage.removeItem(CHAVE_AUTO); } catch (err) {}
      avisar('Chave funcionando. A reflexão automática está ligada.');
      renderConfigReflexao();
    }, function (err) {
      avisar(mensagemDeErro(err));
    }).then(function () {
      botao.disabled = false;
      botao.textContent = 'Guardar e testar chave';
    });
  });

  $('botao-remover-chave').addEventListener('click', function () {
    confirmar('Remover a chave?', 'A reflexão automática será desligada. As reflexões já guardadas continuam nos registros.', 'Remover')
      .then(function (sim) {
        if (!sim) return;
        try { localStorage.removeItem(CHAVE_API); } catch (e) {}
        renderConfigReflexao();
        avisar('Chave removida.');
      });
  });

  $('reflexao-auto').addEventListener('change', function (e) {
    try { localStorage.setItem(CHAVE_AUTO, e.target.checked ? 'sim' : 'nao'); } catch (err) {}
    avisar(e.target.checked ? 'Reflexão automática ligada.' : 'Reflexão automática desligada.');
  });

  $('botao-copiar').addEventListener('click', function () {
    if (!registroAberto) return;
    copiar(registroAberto.texto).then(function (ok) {
      avisar(ok ? 'Texto copiado.' : 'Não foi possível copiar. Toque e segure no texto para selecionar.');
    });
  });

  $('botao-reflexao').addEventListener('click', function () {
    if (!registroAberto) return;
    var r = registroAberto;
    var pedido = INSTRUCAO_REFLEXAO + '\n\n' +
      'Registro de ' + dataLonga(r.criadoEm) +
      (r.humor ? ' (humor: ' + r.humor + ')' : '') + ':\n\n' +
      (r.soOuvir ? 'Hoje eu só quero ser ouvida.\n\n' : '') +
      r.texto;
    copiar(pedido).then(function (ok) {
      if (ok) {
        $('ajuda-reflexao').hidden = false;
        $('ajuda-reflexao').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        avisar('Não foi possível copiar automaticamente neste navegador.');
      }
    });
  });

  $('botao-apagar').addEventListener('click', function () {
    if (!registroAberto) return;
    var alvo = registroAberto;
    confirmar('Apagar este registro?', 'O registro de ' + dataCurta(alvo.criadoEm) + ' será removido deste aparelho. Não dá para desfazer.')
      .then(function (sim) {
        if (!sim) return;
        var lista = carregar().filter(function (x) { return x.id !== alvo.id; });
        if (salvar(lista)) {
          registroAberto = null;
          ir('registros');
          avisar('Registro apagado.');
        }
      });
  });

  /* ---------- Seus dados ---------- */

  function renderInfo() {
    renderConfigReflexao();
    var n = carregar().length;
    var partes = [n === 1 ? 'Há 1 registro guardado neste aparelho.' : 'Há ' + n + ' registros guardados neste aparelho.'];
    if (!armazenamentoOk) partes.push('O armazenamento do navegador parece bloqueado. Verifique se a navegação privada está desativada.');
    var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (!standalone) partes.push('Dica: no iPhone, use sempre o ícone da Tela de Início. O app instalado guarda os registros separado do Safari.');
    $('info-armazenamento').textContent = partes.join(' ');
  }

  $('botao-apagar-tudo').addEventListener('click', function () {
    var n = carregar().length;
    if (n === 0) { avisar('Não há registros para apagar.'); return; }
    confirmar('Apagar todos os registros?',
      'Isso remove ' + (n === 1 ? 'o único registro' : 'os ' + n + ' registros') + ' deste aparelho. Se quiser guardar uma cópia, exporte antes. Não dá para desfazer.',
      'Apagar tudo')
      .then(function (sim) {
        if (!sim) return;
        if (salvar([])) { avisar('Todos os registros foram apagados.'); renderInfo(); }
      });
  });

  $('botao-exportar').addEventListener('click', function () {
    var lista = ordenar(carregar());
    if (lista.length === 0) { avisar('Não há registros para exportar.'); return; }
    var conteudo = JSON.stringify({ app: 'Entrelinhas', versao: 1, exportadoEm: new Date().toISOString(), registros: lista }, null, 2);
    var hoje = new Date().toISOString().slice(0, 10);
    var nome = 'entrelinhas-' + hoje + '.json';
    var blob = new Blob([conteudo], { type: 'application/json' });

    var arquivo = null;
    try { arquivo = new File([blob], nome, { type: 'application/json' }); } catch (e) {}

    if (arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      navigator.share({ files: [arquivo], title: 'Cópia do Entrelinhas' }).catch(function (err) {
        if (err && err.name !== 'AbortError') baixar(blob, nome);
      });
    } else {
      baixar(blob, nome);
    }
  });

  function baixar(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    avisar('Arquivo exportado.');
  }

  $('campo-importar').addEventListener('change', function (e) {
    var arq = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    if (arq.size > 20 * 1024 * 1024) { avisar('Arquivo grande demais para importar.'); return; }
    var leitor = new FileReader();
    leitor.onload = function () {
      var dados;
      try { dados = JSON.parse(leitor.result); } catch (err) { avisar('Este arquivo não parece um JSON válido.'); return; }
      var entrada = Array.isArray(dados) ? dados : (dados && Array.isArray(dados.registros) ? dados.registros : null);
      if (!entrada) { avisar('Não encontrei registros neste arquivo.'); return; }
      var novos = entrada.filter(valido).map(function (r) {
        var n = { id: r.id, criadoEm: new Date(r.criadoEm).toISOString(), humor: r.humor || null, texto: r.texto };
        if (r.soOuvir === true) n.soOuvir = true;
        if (reflexaoValida(r.reflexao)) n.reflexao = r.reflexao;
        return n;
      });
      if (novos.length === 0) { avisar('Não encontrei registros válidos neste arquivo.'); return; }
      var atual = carregar();
      var ids = {};
      atual.forEach(function (r) { ids[r.id] = true; });
      var adicionados = novos.filter(function (r) { if (ids[r.id]) return false; ids[r.id] = true; return true; });
      if (adicionados.length === 0) { avisar('Todos os registros deste arquivo já estavam aqui.'); return; }
      if (salvar(atual.concat(adicionados))) {
        avisar(adicionados.length === 1 ? '1 registro importado.' : adicionados.length + ' registros importados.');
        renderInfo();
      }
    };
    leitor.onerror = function () { avisar('Não foi possível ler o arquivo.'); };
    leitor.readAsText(arq);
  });

  /* ---------- Início ---------- */

  renderHumores();
  var fmtHoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('hoje').textContent = fmtHoje.format(new Date());
  try {
    var rascunho = sessionStorage.getItem('entrelinhas.rascunho');
    if (rascunho) $('campo-texto').value = rascunho;
  } catch (e) {}
  carregar();
  ir('escrever', { semFoco: true });

  // Pede ao navegador para não apagar os dados automaticamente, quando suportado
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function () {});
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      var tinhaControle = !!navigator.serviceWorker.controller;
      var recarregou = false;
      // Quando uma versão nova do app assume, recarrega uma vez para mostrar o visual atualizado
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!tinhaControle || recarregou) return;
        recarregou = true;
        window.location.reload();
      });
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function (reg) {
        reg.update().catch(function () {});
      }).catch(function () {});
    });
  }
})();
