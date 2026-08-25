/* ==========================================================================
   Exportação em PDF — réplica preenchida do formulário S-28-T
   ========================================================================== */

const Exportar = (() => {
  function formatarNumero(v) {
    return v == null ? "" : String(v);
  }

  function gerarPDF(estado) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const meses = CICLOS[estado.cicloInicio] || CICLOS.setembro;
    const margem = 8;
    const larguraPagina = doc.internal.pageSize.getWidth();

    // ------------------------------------------------------------ Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(18, 64, 95);
    doc.text("Nosso Balcão Publicações — Movimento Mensal", margem, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    doc.text("Formulário S-28-T — preenchido automaticamente", margem, 18.5);

    doc.setFontSize(9);
    const infoDireita = [
      `Congregação: ${estado.nome || "—"}`,
      `Ano de serviço: ${estado.anoServico || "—"}`,
      `Ciclo: ${meses[0]} a ${meses[5]}`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ];
    doc.text(infoDireita, larguraPagina - margem, 10, { align: "right", lineHeightFactor: 1.35 });

    // ------------------------------------------------------------ Cabeçalho da tabela
    const headRow1 = [
      { content: "Item", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
      { content: "Sigla", rowSpan: 2, styles: { valign: "middle" } },
      { content: "Estoque\nanterior", rowSpan: 2, styles: { valign: "middle" } },
    ];
    meses.forEach((m) => headRow1.push({ content: m, colSpan: 3, styles: { halign: "center" } }));
    const headRow2 = [];
    meses.forEach(() => headRow2.push("Recebido", "Estoque", "Saída"));

    // ------------------------------------------------------------ Corpo da tabela
    const totalColunas = 3 + meses.length * 3;
    const body = [];

    catalogoCompleto(estado.personalizados, estado.catalogoOficial).forEach((cat) => {
      body.push([
        {
          content: cat.categoria,
          colSpan: totalColunas,
          styles: { fillColor: [232, 241, 248], textColor: [18, 64, 95], fontStyle: "bold", halign: "left" },
        },
      ]);

      cat.itens.forEach((it) => {
        const id = it.personalizado ? it.id : idItem(it.sigla);
        const itemState = Calc.garantirItem(estado.itens, id);
        const linha = [
          it.titulo + (it.kit ? " *" : "") + (it.personalizado ? " (extra)" : ""),
          it.codigo ? `${it.codigo} · ${it.sigla}` : it.sigla || "",
          { content: formatarNumero(itemState.estoqueAnterior), styles: { halign: "center" } },
        ];
        for (let i = 0; i < meses.length; i++) {
          const p = itemState.periodos[i] || {};
          const saida = Calc.saida(itemState, i);
          linha.push({ content: formatarNumero(p.recebido), styles: { halign: "center" } });
          linha.push({ content: formatarNumero(p.estoque), styles: { halign: "center" } });
          linha.push({
            content: formatarNumero(saida),
            styles: {
              halign: "center",
              fontStyle: "bold",
              textColor: saida != null && saida < 0 ? [180, 60, 55] : [30, 110, 75],
            },
          });
        }
        body.push(linha);
      });
    });

    doc.autoTable({
      startY: 24,
      margin: { left: margem, right: margem, bottom: 12 },
      head: [headRow1, headRow2],
      body,
      styles: { fontSize: 6.4, cellPadding: 1.1, lineColor: [214, 222, 231], lineWidth: 0.1, valign: "middle" },
      headStyles: { fillColor: [18, 64, 95], textColor: 255, fontSize: 6.6, halign: "center" },
      columnStyles: {
        0: { cellWidth: 46, fontSize: 6.6 },
        1: { cellWidth: 20 },
        2: { cellWidth: 13 },
      },
    });

    // Rodapé com numeração "página X/Y": só dá para saber o total de páginas
    // depois que a tabela inteira foi montada, então preenchemos em uma
    // segunda passada por todas as páginas já geradas.
    const totalPaginas = doc.internal.getNumberOfPages();
    const alturaPagina = doc.internal.pageSize.getHeight();
    for (let p = 1; p <= totalPaginas; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text(
        "* Item faz parte do Kit de Ensino. Saída = Estoque anterior + Recebido - Estoque contado.",
        margem,
        alturaPagina - 4
      );
      doc.text(
        `Publicações — app de controle de movimento · S-28-T · página ${p}/${totalPaginas}`,
        larguraPagina - margem,
        alturaPagina - 4,
        { align: "right" }
      );
    }

    const nomeArquivo = `S-28-T_${(estado.nome || "congregacao").replace(/\s+/g, "-")}_${estado.anoServico || ""}.pdf`;
    doc.save(nomeArquivo);
  }

  return { gerarPDF };
})();
