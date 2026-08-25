/* ==========================================================================
   Catálogo de publicações — extraído do formulário S-28-T (3/26)
   Cada item: { codigo, sigla, titulo, kit (boolean = faz parte do Kit de Ensino) }
   ========================================================================== */

const CATALOGO = [
  {
    categoria: "Bíblias",
    icone: "book-open",
    itens: [
      { codigo: "5140", sigla: "nwt", titulo: "Tradução do Novo Mundo", kit: false },
      { codigo: "5142", sigla: "nwtpk", titulo: "Tradução do Novo Mundo (tamanho pequeno)", kit: false },
      { codigo: "", sigla: "outras-biblias", titulo: "Outras Bíblias", kit: false, generico: true },
    ],
  },
  {
    categoria: "Livros",
    icone: "book",
    itens: [
      { codigo: "5414", sigla: "be", titulo: "Beneficie-se", kit: false },
      { codigo: "5340", sigla: "bhs", titulo: "Entenda a Bíblia", kit: false },
      { codigo: "5416", sigla: "bt", titulo: "Testemunho Cabal", kit: false },
      { codigo: "5231", sigla: "cf", titulo: "'Meu Seguidor'", kit: false },
      { codigo: "5331", sigla: "cl", titulo: "Achegue-se", kit: false },
      { codigo: "5419", sigla: "ia", titulo: "Imite a Fé", kit: false },
      { codigo: "5425", sigla: "jy", titulo: "Jesus — O Caminho", kit: false },
      { codigo: "5422", sigla: "kr", titulo: "O Reino de Deus já Governa!", kit: false },
      { codigo: "5427", sigla: "lfb", titulo: "Histórias da Bíblia", kit: false },
      { codigo: "5445", sigla: "lff", titulo: "Seja Feliz para Sempre! (livro)", kit: true },
      { codigo: "5415", sigla: "lr", titulo: "Instrutor", kit: false },
      { codigo: "5343", sigla: "lvs", titulo: "Continue", kit: false },
      { codigo: "5332", sigla: "od", titulo: "Organizados", kit: false },
      { codigo: "5435", sigla: "rr", titulo: "Adoração Pura", kit: false },
      { codigo: "5440", sigla: "scl", titulo: "Princípios Bíblicos para a Vida Cristã", kit: false },
      { codigo: "5341", sigla: "sjj", titulo: "Cante de Coração", kit: false },
      { codigo: "5441", sigla: "sjjls", titulo: "Cante de Coração (tamanho grande)", kit: false },
      { codigo: "5442", sigla: "sjjyls", titulo: "Cante de Coração — Apenas Letras", kit: false },
      { codigo: "5446", sigla: "wcg", titulo: "Coragem", kit: false },
      { codigo: "5339", sigla: "yp1", titulo: "Jovens Perguntam, Volume 1", kit: false },
      { codigo: "5336", sigla: "yp2", titulo: "Jovens Perguntam, Volume 2", kit: false },
      { codigo: "", sigla: "outros-livros", titulo: "Outros livros", kit: false, generico: true },
    ],
  },
  {
    categoria: "Brochuras e Livretos",
    icone: "booklet",
    itens: [
      { codigo: "6618", sigla: "ay", titulo: "Leitura e Escrita", kit: false },
      { codigo: "6659", sigla: "fg", titulo: "Boas Notícias", kit: false },
      { codigo: "6665", sigla: "hf", titulo: "Família", kit: false },
      { codigo: "6662", sigla: "hl", titulo: "Vida Feliz", kit: false },
      { codigo: "6647", sigla: "la", titulo: "Vida Satisfatória", kit: false },
      { codigo: "6654", sigla: "lc", titulo: "A Vida — Teve um Criador?", kit: false },
      { codigo: "6658", sigla: "ld", titulo: "Escute a Deus", kit: false },
      { codigo: "6655", sigla: "lf", titulo: "Origem da Vida", kit: false },
      { codigo: "65445", sigla: "lffi", titulo: "Seja Feliz para Sempre! (brochura)", kit: true },
      { codigo: "6657", sigla: "ll", titulo: "Escute e Viva", kit: true },
      { codigo: "6669", sigla: "lmd", titulo: "Ame as Pessoas", kit: false },
      { codigo: "6663", sigla: "mb", titulo: "Minhas Lições da Bíblia", kit: false },
      { codigo: "6648", sigla: "ol", titulo: "Caminho para a Vida", kit: false },
      { codigo: "6639", sigla: "pc", titulo: "Verdadeira Paz e Felicidade", kit: false },
      { codigo: "6653", sigla: "ph", titulo: "Caminho", kit: false },
      { codigo: "6671", sigla: "rj", titulo: "Volte para Jeová", kit: false },
      { codigo: "6656", sigla: "rk", titulo: "Verdadeira Fé", kit: false },
      { codigo: "6630", sigla: "sp", titulo: "Espíritos dos Mortos", kit: false },
      { codigo: "6667", sigla: "th", titulo: "Melhore", kit: false },
      { codigo: "6670", sigla: "wfg", titulo: "Aprenda com a Sabedoria de Jesus", kit: false },
      { codigo: "6684", sigla: "ypq", titulo: "10 Perguntas", kit: false },
      { codigo: "", sigla: "outras-brochuras", titulo: "Outras brochuras e livretos", kit: false, generico: true },
    ],
  },
  {
    categoria: "Folhetos e Convites",
    icone: "flyer",
    itens: [
      { codigo: "7305", sigla: "inv", titulo: "Convite para reuniões cristãs", kit: true },
      { codigo: "7130", sigla: "T-30", titulo: "O Que Você Acha da Bíblia?", kit: true },
      { codigo: "7131", sigla: "T-31", titulo: "O Que Você Espera do Futuro?", kit: true },
      { codigo: "7132", sigla: "T-32", titulo: "Segredo para Família Feliz", kit: true },
      { codigo: "7133", sigla: "T-33", titulo: "Quem Controla o Mundo?", kit: true },
      { codigo: "7134", sigla: "T-34", titulo: "O Sofrimento Vai Acabar?", kit: true },
      { codigo: "7135", sigla: "T-35", titulo: "Voltar a Viver", kit: true },
      { codigo: "7136", sigla: "T-36", titulo: "Reino", kit: true },
      { codigo: "7137", sigla: "T-37", titulo: "Respostas Importantes", kit: true },
      { codigo: "", sigla: "outros-folhetos", titulo: "Outros folhetos e convites", kit: false, generico: true },
    ],
  },
  {
    categoria: "Cartões de Visita",
    icone: "card",
    itens: [
      { codigo: "8410", sigla: "jwcd1", titulo: "Cartão de visita (imagem da Bíblia aberta)", kit: true },
      { codigo: "8524", sigla: "jwcd4", titulo: "Cartão de visita (apenas o logo do jw.org)", kit: true },
      { codigo: "8569", sigla: "jwcd9", titulo: "Cartão de visita (curso bíblico presencial)", kit: true },
      { codigo: "8570", sigla: "jwcd10", titulo: "Cartão de visita (curso bíblico pela internet)", kit: true },
      { codigo: "", sigla: "outros-cartoes", titulo: "Outros cartões de visita", kit: false, generico: true },
    ],
  },
  {
    categoria: "Revistas para o Público",
    icone: "magazine",
    itens: [
      { codigo: "", sigla: "g18.1", titulo: "Despertai! N.º 1 2018", kit: true },
      { codigo: "", sigla: "g18.2", titulo: "Despertai! N.º 2 2018", kit: true },
      { codigo: "", sigla: "g18.3", titulo: "Despertai! N.º 3 2018", kit: true },
      { codigo: "", sigla: "g19.1", titulo: "Despertai! N.º 1 2019", kit: true },
      { codigo: "", sigla: "g19.2", titulo: "Despertai! N.º 2 2019", kit: true },
      { codigo: "", sigla: "g19.3", titulo: "Despertai! N.º 3 2019", kit: true },
      { codigo: "", sigla: "g20.1", titulo: "Despertai! N.º 1 2020", kit: true },
      { codigo: "", sigla: "g20.2", titulo: "Despertai! N.º 2 2020", kit: true },
      { codigo: "", sigla: "g20.3", titulo: "Despertai! N.º 3 2020", kit: true },
      { codigo: "", sigla: "g21.1", titulo: "Despertai! N.º 1 2021", kit: true },
      { codigo: "", sigla: "g21.2", titulo: "Despertai! N.º 2 2021", kit: true },
      { codigo: "", sigla: "g21.3", titulo: "Despertai! N.º 3 2021", kit: true },
      { codigo: "", sigla: "g22.1", titulo: "Despertai! N.º 1 2022", kit: true },
      { codigo: "", sigla: "g23.1", titulo: "Despertai! N.º 1 2023", kit: true },
      { codigo: "", sigla: "g24.1", titulo: "Despertai! N.º 1 2024", kit: true },
      { codigo: "", sigla: "g25.1", titulo: "Despertai! N.º 1 2025", kit: true },
      { codigo: "", sigla: "wp18.1", titulo: "Sentinela N.º 1 2018", kit: true },
      { codigo: "", sigla: "wp18.2", titulo: "Sentinela N.º 2 2018", kit: true },
      { codigo: "", sigla: "wp18.3", titulo: "Sentinela N.º 3 2018", kit: true },
      { codigo: "", sigla: "wp19.1", titulo: "Sentinela N.º 1 2019", kit: true },
      { codigo: "", sigla: "wp19.2", titulo: "Sentinela N.º 2 2019", kit: true },
      { codigo: "", sigla: "wp19.3", titulo: "Sentinela N.º 3 2019", kit: true },
      { codigo: "", sigla: "wp20.1", titulo: "Sentinela N.º 1 2020", kit: true },
      { codigo: "", sigla: "wp20.2", titulo: "Sentinela N.º 2 2020", kit: true },
      { codigo: "", sigla: "wp20.3", titulo: "Sentinela N.º 3 2020", kit: true },
      { codigo: "", sigla: "wp21.1", titulo: "Sentinela N.º 1 2021", kit: true },
      { codigo: "", sigla: "wp21.2", titulo: "Sentinela N.º 2 2021", kit: true },
      { codigo: "", sigla: "wp21.3", titulo: "Sentinela N.º 3 2021", kit: true },
      { codigo: "", sigla: "wp22.1", titulo: "Sentinela N.º 1 2022", kit: true },
      { codigo: "", sigla: "wp23.1", titulo: "Sentinela N.º 1 2023", kit: true },
      { codigo: "", sigla: "wp24.1", titulo: "Sentinela N.º 1 2024", kit: true },
      { codigo: "", sigla: "wp25.1", titulo: "Sentinela N.º 1 2025", kit: true },
      { codigo: "", sigla: "outras-revistas", titulo: "Todas as outras revistas para o público", kit: false, generico: true },
    ],
  },
];

/* Meses do ciclo de serviço (ano de serviço das congregações: setembro a agosto).
   O formulário original é usado em duas metades do ano de serviço:
   1ª metade: set, out, nov, dez, jan, fev
   2ª metade: mar, abr, mai, jun, jul, ago
   Cada "posição" de coluna do formulário atende às duas metades (por isso os
   cabeçalhos duplos "set./mar.", "out./abr." etc.) */
const CICLOS = {
  setembro: ["Setembro", "Outubro", "Novembro", "Dezembro", "Janeiro", "Fevereiro"],
  marco: ["Março", "Abril", "Maio", "Junho", "Julho", "Agosto"],
};

// Gera um id único e estável para cada item do catálogo
function idItem(sigla) {
  return "item_" + sigla.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

// Catálogo completo = catálogo oficial do S-28-T + publicações personalizadas
// que a congregação tiver adicionado, já agrupadas dentro da categoria certa.
// `itensPersonalizados` é um array de { id, titulo, sigla, codigo, categoria, kit }.
// `catalogoOficialCustom`, se vier preenchido (array no mesmo formato de
// CATALOGO), substitui o catálogo oficial embutido no código — é o que
// acontece depois que a congregação importa uma revisão nova do formulário
// (ver "Atualizar catálogo oficial" nas configurações). Continua usando o
// mesmo id (derivado da sigla) para cada item, então os dados já lançados
// nos itens que continuam existindo na revisão nova aparecem automaticamente.
function catalogoCompleto(itensPersonalizados, catalogoOficialCustom) {
  const personalizados = Array.isArray(itensPersonalizados) ? itensPersonalizados : [];
  const base = Array.isArray(catalogoOficialCustom) && catalogoOficialCustom.length ? catalogoOficialCustom : CATALOGO;
  return base.map((cat) => ({
    categoria: cat.categoria,
    icone: cat.icone,
    itens: [
      ...cat.itens,
      ...personalizados
        .filter((p) => p.categoria === cat.categoria)
        .map((p) => ({ ...p, personalizado: true })),
    ],
  }));
}

// Lista "achatada" de todos os itens, com id e categoria embutidos.
// Passe a lista de personalizados (e, opcionalmente, o catálogo oficial
// customizado) para incluí-los também.
function listaAchatada(itensPersonalizados, catalogoOficialCustom) {
  const lista = [];
  catalogoCompleto(itensPersonalizados, catalogoOficialCustom).forEach((cat) => {
    cat.itens.forEach((it) => {
      const id = it.personalizado ? it.id : idItem(it.sigla);
      lista.push({ ...it, id, categoria: cat.categoria });
    });
  });
  return lista;
}

// Agrupa uma lista "achatada" de itens { categoria, sigla, titulo, codigo, kit }
// (por exemplo, vinda de um CSV importado) de volta no formato de CATALOGO
// (array de categorias, cada uma com sua lista de itens), preservando a
// ordem original das categorias quando possível e mantendo categorias novas
// no fim.
function agruparPorCategoria(itensLista, categoriasBase) {
  const ordemBase = (categoriasBase && categoriasBase.length ? categoriasBase : CATALOGO).map((c) => c.categoria);
  const iconesBase = {};
  (categoriasBase && categoriasBase.length ? categoriasBase : CATALOGO).forEach((c) => (iconesBase[c.categoria] = c.icone));

  const porCategoria = new Map();
  itensLista.forEach((it) => {
    const cat = it.categoria || ordemBase[0] || "Outros";
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat).push({ codigo: it.codigo || "", sigla: it.sigla || "", titulo: it.titulo, kit: !!it.kit });
  });

  const categoriasOrdenadas = [
    ...ordemBase.filter((c) => porCategoria.has(c)),
    ...Array.from(porCategoria.keys()).filter((c) => !ordemBase.includes(c)),
  ];

  return categoriasOrdenadas.map((categoria) => ({
    categoria,
    icone: iconesBase[categoria] || "book",
    itens: porCategoria.get(categoria),
  }));
}

function novoIdPersonalizado() {
  return "custom_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

/* --------------------------------------------------------------------------
   Cálculo (compartilhado entre a tela de lançamento e a exportação em PDF)
   -------------------------------------------------------------------------- */
function periodosVaziosPadrao() {
  return Array.from({ length: 6 }, () => ({ recebido: null, estoque: null }));
}

function garantirEstadoItem(itens, id) {
  if (!itens[id]) {
    itens[id] = { estoqueAnterior: null, periodos: periodosVaziosPadrao() };
  }
  if (!Array.isArray(itens[id].periodos) || itens[id].periodos.length !== 6) {
    itens[id].periodos = periodosVaziosPadrao();
  }
  return itens[id];
}

const Calc = {
  periodosVazios: periodosVaziosPadrao,
  garantirItem: garantirEstadoItem,

  // Estoque que serve de base para o período `i` (0..5)
  estoqueAnterior(itemState, i) {
    if (!itemState) return null;
    if (i === 0) return itemState.estoqueAnterior;
    const anterior = itemState.periodos[i - 1];
    return anterior && anterior.estoque != null ? anterior.estoque : null;
  },

  // Saída = estoque anterior + recebido − estoque atual contado
  saida(itemState, i) {
    const anterior = this.estoqueAnterior(itemState, i);
    const periodo = itemState && itemState.periodos ? itemState.periodos[i] : null;
    if (anterior == null || !periodo || periodo.estoque == null) return null;
    const recebido = Number(periodo.recebido) || 0;
    return anterior + recebido - periodo.estoque;
  },
};

if (typeof module !== "undefined") {
  module.exports = { CATALOGO, CICLOS, idItem, listaAchatada, catalogoCompleto, agruparPorCategoria, novoIdPersonalizado, Calc };
}
