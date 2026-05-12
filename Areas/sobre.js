function initSobre() {
  const el = document.getElementById('sobre-content');
  el.innerHTML = `
    <div class="main">

      <div class="section-hero">
        <div>
          <div class="section-tag">Plano de Trabalho · Revisão 2 · SECTI-AL/FAPEAL Nº 02/2025</div>
          <h1 class="section-heading">PLURA INOVA SIMPLES</h1>
          <p class="section-desc">
            Plataforma digital de inovação para o ecossistema empreendedor de Maceió/AL.
            Conecta empreendedores, usuários e recursos em um ambiente acessível e escalável,
            desenvolvida no âmbito do Edital SECTI-AL/FAPEAL Nº 02/2025.
          </p>
        </div>
        <div class="sobre-stats-grid">
          <div class="sobre-stat-card">
            <div class="sobre-stat-value">12</div>
            <div class="sobre-stat-label">Metas</div>
          </div>
          <div class="sobre-stat-card">
            <div class="sobre-stat-value">38</div>
            <div class="sobre-stat-label">Atividades</div>
          </div>
          <div class="sobre-stat-card">
            <div class="sobre-stat-value">5</div>
            <div class="sobre-stat-label">Meses</div>
          </div>
          <div class="sobre-stat-card">
            <div class="sobre-stat-value accent">2025</div>
            <div class="sobre-stat-label">Abr – Ago</div>
          </div>
        </div>
      </div>

      <div class="cards-grid-2">
        <div class="info-card">
          <div class="info-card-title">Identificação</div>
          <div class="info-row">
            <span class="info-key">Empresa</span>
            <span class="info-val">PLURA INOVA SIMPLES (I.S.)</span>
          </div>
          <div class="info-row">
            <span class="info-key">CNPJ</span>
            <span class="info-val">64.988.404/0001-18</span>
          </div>
          <div class="info-row">
            <span class="info-key">Localização</span>
            <span class="info-val">Maceió, Alagoas</span>
          </div>
          <div class="info-row">
            <span class="info-key">Edital</span>
            <span class="info-val">SECTI-AL/FAPEAL Nº 02/2025</span>
          </div>
          <div class="info-row">
            <span class="info-key">Período</span>
            <span class="info-val">Abril a Agosto de 2025</span>
          </div>
          <div class="info-row">
            <span class="info-key">Revisão</span>
            <span class="info-val">Plano de Trabalho — Revisão 2</span>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-title">Objetivos do Plano</div>
          <ul class="objectives-list">
            <li>Estruturar a base operacional da plataforma digital</li>
            <li>Desenvolver o MVP com backend robusto e interface acessível</li>
            <li>Captar os primeiros usuários e empreendimentos cadastrados</li>
            <li>Validar o modelo de negócio com dados reais de uso</li>
            <li>Consolidar metodologia de validação e sistema de selo</li>
            <li>Preparar a plataforma para escala ao final do período</li>
          </ul>
        </div>
      </div>

      <div class="cards-grid-4" id="sobreNavCards">
        <div class="nav-card" data-goto="sobre">
          <div class="nav-card-label">· Atual</div>
          <div class="nav-card-title">Sobre</div>
          <div class="nav-card-desc">Visão geral do projeto e objetivos estratégicos</div>
        </div>
        <div class="nav-card" data-goto="cronograma">
          <div class="nav-card-label">· Acessar</div>
          <div class="nav-card-title">Cronograma</div>
          <div class="nav-card-desc">Gantt com 38 atividades distribuídas em 5 meses</div>
        </div>
        <div class="nav-card" data-goto="financeiro">
          <div class="nav-card-label">· Acessar</div>
          <div class="nav-card-title">Financeiro</div>
          <div class="nav-card-desc">Alocação de orçamento por categoria de meta</div>
        </div>
        <div class="nav-card" data-goto="funcionalidades">
          <div class="nav-card-label">· Acessar</div>
          <div class="nav-card-title">Funcionalidades</div>
          <div class="nav-card-desc">Módulos e áreas de desenvolvimento da plataforma</div>
        </div>
      </div>

    </div>
  `;

  el.querySelectorAll('.nav-card[data-goto]').forEach(card => {
    card.addEventListener('click', () => showSection(card.dataset.goto));
  });
}
