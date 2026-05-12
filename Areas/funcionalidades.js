function initFuncionalidades() {
  const el = document.getElementById('funcionalidades-content');

  const features = [
    {
      tag: 'Backend',
      cor: '#D85A30',
      titulo: 'Infraestrutura e Banco de Dados',
      desc: 'Arquitetura do sistema, modelagem do banco de dados e desenvolvimento do backend principal.',
      itens: ['Definição da arquitetura do sistema', 'Estrutura do banco de dados', 'Backend principal (API)', 'Estabilização e refinamento'],
      status: 'em-andamento',
      statusLabel: 'Em andamento',
    },
    {
      tag: 'Cadastros',
      cor: '#1D9E75',
      titulo: 'Módulo de Usuários',
      desc: 'Cadastro, autenticação e gestão de perfis de usuários da plataforma.',
      itens: ['Cadastro de usuários', 'Organização da base inicial', 'Captação e prospecção', 'Fluxos de entrada (Google Forms)'],
      status: 'em-andamento',
      statusLabel: 'Em andamento',
    },
    {
      tag: 'Cadastros',
      cor: '#378ADD',
      titulo: 'Módulo de Empreendimentos',
      desc: 'Cadastro e gestão dos empreendimentos conectados à plataforma.',
      itens: ['Cadastro de empreendimentos', 'Primeiros contatos com parceiros', 'Prospecção de clientes', 'Painel de gestão inicial'],
      status: 'planejado',
      statusLabel: 'Planejado',
    },
    {
      tag: 'Interface',
      cor: '#D4537E',
      titulo: 'Interface e Acessibilidade',
      desc: 'Design da interface com foco em acessibilidade e experiência do usuário.',
      itens: ['Definição inicial da interface', 'Planejamento de acessibilidade', 'Impl. da interface acessível', 'Integração frontend e backend'],
      status: 'em-andamento',
      statusLabel: 'Em andamento',
    },
    {
      tag: 'Comunicação',
      cor: '#C98A1A',
      titulo: 'Newsletter e Fluxos Operacionais',
      desc: 'Estruturação e operação contínua da newsletter e fluxos de comunicação com usuários.',
      itens: ['Estruturação da newsletter', 'Fluxos de comunicação', 'Primeiros e-mails informativos', 'Operação contínua'],
      status: 'em-andamento',
      statusLabel: 'Em andamento',
    },
    {
      tag: 'Validação',
      cor: '#9F8DE8',
      titulo: 'Sistema de Validação e Metodologia',
      desc: 'Metodologia de validação do modelo de negócio e sistema de selo de qualidade.',
      itens: ['Metodologia de validação', 'Consolidação do sistema de validação', 'Inserção de dados reais', 'Testes internos do sistema'],
      status: 'planejado',
      statusLabel: 'Planejado',
    },
    {
      tag: 'Crescimento',
      cor: '#639922',
      titulo: 'Operação e Crescimento',
      desc: 'Estratégias de aquisição de usuários e clientes para crescimento da plataforma.',
      itens: ['Aquisição contínua de usuários', 'Aquisição de clientes', 'Operação ativa da newsletter', 'Escala dos fluxos operacionais'],
      status: 'planejado',
      statusLabel: 'Planejado',
    },
    {
      tag: 'Escala',
      cor: '#6e6f78',
      titulo: 'Preparação para Escala',
      desc: 'Consolidação das operações e planejamento para expansão após o período do plano.',
      itens: ['Consolidação dos fluxos operacionais', 'Roadmap de expansão', 'Consolidação da metodologia de validação', 'Sistema de selo'],
      status: 'planejado',
      statusLabel: 'Planejado',
    },
  ];

  const cards = features.map(f => `
    <div class="feature-card">
      <span class="feature-card-tag" style="background:${f.cor}22; color:${f.cor};">${f.tag}</span>
      <div class="feature-card-title">${f.titulo}</div>
      <div class="feature-card-desc">${f.desc}</div>
      <ul class="feature-card-items">
        ${f.itens.map(i => `<li>${i}</li>`).join('')}
      </ul>
      <span class="status-badge ${f.status}">${f.statusLabel}</span>
    </div>
  `).join('');

  el.innerHTML = `
    <div class="section-tag" style="margin-bottom:0.5rem;">Áreas e Módulos · Plataforma PLURA</div>
    <h2 class="section-heading" style="font-size:1.4rem; margin-bottom:0.5rem;">Funcionalidades</h2>
    <p class="section-desc" style="margin-bottom:1.75rem;">
      Módulos e áreas de desenvolvimento que compõem a plataforma PLURA INOVA SIMPLES,
      conforme o Plano de Trabalho Revisão 2.
    </p>
    <div class="features-grid">
      ${cards}
    </div>
  `;
}
