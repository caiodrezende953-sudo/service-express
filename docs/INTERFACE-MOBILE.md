# Interface móvel

Sem SQL nem alteração de dados. Mantém os mesmos botões e eventos, com navegação por menu em telas de até 760 px. No computador a navegação permanece expandida. Sem JavaScript ou sem matchMedia, o menu original continua disponível.

Menu com aria-expanded, fechamento por Escape, clique fora e escolha de ação. Retornar à largura de computador limpa o estado recolhido. Formulários usam fonte de 16 px nos campos textuais, áreas de toque de 44 px ou maiores, quebra de textos longos e listas de bairros com rolagem. Modais usam altura dinâmica do dispositivo. A avaliação mantém controles de 44 px.

Chat usa visualViewport quando disponível para ajustar a altura visível e deslocamento ao teclado. CSS inclui margens de segurança de dispositivos com recortes. Sem visualViewport, usa innerHeight e o redimensionamento normal. O painel continua sendo não modal: não foi introduzido bloqueio de foco no restante da página.

Testes automáticos locais verificam menu, preservação de eventos, Escape, mudança de largura e atualização de altura. Os testes gerais também foram executados. Nenhum navegador de renderização estava disponível nesta execução: a conferência visual, rolagem e teclado reais em Chrome Android e Safari iOS permanecem pendentes.

Roteiro final: conferir 320, 360, 390 e 768 px, e desktop 1280 px; abrir conta e cadastro profissional; selecionar atividades de duas profissões; digitar mensagem com teclado aberto; conferir avaliação, arquivos, painel profissional e Central. Testar zoom e rotação do aparelho. Nenhum resultado visual real foi presumido.
