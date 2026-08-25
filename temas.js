/* ==========================================================================
   Temas — 10 paletas de cor + modo escuro + escala de fonte
   Preferências de exibição: guardadas só neste dispositivo (localStorage),
   cada pessoa pode usar uma cor/tema diferentes sem afetar as demais.
   ========================================================================== */

const PALETAS = [
  { id: "ambar", nome: "Âmbar", acento: "#c0561a", forte: "#8a3e13", suave: "#f6e6dd" },
  { id: "petroleo", nome: "Azul-petróleo", acento: "#1c5d8a", forte: "#12405f", suave: "#e3eef6" },
  { id: "oliva", nome: "Verde-oliva", acento: "#6b8e4e", forte: "#4f6b39", suave: "#e9f1e1" },
  { id: "bordo", nome: "Bordô", acento: "#9c3b4f", forte: "#7a2c3c", suave: "#f5e3e6" },
  { id: "ameixa", nome: "Ameixa", acento: "#7452a3", forte: "#5a3d82", suave: "#ece5f6" },
  { id: "turquesa", nome: "Turquesa", acento: "#1f8a8c", forte: "#146668", suave: "#dff2f2" },
  { id: "dourado", nome: "Dourado", acento: "#ab8a2e", forte: "#8a6e1f", suave: "#f4edd6" },
  { id: "grafite", nome: "Grafite", acento: "#556072", forte: "#3c4553", suave: "#e6e9ed" },
  { id: "terracota", nome: "Terracota", acento: "#c1552e", forte: "#963f20", suave: "#f5e1d5" },
  { id: "rosa-antigo", nome: "Rosa-antigo", acento: "#b06478", forte: "#8a4d5e", suave: "#f5e4e8" },
];

const Temas = (() => {
  const LS_PALETA = "pub_paleta";
  const LS_TEMA_ESCURO = "pub_tema_escuro";
  const LS_ESCALA = "pub_escala_fonte";

  const ESCALA_MIN = 0.85;
  const ESCALA_MAX = 1.3;
  const ESCALA_PASSO = 0.075;

  function paletaPorId(id) {
    return PALETAS.find((p) => p.id === id) || PALETAS[0];
  }

  function aplicarPaleta(id) {
    const p = paletaPorId(id);
    const raiz = document.documentElement.style;
    raiz.setProperty("--acento", p.acento);
    raiz.setProperty("--acento-forte", p.forte);
    raiz.setProperty("--acento-suave", p.suave);
    localStorage.setItem(LS_PALETA, p.id);
    document.querySelectorAll(".opcao-paleta").forEach((el) => {
      el.classList.toggle("selecionada", el.dataset.paleta === p.id);
    });
    const meta = document.getElementById("meta-theme-color");
    if (meta) meta.setAttribute("content", p.forte);
  }

  function paletaAtual() {
    return localStorage.getItem(LS_PALETA) || "ambar";
  }

  function aplicarTemaEscuro(escuro) {
    document.documentElement.setAttribute("data-tema", escuro ? "escuro" : "claro");
    localStorage.setItem(LS_TEMA_ESCURO, escuro ? "1" : "0");
    const btn = document.getElementById("btn-tema");
    if (btn) btn.setAttribute("aria-pressed", String(escuro));
    const iconeLua = document.getElementById("icone-tema-lua");
    const iconeSol = document.getElementById("icone-tema-sol");
    if (iconeLua && iconeSol) {
      iconeLua.hidden = escuro;
      iconeSol.hidden = !escuro;
    }
    const checkbox = document.getElementById("chk-tema-escuro");
    if (checkbox) checkbox.checked = escuro;
  }

  function temaEscuroAtual() {
    return localStorage.getItem(LS_TEMA_ESCURO) === "1";
  }

  function aplicarEscala(valor) {
    const v = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, valor));
    document.documentElement.style.setProperty("--escala", v.toFixed(3));
    localStorage.setItem(LS_ESCALA, v.toFixed(3));
    const rotulo = document.getElementById("rotulo-escala");
    if (rotulo) rotulo.textContent = Math.round((v / 1) * 100) + "%";
    return v;
  }

  function escalaAtual() {
    const salvo = parseFloat(localStorage.getItem(LS_ESCALA));
    return Number.isFinite(salvo) ? salvo : 1;
  }

  function aumentarEscala() {
    return aplicarEscala(escalaAtual() + ESCALA_PASSO);
  }
  function diminuirEscala() {
    return aplicarEscala(escalaAtual() - ESCALA_PASSO);
  }

  function iniciar() {
    aplicarPaleta(paletaAtual());
    aplicarTemaEscuro(temaEscuroAtual());
    aplicarEscala(escalaAtual());
  }

  function montarSeletorPaletas(container) {
    container.innerHTML = PALETAS.map(
      (p) =>
        `<button type="button" class="opcao-paleta" data-paleta="${p.id}" style="background:${p.acento}" title="${p.nome}" aria-label="${p.nome}"></button>`
    ).join("");
    container.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".opcao-paleta");
      if (!btn) return;
      aplicarPaleta(btn.dataset.paleta);
    });
    aplicarPaleta(paletaAtual());
  }

  return {
    PALETAS,
    iniciar,
    aplicarPaleta,
    paletaAtual,
    aplicarTemaEscuro,
    temaEscuroAtual,
    aplicarEscala,
    escalaAtual,
    aumentarEscala,
    diminuirEscala,
    montarSeletorPaletas,
  };
})();
