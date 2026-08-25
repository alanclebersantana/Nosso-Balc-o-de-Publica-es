/* ==========================================================================
   Publicações — Controle de Movimento — lógica principal do app
   ========================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------ Estado */
  let estado = {
    codigo: null,
    nome: "",
    cicloInicio: "setembro",
    anoServico: String(new Date().getFullYear()),
    itens: {},
    personalizados: [],
    catalogoOficial: null, // não-nulo depois que a congregação importa uma revisão nova do S-28-T
  };

  // Catálogo completo (oficial S-28-T + publicações extras) para o estado atual
  function catalogoAtual() {
    return catalogoCompleto(estado.personalizados, estado.catalogoOficial);
  }

  let mesAtivo = 0;
  let abaAtiva = "lancamento";
  let termoBusca = "";
  let pararDeOuvir = null;
  let debounceSalvar = new Map(); // itemId -> timeout
  let editandoAgora = null; // {itemId, campo} — evita que o snapshot remoto sobrescreva o campo em digitação

  const LS_CODIGO = "pub_codigo_congregacao";

  /* ------------------------------------------------------------ Utilidades */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function toast(msg, ms = 2600) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (el.hidden = true), ms);
  }

  function normalizarTexto(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function definirStatus(tipo) {
    const chip = $("#status-sync");
    const texto = $("#status-texto");
    chip.classList.remove("online", "offline", "sincronizando");
    if (tipo === "online") {
      chip.classList.add("online");
      texto.textContent = "sincronizado";
    } else if (tipo === "offline") {
      chip.classList.add("offline");
      texto.textContent = "offline";
    } else if (tipo === "sincronizando") {
      chip.classList.add("sincronizando");
      texto.textContent = "sincronizando…";
    } else if (tipo === "local") {
      texto.textContent = "modo local";
    } else {
      texto.textContent = "conectando…";
    }
  }

  Sync.definirCallbackStatus(definirStatus);
  window.addEventListener("online", () => definirStatus(Sync.pronto ? "online" : "local"));
  window.addEventListener("offline", () => definirStatus("offline"));

  /* ============================================================ */
  /* Aparência: paleta de cores, modo escuro, tamanho de fonte      */
  /* (preferências deste dispositivo — não são sincronizadas)       */
  /* ============================================================ */
  Temas.iniciar();
  Temas.montarSeletorPaletas($("#grade-paletas"));

  $("#btn-tema").addEventListener("click", () => {
    Temas.aplicarTemaEscuro(!Temas.temaEscuroAtual());
  });
  $("#chk-tema-escuro").addEventListener("change", (ev) => {
    Temas.aplicarTemaEscuro(ev.target.checked);
  });
  $("#escala-mais").addEventListener("click", () => Temas.aumentarEscala());
  $("#escala-menos").addEventListener("click", () => Temas.diminuirEscala());

  /* ============================================================ */
  /* Tela de configuração inicial                                  */
  /* ============================================================ */
  let congregacaoNovaPendente = false;
  let jaEntrouNoApp = false; // true depois do primeiro login bem-sucedido nesta sessão
  let saindoDeContaManualmente = false; // evita recarregar 2x quando o próprio botão "Sair da conta" já cuida disso

  async function iniciarApp() {
    await Sync.inicializar();

    if (Sync.configurado && !Sync.usuarioAtual()) {
      mostrarTelaLogin();
      return;
    }
    await continuarAposLogin();
  }

  // Se a sessão cair depois de já termos entrado no app (ex.: senha alterada
  // em outro dispositivo), volta para a tela de login em vez de travar.
  Sync.definirCallbackAuth((user) => {
    if (!user && jaEntrouNoApp && Sync.configurado && !saindoDeContaManualmente) {
      location.reload();
    }
  });

  async function continuarAposLogin() {
    jaEntrouNoApp = true;
    $("#tela-login").hidden = true;
    atualizarSecaoConta();

    const codigoSalvo = localStorage.getItem(LS_CODIGO);
    if (codigoSalvo) {
      const r = await Sync.buscarCongregacao(codigoSalvo);
      if (r.ok && r.existe) {
        await entrarNaCongregacao(r.codigo, r.dados);
        return;
      }
    }
    mostrarTelaSetup();
  }

  function mostrarTelaSetup() {
    $("#tela-setup").hidden = false;
    definirStatus(Sync.pronto ? "conectando" : "local");
  }

  function atualizarSecaoConta() {
    const usuario = Sync.usuarioAtual();
    $("#cfg-secao-conta").hidden = !usuario;
    if (usuario) $("#cfg-email-conta").value = usuario.email || "";
  }

  /* ---- Tela de login (e-mail e senha) ---- */
  let modoLoginCriarConta = false;

  function mostrarTelaLogin() {
    modoLoginCriarConta = false;
    atualizarTextoLogin();
    $("#login-email").value = "";
    $("#login-senha").value = "";
    $("#login-erro").hidden = true;
    $("#tela-login").hidden = false;
  }

  function atualizarTextoLogin() {
    $("#login-titulo-modo").textContent = modoLoginCriarConta ? "Criar conta" : "Entrar na conta";
    $("#btn-login-enviar").textContent = modoLoginCriarConta ? "Criar conta" : "Entrar";
    $("#link-alternar-login").textContent = modoLoginCriarConta ? "Já tem conta? Entrar" : "Não tem conta? Criar uma";
    $("#login-erro").hidden = true;
  }

  $("#link-alternar-login").addEventListener("click", (ev) => {
    ev.preventDefault();
    modoLoginCriarConta = !modoLoginCriarConta;
    atualizarTextoLogin();
  });

  $("#link-esqueci-senha").addEventListener("click", async (ev) => {
    ev.preventDefault();
    const email = $("#login-email").value.trim();
    if (!email) {
      $("#login-erro").textContent = 'Digite seu e-mail acima e depois toque em "Esqueci minha senha".';
      $("#login-erro").hidden = false;
      return;
    }
    const r = await Sync.redefinirSenha(email);
    if (r.ok) {
      toast("Enviamos um link de redefinição de senha para " + email + ".", 4000);
    } else {
      $("#login-erro").textContent = r.mensagem;
      $("#login-erro").hidden = false;
    }
  });

  $("#form-login").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = $("#login-email").value.trim();
    const senha = $("#login-senha").value;
    const btn = $("#btn-login-enviar");
    $("#login-erro").hidden = true;
    btn.disabled = true;
    btn.textContent = modoLoginCriarConta ? "Criando conta…" : "Entrando…";

    const r = modoLoginCriarConta
      ? await Sync.criarContaComEmail(email, senha)
      : await Sync.entrarComEmail(email, senha);

    btn.disabled = false;
    atualizarTextoLogin();

    if (!r.ok) {
      $("#login-erro").textContent = r.mensagem;
      $("#login-erro").hidden = false;
      return;
    }
    await continuarAposLogin();
  });

  $("#input-codigo").addEventListener("input", () => {
    // Se o código for editado depois de já termos verificado outro código,
    // força uma nova verificação (evita criar/sobrescrever a congregação errada).
    if (congregacaoNovaPendente) {
      congregacaoNovaPendente = false;
      $("#bloco-nova-congregacao").hidden = true;
      $("#btn-entrar").textContent = "Entrar";
    }
  });

  $("#form-setup").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const codigoDigitado = $("#input-codigo").value;
    const btn = $("#btn-entrar");
    $("#setup-erro").hidden = true;

    if (!congregacaoNovaPendente) {
      btn.textContent = "Verificando…";
      btn.disabled = true;
      const r = await Sync.buscarCongregacao(codigoDigitado);
      btn.disabled = false;

      if (r.ok && r.existe) {
        btn.textContent = "Entrar";
        await entrarNaCongregacao(r.codigo, r.dados);
        return;
      }

      if (r.ok && !r.existe) {
        congregacaoNovaPendente = true;
        $("#bloco-nova-congregacao").hidden = false;
        $("#input-nome").value = "";
        $("#input-ano").value = String(new Date().getFullYear());
        btn.textContent = "Criar nova congregação";
        toast("Código novo — preencha os dados para criar.");
        return;
      }

      $("#setup-erro").textContent = "Não foi possível verificar o código agora. Tente novamente.";
      $("#setup-erro").hidden = false;
      return;
    }

    // Criando congregação nova
    const nome = $("#input-nome").value.trim() || codigoDigitado;
    const cicloInicio = $("#input-ciclo").value;
    const anoServico = $("#input-ano").value.trim() || String(new Date().getFullYear());
    btn.disabled = true;
    btn.textContent = "Criando…";
    const { codigo, dados } = await Sync.criarCongregacao(codigoDigitado, { nome, cicloInicio, anoServico });
    btn.disabled = false;
    await entrarNaCongregacao(codigo, dados);
  });

  async function entrarNaCongregacao(codigo, dados) {
    estado.codigo = codigo;
    estado.nome = dados.nome || codigo;
    estado.cicloInicio = dados.cicloInicio || "setembro";
    estado.anoServico = dados.anoServico || String(new Date().getFullYear());
    estado.itens = dados.itens || {};
    estado.personalizados = Array.isArray(dados.personalizados) ? dados.personalizados : [];
    estado.catalogoOficial = Array.isArray(dados.catalogoOficial) && dados.catalogoOficial.length ? dados.catalogoOficial : null;

    localStorage.setItem(LS_CODIGO, codigo);
    $("#tela-setup").hidden = true;
    $("#app").hidden = false;

    detectarMesAtualAutomaticamente();
    montarSeletorMes();
    construirListaItens();
    atualizarCabecalho();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
    atualizarVisibilidadeRestaurarCatalogo();

    if (pararDeOuvir) pararDeOuvir();
    if (Sync.pronto) {
      pararDeOuvir = Sync.ouvir(codigo, aoReceberAtualizacaoRemota);
      definirStatus("online");
    } else {
      definirStatus("local");
    }
  }

  function detectarMesAtualAutomaticamente() {
    const hoje = new Date();
    const mesReal = hoje.getMonth(); // 0=jan ... 11=dez
    // set,out,nov,dez,jan,fev -> índices reais 8,9,10,11,0,1
    // mar,abr,mai,jun,jul,ago -> índices reais 2,3,4,5,6,7
    const mapaSetembro = [8, 9, 10, 11, 0, 1];
    const mapaMarco = [2, 3, 4, 5, 6, 7];
    const mapa = estado.cicloInicio === "setembro" ? mapaSetembro : mapaMarco;
    const idx = mapa.indexOf(mesReal);
    mesAtivo = idx >= 0 ? idx : 0;
  }

  /* ============================================================ */
  /* Atualizações remotas (tempo real)                             */
  /* ============================================================ */
  function aoReceberAtualizacaoRemota(dados, meta) {
    if (meta.origemLocal) return; // já refletimos localmente antes de enviar
    estado.nome = dados.nome ?? estado.nome;
    estado.cicloInicio = dados.cicloInicio ?? estado.cicloInicio;
    estado.anoServico = dados.anoServico ?? estado.anoServico;

    const itensRemotos = dados.itens || {};
    Object.keys(itensRemotos).forEach((id) => {
      if (editandoAgora && editandoAgora.itemId === id) return; // não sobrescreve campo em digitação
      estado.itens[id] = itensRemotos[id];
    });

    const personalizadosMudaram = JSON.stringify(dados.personalizados || []) !== JSON.stringify(estado.personalizados);
    estado.personalizados = Array.isArray(dados.personalizados) ? dados.personalizados : estado.personalizados;

    const novoCatalogoOficial = Array.isArray(dados.catalogoOficial) && dados.catalogoOficial.length ? dados.catalogoOficial : null;
    const catalogoOficialMudou = JSON.stringify(novoCatalogoOficial) !== JSON.stringify(estado.catalogoOficial);
    estado.catalogoOficial = novoCatalogoOficial;

    atualizarCabecalho();
    if (personalizadosMudaram || catalogoOficialMudou) construirListaItens();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
    if (catalogoOficialMudou) atualizarVisibilidadeRestaurarCatalogo();
  }

  /* ============================================================ */
  /* Construção da lista de categorias / itens                     */
  /* ============================================================ */
  function construirListaItens() {
    const container = $("#categorias");
    const abertasAntes = new Set($$(".categoria.aberta").map((el) => el.dataset.categoria));
    container.innerHTML = "";

    catalogoAtual().forEach((cat, idx) => {
      const secao = document.createElement("div");
      const jaAberta = abertasAntes.size ? abertasAntes.has(cat.categoria) : idx === 0;
      secao.className = "categoria" + (jaAberta ? " aberta" : "");
      secao.dataset.categoria = cat.categoria;

      secao.innerHTML = `
        <div class="categoria-cabecalho">
          <div class="categoria-nome">${cat.categoria}</div>
          <div class="categoria-direita">
            <span class="categoria-contagem">${cat.itens.length} itens</span>
            <svg class="categoria-seta" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
          </div>
        </div>
        <div class="categoria-itens"></div>
      `;

      const listaItens = secao.querySelector(".categoria-itens");
      cat.itens.forEach((it) => {
        const id = it.personalizado ? it.id : idItem(it.sigla);
        const cartao = document.createElement("div");
        cartao.className = "item-cartao";
        cartao.dataset.itemId = id;
        cartao.dataset.busca = normalizarTexto(`${it.titulo} ${it.sigla} ${it.codigo || ""}`);

        cartao.innerHTML = `
          ${it.personalizado ? '<button class="item-remover" data-remover-item title="Remover publicação">×</button>' : ""}
          <div class="item-cabecalho">
            <div class="item-titulo">${it.titulo}${it.kit ? '<span class="item-kit" title="Kit de Ensino">*</span>' : ""}${it.personalizado ? '<br/><span class="item-tag-personalizado">extra</span>' : ""}</div>
            <div class="item-meta">${it.codigo ? it.codigo + " · " : ""}${it.sigla || ""}</div>
          </div>
          <div class="item-campos">
            <div class="campo-mini campo-estoque-anterior">
              <label>Est. anterior</label>
              <input type="number" min="0" inputmode="numeric" data-campo="estoqueAnterior" />
            </div>
            <div class="campo-mini">
              <label>Recebido</label>
              <input type="number" min="0" inputmode="numeric" data-campo="recebido" />
            </div>
            <div class="campo-mini">
              <label>Estoque</label>
              <input type="number" min="0" inputmode="numeric" data-campo="estoque" />
            </div>
            <div class="campo-mini campo-saida">
              <label>Saída</label>
              <div class="valor-saida vazio" data-campo="saida">—</div>
            </div>
          </div>
        `;
        listaItens.appendChild(cartao);
      });

      const botaoAdd = document.createElement("button");
      botaoAdd.type = "button";
      botaoAdd.className = "botao-add-item";
      botaoAdd.dataset.addCategoria = cat.categoria;
      botaoAdd.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"/></svg>
        Adicionar publicação
      `;
      listaItens.appendChild(botaoAdd);

      container.appendChild(secao);
    });

    if (termoBusca) aplicarFiltroBusca();
  }

  // Delegação de eventos configurada uma única vez (o container é reaproveitado
  // mesmo quando as categorias são reconstruídas ao iniciar um novo ciclo).
  let eventosContainerConfigurados = false;
  function configurarEventosContainer() {
    if (eventosContainerConfigurados) return;
    eventosContainerConfigurados = true;
    const container = $("#categorias");

    container.addEventListener("click", (ev) => {
      const botaoAdd = ev.target.closest("[data-add-categoria]");
      if (botaoAdd) {
        abrirModalItem(botaoAdd.dataset.addCategoria);
        return;
      }
      const botaoRemover = ev.target.closest("[data-remover-item]");
      if (botaoRemover) {
        removerItemPersonalizado(botaoRemover.closest(".item-cartao").dataset.itemId);
        return;
      }
      const cab = ev.target.closest(".categoria-cabecalho");
      if (cab) cab.parentElement.classList.toggle("aberta");
    });

    container.addEventListener("input", aoDigitarCampo);
    container.addEventListener("focusin", (ev) => {
      const input = ev.target.closest("input[data-campo]");
      if (!input) return;
      const cartao = input.closest(".item-cartao");
      editandoAgora = { itemId: cartao.dataset.itemId, campo: input.dataset.campo };
    });
    container.addEventListener("focusout", (ev) => {
      const input = ev.target.closest("input[data-campo]");
      if (!input) return;
      editandoAgora = null;
    });
  }

  function aoDigitarCampo(ev) {
    const input = ev.target.closest("input[data-campo]");
    if (!input) return;
    const cartao = input.closest(".item-cartao");
    const itemId = cartao.dataset.itemId;
    const campo = input.dataset.campo;
    const numero = input.value === "" ? null : Number(input.value);
    const valor = numero == null || Number.isNaN(numero) ? null : Math.max(0, Math.round(numero));

    const itemState = Calc.garantirItem(estado.itens, itemId);

    if (campo === "estoqueAnterior") {
      if (mesAtivo !== 0) return; // só editável no 1º mês do ciclo
      itemState.estoqueAnterior = valor;
    } else {
      itemState.periodos[mesAtivo][campo] = valor;
    }

    atualizarSaidaExibida(cartao, itemState);
    atualizarResumoMes();
    agendarSalvamento(itemId, itemState);
  }

  function agendarSalvamento(itemId, itemState) {
    clearTimeout(debounceSalvar.get(itemId));
    const t = setTimeout(() => {
      Sync.salvarItem(estado.codigo, itemId, {
        estoqueAnterior: itemState.estoqueAnterior,
        periodos: itemState.periodos,
      });
    }, 550);
    debounceSalvar.set(itemId, t);
  }

  /* ============================================================ */
  /* Exibição dos valores (troca de mês / atualização remota)      */
  /* ============================================================ */
  function atualizarValoresExibidos() {
    $$(".item-cartao").forEach((cartao) => {
      const id = cartao.dataset.itemId;
      const itemState = Calc.garantirItem(estado.itens, id);
      preencherCampos(cartao, itemState);
    });
    atualizarResumoMes();
  }

  function preencherCampos(cartao, itemState) {
    const inputAnterior = cartao.querySelector('[data-campo="estoqueAnterior"]');
    const inputRecebido = cartao.querySelector('[data-campo="recebido"]');
    const inputEstoque = cartao.querySelector('[data-campo="estoque"]');

    const anterior = Calc.estoqueAnterior(itemState, mesAtivo);
    const periodo = itemState.periodos[mesAtivo] || {};

    if (mesAtivo === 0) {
      inputAnterior.readOnly = false;
      inputAnterior.closest(".campo-mini").classList.remove("somente-leitura");
      if (document.activeElement !== inputAnterior) inputAnterior.value = itemState.estoqueAnterior ?? "";
      inputAnterior.placeholder = "0";
    } else {
      inputAnterior.readOnly = true;
      inputAnterior.closest(".campo-mini").classList.add("somente-leitura");
      inputAnterior.value = anterior ?? "";
      inputAnterior.placeholder = anterior == null ? "conte o mês ant." : "";
    }

    if (document.activeElement !== inputRecebido) inputRecebido.value = periodo.recebido ?? "";
    if (document.activeElement !== inputEstoque) inputEstoque.value = periodo.estoque ?? "";

    atualizarSaidaExibida(cartao, itemState);
  }

  function atualizarSaidaExibida(cartao, itemState) {
    const saida = Calc.saida(itemState, mesAtivo);
    const el = cartao.querySelector('[data-campo="saida"]');
    el.classList.remove("negativo", "vazio");
    if (saida == null) {
      el.textContent = "—";
      el.classList.add("vazio");
    } else {
      el.textContent = saida;
      if (saida < 0) el.classList.add("negativo");
    }
  }

  function atualizarResumoMes() {
    const lista = listaAchatada(estado.personalizados, estado.catalogoOficial);
    let contados = 0;
    let totalRecebido = 0;
    let totalSaida = 0;
    let negativos = 0;

    lista.forEach((it) => {
      const itemState = Calc.garantirItem(estado.itens, it.id);
      const p = itemState.periodos[mesAtivo] || {};
      if (p.estoque != null) contados++;
      if (p.recebido) totalRecebido += Number(p.recebido);
      const s = Calc.saida(itemState, mesAtivo);
      if (s != null) {
        totalSaida += s;
        if (s < 0) negativos++;
      }
    });

    $("#resumo-mes").innerHTML = `
      <button type="button" class="resumo-cartao" data-tipo="lancados">
        <div class="rotulo">Itens lançados</div>
        <div class="valor">${contados}/${lista.length}</div>
      </button>
      <button type="button" class="resumo-cartao" data-tipo="recebido">
        <div class="rotulo">Total recebido</div>
        <div class="valor">${totalRecebido}</div>
      </button>
      <button type="button" class="resumo-cartao" data-tipo="saida">
        <div class="rotulo">Total de saída</div>
        <div class="valor">${totalSaida}</div>
      </button>
      <button type="button" class="resumo-cartao ${negativos ? "alerta" : ""}" data-tipo="revisar">
        <div class="rotulo">Contagens a revisar</div>
        <div class="valor">${negativos}</div>
      </button>
    `;
  }

  $("#resumo-mes").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".resumo-cartao");
    if (btn) abrirDetalhe(btn.dataset.tipo);
  });

  function abrirDetalhe(tipo) {
    const lista = listaAchatada(estado.personalizados, estado.catalogoOficial);
    const linhas = [];
    let titulo = "";
    let intro = "";
    const mesNome = CICLOS[estado.cicloInicio][mesAtivo];

    if (tipo === "lancados") {
      titulo = "Itens lançados";
      intro = `Itens com contagem de estoque já registrada em ${mesNome}.`;
      lista.forEach((it) => {
        const itemState = Calc.garantirItem(estado.itens, it.id);
        const p = itemState.periodos[mesAtivo] || {};
        if (p.estoque != null) linhas.push({ nome: it.titulo, sigla: it.sigla, valor: `estoque ${p.estoque}` });
      });
    } else if (tipo === "recebido") {
      titulo = "Total recebido";
      intro = `Itens com quantidade recebida em ${mesNome}.`;
      lista.forEach((it) => {
        const itemState = Calc.garantirItem(estado.itens, it.id);
        const p = itemState.periodos[mesAtivo] || {};
        if (p.recebido) linhas.push({ nome: it.titulo, sigla: it.sigla, valor: `+${p.recebido}` });
      });
    } else if (tipo === "saida") {
      titulo = "Total de saída";
      intro = `Saída calculada por item em ${mesNome} (estoque anterior + recebido − estoque contado).`;
      lista.forEach((it) => {
        const itemState = Calc.garantirItem(estado.itens, it.id);
        const s = Calc.saida(itemState, mesAtivo);
        if (s) linhas.push({ nome: it.titulo, sigla: it.sigla, valor: s, negativo: s < 0 });
      });
    } else if (tipo === "revisar") {
      titulo = "Contagens a revisar";
      intro = `Itens com saída negativa em ${mesNome} — normalmente sinal de erro de contagem ou de lançamento.`;
      lista.forEach((it) => {
        const itemState = Calc.garantirItem(estado.itens, it.id);
        const s = Calc.saida(itemState, mesAtivo);
        if (s != null && s < 0) linhas.push({ nome: it.titulo, sigla: it.sigla, valor: s, negativo: true });
      });
    }

    $("#detalhe-titulo").textContent = titulo;
    $("#detalhe-intro").textContent = intro + (linhas.length ? "" : " Nada por aqui ainda.");
    $("#detalhe-lista").innerHTML = linhas.length
      ? linhas
          .map(
            (l) => `
        <div class="linha-detalhe ${l.negativo ? "negativo" : ""}">
          <span class="nome">${l.nome}${l.sigla ? `<span class="sigla">${l.sigla}</span>` : ""}</span>
          <span class="valor">${l.valor}</span>
        </div>`
          )
          .join("")
      : '<p class="vazio-detalhe">Nada por aqui ainda.</p>';

    $("#modal-detalhe").hidden = false;
  }
  $("#fechar-detalhe").addEventListener("click", () => ($("#modal-detalhe").hidden = true));
  $("#modal-detalhe").addEventListener("click", (ev) => {
    if (ev.target.id === "modal-detalhe") $("#modal-detalhe").hidden = true;
  });

  /* ============================================================ */
  /* Cabeçalho / seletor de mês / ciclo                             */
  /* ============================================================ */
  function atualizarCabecalho() {
    $("#nome-congregacao").textContent = estado.nome + " · " + estado.anoServico;
    $("#sel-ciclo").value = estado.cicloInicio;
    document.title = "Publicações — " + estado.nome;
  }

  function montarSeletorMes() {
    const meses = CICLOS[estado.cicloInicio];
    const sel = $("#sel-mes");
    sel.innerHTML = meses.map((m, i) => `<option value="${i}">${m}</option>`).join("");
    sel.value = mesAtivo;
  }

  $("#sel-mes").addEventListener("change", (ev) => {
    mesAtivo = Number(ev.target.value);
    atualizarValoresExibidos();
  });

  $("#sel-ciclo").addEventListener("change", (ev) => {
    const novo = ev.target.value;
    if (novo === estado.cicloInicio) return;
    ev.target.value = estado.cicloInicio; // reverte visualmente; a troca real passa por "novo ciclo"
    abrirConfirmacaoNovoCiclo(novo);
  });

  async function abrirConfirmacaoNovoCiclo(novoCiclo) {
    const mesesAtual = CICLOS[estado.cicloInicio];
    const mesesNovo = CICLOS[novoCiclo];
    const ok = confirm(
      `Iniciar um novo ciclo (${mesesNovo[0]} a ${mesesNovo[5]})?\n\n` +
        `Os dados do ciclo atual (${mesesAtual[0]} a ${mesesAtual[5]}) serão arquivados com segurança, ` +
        `e o estoque final de cada item vira o "estoque anterior" do novo ciclo — exatamente como na folha em papel.`
    );
    if (!ok) return;

    const lista = listaAchatada(estado.personalizados, estado.catalogoOficial);
    const novoItens = {};
    lista.forEach((it) => {
      const atual = Calc.garantirItem(estado.itens, it.id);
      let ultimoEstoque = atual.estoqueAnterior;
      for (let i = 5; i >= 0; i--) {
        if (atual.periodos[i] && atual.periodos[i].estoque != null) {
          ultimoEstoque = atual.periodos[i].estoque;
          break;
        }
      }
      novoItens[it.id] = { estoqueAnterior: ultimoEstoque, periodos: Calc.periodosVazios() };
    });

    if (Sync.pronto) {
      await Sync.arquivarCiclo(estado.codigo, {
        cicloInicio: estado.cicloInicio,
        anoServico: estado.anoServico,
        itens: estado.itens,
      });
    }

    estado.cicloInicio = novoCiclo;
    estado.itens = novoItens;
    mesAtivo = 0;

    if (Sync.pronto) {
      await Sync.salvarTudo(estado.codigo, estado);
    }

    montarSeletorMes();
    atualizarCabecalho();
    construirListaItens();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
    toast("Novo ciclo iniciado. Ciclo anterior arquivado.");
  }

  /* ============================================================ */
  /* Busca                                                          */
  /* ============================================================ */
  $("#input-busca").addEventListener("input", (ev) => {
    termoBusca = normalizarTexto(ev.target.value);
    aplicarFiltroBusca();
  });

  function aplicarFiltroBusca() {
    const categorias = $$(".categoria");
    categorias.forEach((cat) => {
      let algumVisivel = false;
      cat.querySelectorAll(".item-cartao").forEach((cartao) => {
        const combina = !termoBusca || cartao.dataset.busca.includes(termoBusca);
        cartao.classList.toggle("sem-resultado", !combina);
        if (combina) algumVisivel = true;
      });
      if (termoBusca) cat.classList.toggle("aberta", algumVisivel);
      cat.style.display = algumVisivel || !termoBusca ? "" : "none";
    });
  }

  /* ============================================================ */
  /* Abas                                                           */
  /* ============================================================ */
  $$(".aba").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".aba").forEach((b) => b.classList.remove("ativa"));
      btn.classList.add("ativa");
      abaAtiva = btn.dataset.aba;
      $("#barra-lancamento").style.display = abaAtiva === "lancamento" ? "" : "none";
      $("#conteudo-lancamento").hidden = abaAtiva !== "lancamento";
      $("#conteudo-visaogeral").hidden = abaAtiva !== "visaogeral";
      if (abaAtiva === "visaogeral") renderizarVisaoGeral();
    });
  });

  /* ============================================================ */
  /* Visão geral (tabela completa, somente leitura)                */
  /* ============================================================ */
  function renderizarVisaoGeral() {
    const meses = CICLOS[estado.cicloInicio];
    $("#vg-ciclo-label").textContent = `${meses[0]} a ${meses[5]} · ${estado.anoServico}`;
    $("#vg-info").textContent = "Saída calculada automaticamente = estoque anterior + recebido − estoque contado.";

    let thead = "<thead><tr><th class=\"nome-item\">Item</th><th>Est.<br/>anterior</th>";
    meses.forEach((m) => (thead += `<th colspan="3">${m}</th>`));
    thead += "</tr><tr><th class=\"nome-item\"></th><th></th>";
    meses.forEach(() => (thead += "<th>Receb.</th><th>Estoque</th><th>Saída</th>"));
    thead += "</tr></thead>";

    let tbody = "<tbody>";
    catalogoAtual().forEach((cat) => {
      const totalCols = 2 + meses.length * 3;
      // Evita "colspan" na célula fixa à esquerda: alguns navegadores não
      // conseguem manter "position: sticky" funcionando numa célula que
      // também usa colspan, então a linha da categoria é montada com uma
      // célula "nome-item" normal (fixa, igual às demais linhas) seguida de
      // células vazias que só preenchem a cor de fundo até o fim da linha.
      tbody += `<tr class="linha-categoria"><td class="nome-item">${cat.categoria}</td>${"<td></td>".repeat(totalCols - 1)}</tr>`;
      cat.itens.forEach((it) => {
        const id = it.personalizado ? it.id : idItem(it.sigla);
        const itemState = Calc.garantirItem(estado.itens, id);
        tbody += `<tr><td class="nome-item" title="${it.titulo}">${it.titulo}${it.kit ? " *" : ""}${it.personalizado ? " (extra)" : ""}</td>`;
        tbody += `<td>${itemState.estoqueAnterior ?? ""}</td>`;
        for (let i = 0; i < meses.length; i++) {
          const p = itemState.periodos[i] || {};
          const s = Calc.saida(itemState, i);
          tbody += `<td>${p.recebido ?? ""}</td><td>${p.estoque ?? ""}</td>`;
          tbody += `<td class="col-saida ${s != null && s < 0 ? "negativo" : ""}">${s ?? ""}</td>`;
        }
        tbody += "</tr>";
      });
    });
    tbody += "</tbody>";

    $("#tabela-visaogeral").innerHTML = thead + tbody;
  }

  /* ============================================================ */
  /* Exportar PDF                                                   */
  /* ============================================================ */
  $("#btn-exportar").addEventListener("click", () => {
    try {
      Exportar.gerarPDF(estado);
      toast("PDF gerado e baixado.");
    } catch (err) {
      console.error(err);
      toast("Não foi possível gerar o PDF agora.");
    }
  });

  /* ============================================================ */
  /* Configurações                                                  */
  /* ============================================================ */
  $("#btn-config").addEventListener("click", () => {
    $("#cfg-codigo").value = estado.codigo;
    $("#cfg-nome").value = estado.nome;
    $("#cfg-ano").value = estado.anoServico;
    $("#modal-config").hidden = false;
  });
  $("#fechar-config").addEventListener("click", () => ($("#modal-config").hidden = true));
  $("#modal-config").addEventListener("click", (ev) => {
    if (ev.target.id === "modal-config") $("#modal-config").hidden = true;
  });

  $("#cfg-copiar").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(estado.codigo);
      toast("Código copiado.");
    } catch {
      toast("Não foi possível copiar automaticamente.");
    }
  });

  $("#cfg-salvar").addEventListener("click", async () => {
    estado.nome = $("#cfg-nome").value.trim() || estado.nome;
    estado.anoServico = $("#cfg-ano").value.trim() || estado.anoServico;
    await Sync.salvarConfig(estado.codigo, { nome: estado.nome, anoServico: estado.anoServico });
    atualizarCabecalho();
    $("#modal-config").hidden = true;
    toast("Configurações salvas.");
  });

  $("#cfg-trocar").addEventListener("click", () => {
    if (!confirm("Sair desta congregação neste dispositivo? Você poderá entrar novamente com o código.")) return;
    localStorage.removeItem(LS_CODIGO);
    location.reload();
  });

  $("#cfg-sair-conta").addEventListener("click", async () => {
    if (!confirm("Sair da sua conta neste dispositivo?")) return;
    saindoDeContaManualmente = true;
    if (pararDeOuvir) pararDeOuvir();
    await Sync.sairDaConta();
    // Mantém o código da congregação salvo (só o login é encerrado) — ao entrar
    // de novo com uma conta, este dispositivo volta direto para a mesma
    // congregação. Quem quiser trocar de congregação usa "Sair / trocar de
    // congregação" acima, que é quem limpa o código.
    location.reload();
  });

  /* ============================================================ */
  /* Publicações personalizadas (adicionar / remover)              */
  /* ============================================================ */
  function abrirModalItem(categoriaPreSelecionada) {
    const sel = $("#item-categoria");
    sel.innerHTML = CATALOGO.map((c) => `<option value="${c.categoria}">${c.categoria}</option>`).join("");
    if (categoriaPreSelecionada) sel.value = categoriaPreSelecionada;
    $("#item-titulo").value = "";
    $("#item-sigla").value = "";
    $("#modal-item").hidden = false;
    setTimeout(() => $("#item-titulo").focus(), 50);
  }
  $("#fechar-item").addEventListener("click", () => ($("#modal-item").hidden = true));
  $("#modal-item").addEventListener("click", (ev) => {
    if (ev.target.id === "modal-item") $("#modal-item").hidden = true;
  });

  $("#form-item").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const titulo = $("#item-titulo").value.trim();
    if (!titulo) return;
    const categoria = $("#item-categoria").value;
    const sigla = $("#item-sigla").value.trim();

    const novo = { id: novoIdPersonalizado(), titulo, categoria, sigla: sigla || "extra", codigo: "", kit: false };
    estado.personalizados.push(novo);
    await Sync.salvarPersonalizados(estado.codigo, estado.personalizados);
    construirListaItens();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
    $("#modal-item").hidden = true;
    toast(`"${titulo}" adicionado em ${categoria}.`);
  });

  async function removerItemPersonalizado(id) {
    const item = estado.personalizados.find((p) => p.id === id);
    if (!item) return;
    if (!confirm(`Remover "${item.titulo}" da lista? O catálogo oficial do S-28-T não é afetado.`)) return;
    estado.personalizados = estado.personalizados.filter((p) => p.id !== id);
    await Sync.salvarPersonalizados(estado.codigo, estado.personalizados);
    construirListaItens();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
    toast("Publicação removida.");
  }

  /* ============================================================ */
  /* Importar / exportar / restaurar publicações extras (CSV)      */
  /* ============================================================ */
  $("#cfg-abrir-importar").addEventListener("click", () => {
    $("#modal-config").hidden = true;
    $("#modal-importar").hidden = false;
  });
  $("#fechar-importar").addEventListener("click", () => ($("#modal-importar").hidden = true));
  $("#modal-importar").addEventListener("click", (ev) => {
    if (ev.target.id === "modal-importar") $("#modal-importar").hidden = true;
  });

  function escaparCSV(v) {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function paraCSV(linhas) {
    const corpo = linhas.map((l) =>
      [l.categoria, l.titulo, l.sigla, l.codigo, l.kit ? "1" : "0"].map(escaparCSV).join(",")
    );
    return ["categoria,titulo,sigla,codigo,kit", ...corpo].join("\n");
  }

  function baixarArquivo(nome, conteudo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  $("#btn-exportar-csv").addEventListener("click", () => {
    const csv = paraCSV(estado.personalizados);
    baixarArquivo(`publicacoes-extras-${estado.codigo || "app"}.csv`, csv, "text/csv;charset=utf-8");
  });

  // Parser simples de CSV, com suporte a valores entre aspas (vírgulas/aspas internas)
  function parseLinhaCSV(linha) {
    const campos = [];
    let atual = "";
    let dentroAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (dentroAspas) {
        if (c === '"' && linha[i + 1] === '"') {
          atual += '"';
          i++;
        } else if (c === '"') {
          dentroAspas = false;
        } else {
          atual += c;
        }
      } else if (c === '"') {
        dentroAspas = true;
      } else if (c === ",") {
        campos.push(atual);
        atual = "";
      } else {
        atual += c;
      }
    }
    campos.push(atual);
    return campos;
  }

  function parseCSV(texto) {
    const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (linhas.length < 2) return [];
    const cabecalho = parseLinhaCSV(linhas[0]).map((h) => h.trim().toLowerCase());
    const idx = {
      categoria: cabecalho.indexOf("categoria"),
      titulo: cabecalho.indexOf("titulo"),
      sigla: cabecalho.indexOf("sigla"),
      codigo: cabecalho.indexOf("codigo"),
      kit: cabecalho.indexOf("kit"),
    };
    const categoriasValidas = new Set(CATALOGO.map((c) => c.categoria));
    const resultado = [];
    for (let i = 1; i < linhas.length; i++) {
      const campos = parseLinhaCSV(linhas[i]);
      const titulo = (campos[idx.titulo] ?? "").trim();
      if (!titulo) continue;
      let categoria = (campos[idx.categoria] ?? "").trim();
      if (!categoriasValidas.has(categoria)) categoria = CATALOGO[0].categoria;
      resultado.push({
        id: novoIdPersonalizado(),
        titulo,
        categoria,
        sigla: (campos[idx.sigla] ?? "").trim(),
        codigo: (campos[idx.codigo] ?? "").trim(),
        kit: /^(1|true|sim|x)$/i.test((campos[idx.kit] ?? "").trim()),
      });
    }
    return resultado;
  }

  $("#btn-importar-csv").addEventListener("click", async () => {
    const arquivo = $("#input-importar-csv").files[0];
    if (!arquivo) {
      toast("Escolha um arquivo .csv primeiro.");
      return;
    }
    let importados;
    try {
      const texto = await arquivo.text();
      importados = parseCSV(texto);
    } catch (err) {
      console.error(err);
      toast("Não consegui ler esse arquivo.");
      return;
    }
    if (!importados.length) {
      toast("Não encontrei publicações válidas nesse arquivo.");
      return;
    }

    const modo = $("#modo-importar").value;
    estado.personalizados = modo === "substituir" ? importados : [...estado.personalizados, ...importados];

    await Sync.salvarPersonalizados(estado.codigo, estado.personalizados);
    construirListaItens();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
    $("#input-importar-csv").value = "";
    toast(`${importados.length} publicação(ões) importada(s).`);
  });

  $("#btn-restaurar-catalogo").addEventListener("click", async () => {
    if (!estado.personalizados.length) {
      toast("Não há publicações extras cadastradas.");
      return;
    }
    if (!confirm("Remover todas as publicações extras cadastradas? O catálogo oficial do S-28-T não é afetado.")) return;
    estado.personalizados = [];
    await Sync.salvarPersonalizados(estado.codigo, estado.personalizados);
    construirListaItens();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
    toast("Publicações extras removidas.");
  });

  /* ============================================================ */
  /* Atualizar catálogo oficial (nova revisão do S-28-T)           */
  /* ============================================================ */
  // Mesmo formato de CSV usado para publicações extras, mas aqui vale para
  // qualquer categoria (não só as já conhecidas) e a sigla é obrigatória —
  // é ela que decide quais itens são "os mesmos" na revisão nova.
  function parseCSVCatalogoOficial(texto) {
    const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (linhas.length < 2) return { itens: [], semSigla: 0 };
    const cabecalho = parseLinhaCSV(linhas[0]).map((h) => h.trim().toLowerCase());
    const idx = {
      categoria: cabecalho.indexOf("categoria"),
      titulo: cabecalho.indexOf("titulo"),
      sigla: cabecalho.indexOf("sigla"),
      codigo: cabecalho.indexOf("codigo"),
      kit: cabecalho.indexOf("kit"),
    };
    const itens = [];
    let semSigla = 0;
    for (let i = 1; i < linhas.length; i++) {
      const campos = parseLinhaCSV(linhas[i]);
      const titulo = (campos[idx.titulo] ?? "").trim();
      const sigla = (campos[idx.sigla] ?? "").trim();
      if (!titulo) continue;
      if (!sigla) {
        semSigla++;
        continue; // sem sigla não dá pra casar com os dados já lançados com segurança
      }
      itens.push({
        titulo,
        categoria: (campos[idx.categoria] ?? "").trim() || "Outros",
        sigla,
        codigo: (campos[idx.codigo] ?? "").trim(),
        kit: /^(1|true|sim|x)$/i.test((campos[idx.kit] ?? "").trim()),
      });
    }
    return { itens, semSigla };
  }

  function atualizarVisibilidadeRestaurarCatalogo() {
    $("#btn-restaurar-catalogo-oficial").hidden = !estado.catalogoOficial;
  }

  $("#btn-importar-catalogo").addEventListener("click", async () => {
    const arquivo = $("#input-importar-catalogo").files[0];
    if (!arquivo) {
      toast("Escolha um arquivo .csv primeiro.");
      return;
    }
    let itens, semSigla;
    try {
      const texto = await arquivo.text();
      ({ itens, semSigla } = parseCSVCatalogoOficial(texto));
    } catch (err) {
      console.error(err);
      toast("Não consegui ler esse arquivo.");
      return;
    }
    if (!itens.length) {
      toast("Não encontrei publicações válidas (com sigla) nesse arquivo.");
      return;
    }

    const idsAtuais = new Set(listaAchatada(estado.personalizados, estado.catalogoOficial).filter((it) => !it.personalizado).map((it) => it.id));
    const idsNovos = new Set(itens.map((it) => idItem(it.sigla)));
    let mantidos = 0;
    idsNovos.forEach((id) => { if (idsAtuais.has(id)) mantidos++; });
    const novosItens = idsNovos.size - mantidos;
    let removidos = 0;
    idsAtuais.forEach((id) => { if (!idsNovos.has(id)) removidos++; });

    const aviso =
      `Atualizar o catálogo oficial com ${itens.length} publicação(ões)?\n\n` +
      `${mantidos} continuam as mesmas (os dados já lançados aparecem automaticamente).\n` +
      `${novosItens} são novas (começam sem histórico).\n` +
      (removidos ? `${removidos} saem da lista ativa (os dados já lançados ficam guardados, nada é apagado).\n` : "") +
      (semSigla ? `\n${semSigla} linha(s) do arquivo foram ignoradas por não terem sigla.` : "");
    if (!confirm(aviso)) return;

    const novoCatalogoOficial = agruparPorCategoria(itens, estado.catalogoOficial || CATALOGO);
    estado.catalogoOficial = novoCatalogoOficial;
    await Sync.salvarCatalogoOficial(estado.codigo, novoCatalogoOficial);
    construirListaItens();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
    atualizarVisibilidadeRestaurarCatalogo();
    $("#input-importar-catalogo").value = "";
    toast("Catálogo oficial atualizado.");
  });

  $("#btn-restaurar-catalogo-oficial").addEventListener("click", async () => {
    if (!confirm("Voltar para o catálogo oficial padrão do app? A lista importada deixa de valer (os dados já lançados continuam guardados).")) return;
    estado.catalogoOficial = null;
    await Sync.salvarCatalogoOficial(estado.codigo, null);
    construirListaItens();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
    atualizarVisibilidadeRestaurarCatalogo();
    toast("Catálogo oficial padrão restaurado.");
  });

  /* ============================================================ */
  /* Instalação do PWA                                             */
  /* ============================================================ */
  let promptInstalacao = null;
  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    promptInstalacao = ev;
    $("#btn-instalar").hidden = false;
  });
  $("#btn-instalar").addEventListener("click", async () => {
    if (!promptInstalacao) return;
    promptInstalacao.prompt();
    await promptInstalacao.userChoice;
    promptInstalacao = null;
    $("#btn-instalar").hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    $("#btn-instalar").hidden = true;
    toast("Aplicativo instalado!");
  });

  /* ============================================================ */
  /* Service worker                                                 */
  /* ============================================================ */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.warn("[Publicações] Service worker não registrado:", err);
      });
    });
  }

  /* ------------------------------------------------------------ Início */
  configurarEventosContainer();
  iniciarApp();
})();
