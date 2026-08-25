/* ==========================================================================
   Sincronização com o Firebase (Firestore) — tempo real, multi-dispositivo
   ==========================================================================
   Estrutura no Firestore:
     congregacoes/{codigo} = {
       nome: string,
       cicloInicio: "setembro" | "marco",
       anoServico: string,
       itens: {
         [itemId]: { estoqueAnterior: number, periodos: [ {recebido, estoque}, x6 ] }
       },
       atualizadoEm: timestamp
     }
   ========================================================================== */

const Sync = (() => {
  let db = null;
  let auth = null;
  let pronto = false;
  let prontoPromise = null;

  function normalizarCodigo(txt) {
    return String(txt || "")
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_.]/g, "")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .slice(0, 80);
  }

  function periodosVazios() {
    return Array.from({ length: 6 }, () => ({ recebido: null, estoque: null }));
  }

  /* ------------------------------------------------------------------------
     Modo local (fallback): usado sempre que js/firebase-config.js ainda não
     foi preenchido, ou quando o dispositivo está sem internet e nunca chegou
     a se conectar. Guarda os dados no navegador para que nada se perca —
     mas, sem Firebase, cada dispositivo só vê os próprios dados.
     ------------------------------------------------------------------------ */
  function chaveLocal(cod) {
    return "pub_local_" + cod;
  }
  function lerLocal(cod) {
    try {
      const bruto = localStorage.getItem(chaveLocal(cod));
      return bruto ? JSON.parse(bruto) : null;
    } catch {
      return null;
    }
  }
  function gravarLocal(cod, dados) {
    try {
      localStorage.setItem(chaveLocal(cod), JSON.stringify(dados));
    } catch (err) {
      console.warn("[Publicações] Não foi possível gravar cache local:", err);
    }
  }

  function inicializar() {
    if (prontoPromise) return prontoPromise;

    prontoPromise = new Promise((resolve) => {
      const chavesPreenchidas =
        typeof FIREBASE_CONFIG !== "undefined" &&
        FIREBASE_CONFIG.apiKey &&
        !FIREBASE_CONFIG.apiKey.startsWith("COLE_AQUI");

      if (!chavesPreenchidas || typeof firebase === "undefined") {
        console.warn(
          "[Publicações] Firebase não configurado — rodando em modo local " +
            "(sem sincronização entre dispositivos). Preencha js/firebase-config.js."
        );
        pronto = false;
        resolve(false);
        return;
      }

      try {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        auth = firebase.auth();

        db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
          console.warn("[Publicações] Persistência offline indisponível:", err.code);
        });

        auth.onAuthStateChanged((user) => {
          if (!user) {
            auth.signInAnonymously().catch((err) => {
              console.error("[Publicações] Falha no login anônimo:", err);
              pronto = false;
              resolve(false);
            });
          } else {
            pronto = true;
            resolve(true);
          }
        });
      } catch (err) {
        console.error("[Publicações] Erro ao iniciar Firebase:", err);
        pronto = false;
        resolve(false);
      }
    });

    return prontoPromise;
  }

  async function buscarCongregacao(codigo) {
    await inicializar();
    const cod = normalizarCodigo(codigo);
    if (!cod) return { ok: false, motivo: "codigo-invalido" };

    if (!pronto) {
      const dados = lerLocal(cod);
      return dados ? { ok: true, existe: true, codigo: cod, dados, local: true } : { ok: true, existe: false, codigo: cod, local: true };
    }

    try {
      const doc = await db.collection("congregacoes").doc(cod).get({ source: "server" }).catch(
        () => db.collection("congregacoes").doc(cod).get()
      );
      if (doc.exists) return { ok: true, existe: true, codigo: cod, dados: doc.data() };
      return { ok: true, existe: false, codigo: cod };
    } catch (err) {
      console.error(err);
      return { ok: false, motivo: "erro", erro: err };
    }
  }

  async function criarCongregacao(codigo, { nome, cicloInicio, anoServico }) {
    await inicializar();
    const cod = normalizarCodigo(codigo);
    const dados = {
      nome: nome || cod,
      cicloInicio: cicloInicio || "setembro",
      anoServico: anoServico || String(new Date().getFullYear()),
      itens: {},
      personalizados: [],
      atualizadoEm: pronto ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
    };
    if (pronto) {
      await db.collection("congregacoes").doc(cod).set(dados, { merge: true });
    } else {
      gravarLocal(cod, dados);
    }
    return { codigo: cod, dados };
  }

  async function salvarConfig(codigo, { nome, cicloInicio, anoServico }) {
    const cod = normalizarCodigo(codigo);
    if (!pronto) {
      const atual = lerLocal(cod) || {};
      if (nome !== undefined) atual.nome = nome;
      if (cicloInicio !== undefined) atual.cicloInicio = cicloInicio;
      if (anoServico !== undefined) atual.anoServico = anoServico;
      gravarLocal(cod, atual);
      return;
    }
    const patch = { atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() };
    if (nome !== undefined) patch.nome = nome;
    if (cicloInicio !== undefined) patch.cicloInicio = cicloInicio;
    if (anoServico !== undefined) patch.anoServico = anoServico;
    await db.collection("congregacoes").doc(cod).set(patch, { merge: true });
  }

  let escritasPendentes = 0;
  function salvarItem(codigo, itemId, { estoqueAnterior, periodos }) {
    const cod = normalizarCodigo(codigo);
    if (!pronto) {
      const atual = lerLocal(cod) || { itens: {} };
      atual.itens = atual.itens || {};
      atual.itens[itemId] = { estoqueAnterior, periodos };
      gravarLocal(cod, atual);
      UI_Status && UI_Status("local");
      return Promise.resolve();
    }
    const patch = {
      [`itens.${itemId}.estoqueAnterior`]: estoqueAnterior,
      [`itens.${itemId}.periodos`]: periodos,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    };
    escritasPendentes++;
    UI_Status && UI_Status("sincronizando");
    return db
      .collection("congregacoes")
      .doc(cod)
      .set({}, { merge: true }) // garante doc existente antes do update abaixo (idempotente)
      .then(() => db.collection("congregacoes").doc(cod).update(patch))
      .catch((err) => {
        console.error("[Publicações] Falha ao salvar item:", err);
      })
      .finally(() => {
        escritasPendentes = Math.max(0, escritasPendentes - 1);
        if (escritasPendentes === 0) UI_Status && UI_Status(navigator.onLine ? "online" : "offline");
      });
  }

  async function salvarPersonalizados(codigo, lista) {
    const cod = normalizarCodigo(codigo);
    if (!pronto) {
      const atual = lerLocal(cod) || {};
      atual.personalizados = lista;
      gravarLocal(cod, atual);
      return;
    }
    await db
      .collection("congregacoes")
      .doc(cod)
      .set({ personalizados: lista, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }

  async function arquivarCiclo(codigo, snapshot) {
    const cod = normalizarCodigo(codigo);
    if (!pronto) {
      try {
        const chave = "pub_historico_" + cod;
        const lista = JSON.parse(localStorage.getItem(chave) || "[]");
        lista.push({ ...snapshot, arquivadoEm: Date.now() });
        localStorage.setItem(chave, JSON.stringify(lista.slice(-6))); // guarda os últimos 6 ciclos
      } catch (err) {
        console.warn("[Publicações] Não foi possível arquivar ciclo localmente:", err);
      }
      return;
    }
    await db.collection("congregacoes").doc(cod).collection("historico").add({
      ...snapshot,
      arquivadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async function salvarTudo(codigo, { nome, cicloInicio, anoServico, itens, personalizados }) {
    const cod = normalizarCodigo(codigo);
    const dados = {
      nome,
      cicloInicio,
      anoServico,
      itens,
      personalizados: personalizados || [],
      atualizadoEm: pronto ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
    };
    if (pronto) {
      await db.collection("congregacoes").doc(cod).set(dados);
    } else {
      gravarLocal(cod, dados);
    }
    return dados;
  }

  function ouvir(codigo, callback) {
    if (!pronto) return () => {};
    const cod = normalizarCodigo(codigo);
    return db.collection("congregacoes").doc(cod).onSnapshot(
      { includeMetadataChanges: true },
      (doc) => {
        if (!doc.exists) return;
        const origemLocal = doc.metadata.hasPendingWrites;
        callback(doc.data(), { origemLocal, doCache: doc.metadata.fromCache });
      },
      (err) => console.error("[Publicações] Erro no listener:", err)
    );
  }

  // Callback opcional que o app.js pode registrar para refletir o status na UI
  let UI_Status = null;
  function definirCallbackStatus(fn) {
    UI_Status = fn;
  }

  return {
    inicializar,
    normalizarCodigo,
    periodosVazios,
    buscarCongregacao,
    criarCongregacao,
    salvarConfig,
    salvarItem,
    salvarPersonalizados,
    arquivarCiclo,
    salvarTudo,
    ouvir,
    definirCallbackStatus,
    get pronto() {
      return pronto;
    },
  };
})();
