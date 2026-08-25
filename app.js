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
  };

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
  /* Tela de configuração inicial                                  */
  /* ============================================================ */
  let congregacaoNovaPendente = false;

  async function iniciarApp() {
    await Sync.inicializar();
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

    localStorage.setItem(LS_CODIGO, codigo);
    $("#tela-setup").hidden = true;
    $("#app").hidden = false;

    detectarMesAtualAutomaticamente();
    montarSeletorMes();
    construirListaItens();
    atualizarCabecalho();
    atualizarValoresExibidos();
    renderizarVisaoGeral();

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

    atualizarCabecalho();
    atualizarValoresExibidos();
    renderizarVisaoGeral();
  }

  /* ============================================================ */
  /* Construção da lista de categorias / itens                     */
  /* ============================================================ */
  function construirListaItens() {
    const container = $("#categorias");
    container.innerHTML = "";

    CATALOGO.forEach((cat, idx) => {
      const secao = document.createElement("div");
      secao.className = "categoria" + (idx === 0 ? " aberta" : "");
      secao.dataset.categoria = cat.categoria;

      secao.innerHTML = `
        <div class="categoria-cabecalho">
          <div class="categoria-titulo">${cat.categoria} <span class="categoria-contagem">${cat.itens.length} itens</span></div>
          <svg class="categoria-seta" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
        </div>
        <div class="categoria-itens"></div>
      `;

      const listaItens = secao.querySelector(".categoria-itens");
      cat.itens.forEach((it) => {
        const id = idItem(it.sigla);
        const cartao = document.createElement("div");
        cartao.className = "item-cartao";
        cartao.dataset.itemId = id;
        cartao.dataset.busca = normalizarTexto(`${it.titulo} ${it.sigla} ${it.codigo}`);

        cartao.innerHTML = `
          <div class="item-cabecalho">
            <div class="item-titulo">${it.titulo}${it.kit ? '<span class="item-kit" title="Kit de Ensino">*</span>' : ""}</div>
            <div class="item-meta">${it.codigo ? it.codigo + " · " : ""}${it.sigla}</div>
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

      container.appendChild(secao);
    });
  }

  // Delegação de eventos configurada uma única vez (o container é reaproveitado
  // mesmo quando as categorias são reconstruídas ao iniciar um novo ciclo).
  let eventosContainerConfigurados = false;
  function configurarEventosContainer() {
    if (eventosContainerConfigurados) return;
    eventosContainerConfigurados = true;
    const container = $("#categorias");

    container.addEventListener("click", (ev) => {
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
    const lista = listaAchatada();
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
      <div class="resumo-cartao">
        <div class="rotulo">Itens lançados</div>
        <div class="valor">${contados}/${lista.length}</div>
      </div>
      <div class="resumo-cartao">
        <div class="rotulo">Total recebido</div>
        <div class="valor">${totalRecebido}</div>
      </div>
      <div class="resumo-cartao">
        <div class="rotulo">Total de saída</div>
        <div class="valor">${totalSaida}</div>
      </div>
      <div class="resumo-cartao ${negativos ? "alerta" : ""}">
        <div class="rotulo">Contagens a revisar</div>
        <div class="valor">${negativos}</div>
      </div>
    `;
  }

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

    const lista = listaAchatada();
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
    CATALOGO.forEach((cat) => {
      const totalCols = 2 + meses.length * 3;
      tbody += `<tr class="linha-categoria"><td colspan="${totalCols}">${cat.categoria}</td></tr>`;
      cat.itens.forEach((it) => {
        const id = idItem(it.sigla);
        const itemState = Calc.garantirItem(estado.itens, id);
        tbody += `<tr><td class="nome-item" title="${it.titulo}">${it.titulo}${it.kit ? " *" : ""}</td>`;
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
