function initFinanceiro() {
  const el = document.getElementById('financeiro-content');

  const budget = [
    { categoria: 'Desenvolvimento Tecnológico', valor: 45000, cor: '#D85A30' },
    { categoria: 'Consultoria e Validação',     valor: 18000, cor: '#9F8DE8' },
    { categoria: 'Interface e UX',              valor: 12000, cor: '#D4537E' },
    { categoria: 'Operação e Aquisição',        valor: 10000, cor: '#378ADD' },
    { categoria: 'Estruturação Operacional',    valor: 7000,  cor: '#C98A1A' },
    { categoria: 'Validação do Modelo',         valor: 5000,  cor: '#E24B4A' },
    { categoria: 'Preparação para Escala',      valor: 3000,  cor: '#6e6f78' },
  ];

  const total = budget.reduce((s, r) => s + r.valor, 0);

  const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const rows = budget.map(r => {
    const pct = ((r.valor / total) * 100).toFixed(1);
    return `
      <tr>
        <td>
          <span style="display:inline-flex; align-items:center; gap:7px;">
            <span style="width:8px;height:8px;border-radius:2px;background:${r.cor};flex-shrink:0;display:inline-block;"></span>
            ${r.categoria}
          </span>
        </td>
        <td class="value-cell">${fmt(r.valor)}</td>
        <td class="pct-cell">${pct}%</td>
        <td style="min-width:120px; padding-right:1.25rem;">
          <div class="budget-bar">
            <div class="budget-bar-fill" style="width:${pct}%; background:${r.cor};"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  el.innerHTML = `
    <div class="budget-header">
      <div>
        <div class="section-tag">Controle Financeiro · Plano de Trabalho Revisão 2</div>
        <h2 class="section-heading" style="font-size:1.4rem; margin-bottom:0;">Alocação de Orçamento</h2>
      </div>
      <div class="budget-total-box">
        <div class="budget-total-label">Orçamento Total</div>
        <div class="budget-total-value">${fmt(total)}</div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-title">Distribuição por Categoria de Meta</span>
        <span style="font-size:11px; color:var(--text3)">Período Abril – Agosto 2025</span>
      </div>
      <div class="table-scroll-wrapper">
        <table class="budget-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Valor Previsto</th>
              <th>% do Total</th>
              <th>Participação</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg3);">
              <td style="font-family:'Syne',sans-serif; font-weight:600; color:var(--text); padding:0.65rem 0.75rem; border-top:1px solid var(--border);">
                Total Geral
              </td>
              <td style="font-family:'Syne',sans-serif; font-weight:700; color:var(--accent); padding:0.65rem 0.75rem; border-top:1px solid var(--border); white-space:nowrap;">
                ${fmt(total)}
              </td>
              <td style="padding:0.65rem 0.75rem; border-top:1px solid var(--border); color:var(--text3);">100%</td>
              <td style="padding:0.65rem 0.75rem; border-top:1px solid var(--border);"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="budget-summary-grid">
      <div class="budget-summary-card">
        <div class="budget-summary-title">Maior Alocação</div>
        <div class="budget-summary-value" style="color:#D85A30;">Desenvolvimento Tecnológico</div>
      </div>
      <div class="budget-summary-card">
        <div class="budget-summary-title">Período de Execução</div>
        <div class="budget-summary-value">5 meses · Abr–Ago 2025</div>
      </div>
      <div class="budget-summary-card">
        <div class="budget-summary-title">Categorias de Meta</div>
        <div class="budget-summary-value">7 categorias</div>
      </div>
      <div class="budget-summary-card">
        <div class="budget-summary-title">Edital de Referência</div>
        <div class="budget-summary-value" style="font-size:0.95rem;">SECTI-AL/FAPEAL Nº 02/2025</div>
      </div>
    </div>
  `;
}
