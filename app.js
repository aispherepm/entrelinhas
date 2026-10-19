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
    'Resuma brevemente o que entendeu e pergunte se entendeu certo. Depois faça no máximo uma pergunta aberta por vez, sem me pressionar. ' +
    'Se mencionar psicologia ou neurociência, explique os conceitos em linguagem simples e diferencie informação geral de hipótese sobre mim. ' +
    'Não faça diagnósticos nem se apresente como psicólogo, psicanalista, neurocientista ou profissional de saúde. ' +
    'Não force interpretações psicanalíticas. Se eu disser que não quero perguntas ou interpretações, apenas me escute.';

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
    var lista = carregar();
    lista.push({ id: novoId(), criadoEm: new Date().toISOString(), humor: humor, texto: texto });
    if (!salvar(lista)) return;
    campo.value = '';
    try { sessionStorage.removeItem('entrelinhas.rascunho'); } catch (err) {}
    $('humor-0').checked = true;
    ir('registros', { manterAviso: true });
    avisar('Registro guardado.');
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

  function abrir(id) {
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
    ir('detalhe');
  }

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
        return { id: r.id, criadoEm: new Date(r.criadoEm).toISOString(), humor: r.humor || null, texto: r.texto };
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
