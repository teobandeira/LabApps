export type ManualBlock = {
  title: string;
  points: string[];
};

export type ManualChapter = {
  id: string;
  number: number;
  title: string;
  objective: string;
  quickActions: string[];
  blocks: ManualBlock[];
  commonMistakes: string[];
};

export const MANUAL_CHAPTERS: ManualChapter[] = [
  {
    id: "principios-prioridades",
    number: 1,
    title: "Principios e prioridades",
    objective: "Entender o por que antes do como para decidir sob pressao sem panico.",
    quickActions: [
      "Pergunte: o que pode matar nas proximas 1-3 horas?",
      "Aplique a ordem: seguranca -> primeiros socorros -> abrigo/temperatura -> agua -> comunicacao -> comida.",
      "Defina uma acao imediata, uma acao de 30 minutos e uma acao de 3 horas.",
      "Reavalie risco a cada mudanca de clima, local ou estado fisico.",
    ],
    blocks: [
      {
        title: "Regra das prioridades",
        points: [
          "Sobrevivencia e contexto. Em enchente subindo, subir para area segura vale mais que organizar mochila.",
          "Curto prazo vence longo prazo. Nas primeiras horas foque em respirar, manter temperatura e evitar trauma.",
          "Evite tarefas de baixo impacto quando houver risco alto imediato.",
        ],
      },
      {
        title: "Triangulo de necessidades",
        points: [
          "Seguranca: afastar de fogo, agua rapida, estruturas instaveis, violencia e transito.",
          "Primeiros socorros: manter vias aereas abertas, controlar sangramento, chamar ajuda.",
          "Abrigo e termorregulacao: reduzir perda de calor ou insolacao.",
          "Agua: buscar fonte e tratar com metodo adequado.",
          "Sinalizacao e comunicacao: informar local e condicao para acelerar resgate.",
          "Comida: entra depois que os riscos de morte rapida estiverem controlados.",
        ],
      },
      {
        title: "Avaliacao rapida de risco",
        points: [
          "Use o metodo 3x3: 3 riscos ambientais, 3 riscos de saude, 3 recursos disponiveis.",
          "Classifique cada risco em probabilidade (baixa/media/alta) e impacto (baixo/medio/alto).",
          "Priorize qualquer risco de impacto alto mesmo com probabilidade media.",
        ],
      },
      {
        title: "Checklist mental anti-panico",
        points: [
          "Pare 10 segundos, respire 4-4-6 (inspira 4, segura 4, solta 6).",
          "Nomeie o problema em voz alta em uma frase curta.",
          "Escolha a proxima acao concreta e comunique para o grupo.",
          "Execute, confirme resultado e repita ciclo.",
        ],
      },
    ],
    commonMistakes: [
      "Entrar em modo de coleta de itens e ignorar risco ambiental imediato.",
      "Tomar decisoes por impulso sem avaliar rota de saida.",
      "Subestimar frio, calor e desidratacao nas primeiras horas.",
    ],
  },
  {
    id: "preparacao-planejamento",
    number: 2,
    title: "Preparacao e planejamento",
    objective: "Transformar risco abstrato em plano pratico para familia, casa e deslocamento.",
    quickActions: [
      "Mapeie os 5 riscos mais provaveis da sua regiao.",
      "Defina plano de evacuacao e plano de abrigo no local.",
      "Imprima contatos, mapas, alergias e medicamentos continuos.",
      "Treine simulados curtos 1 vez por mes e simulados completos por trimestre.",
    ],
    blocks: [
      {
        title: "Mapeamento de riscos locais",
        points: [
          "Identifique historico de enchente, deslizamento, incendios, falta de energia e ondas de calor.",
          "Considere riscos humanos: violencia, bloqueios de via, aglomeracoes perigosas.",
          "Marque pontos de apoio: hospital, posto da defesa civil, farmacia 24h, pontos altos seguros.",
        ],
      },
      {
        title: "Planos essenciais",
        points: [
          "Plano familiar: ponto de encontro primario e secundario, contato fora da cidade e palavra-codigo.",
          "Plano de evacuacao: gatilhos de saida, rotas A/B/C, ordem de prioridade de pessoas e itens.",
          "Plano de abrigo no local: agua minima, ventilacao, area de isolamento, rotina de economia de energia.",
        ],
      },
      {
        title: "Documentos e dados",
        points: [
          "Pasta fisica impermeavel com documentos, receitas medicas e contatos.",
          "Pendrive offline criptografado com copias de RG, CPF, exames e seguros.",
          "Lista impressa de medicamentos, dosagem e alergias por pessoa.",
        ],
      },
      {
        title: "Treinamento minimo recomendado",
        points: [
          "Primeiros socorros basicos a cada 12 meses.",
          "Treino de evacuacao da casa em 5 e 15 minutos uma vez por mes.",
          "Treino de uso de extintor, fogareiro e corte de energia/agua a cada 6 meses.",
        ],
      },
    ],
    commonMistakes: [
      "Criar plano complexo demais e nunca treinar.",
      "Depender so de celular para contatos e mapas.",
      "Nao adaptar plano para criancas, idosos e pessoas com condicao cronica.",
    ],
  },
  {
    id: "kit-sobrevivencia",
    number: 3,
    title: "Kit de sobrevivencia (EDC, 24h, 72h, casa)",
    objective: "Montar kits por tempo e contexto para resolver problema real sem excesso inutil.",
    quickActions: [
      "Monte EDC simples para resolver emergencias urbanas imediatas.",
      "Tenha mochila 24h/72h pronta e revisada por estacao.",
      "Mantenha kit de casa para 7 dias no minimo quando possivel.",
      "Use checklist mensal de validade, baterias e reposicao.",
    ],
    blocks: [
      {
        title: "EDC (carrego diario)",
        points: [
          "Documento, dinheiro fracionado, cartao de emergencia e contatos.",
          "Lanterna pequena, canivete legal/local permitido, mini kit de curativo e alcool gel.",
          "Power bank compacto e cabo curto compatvel com seu telefone.",
        ],
      },
      {
        title: "Kit 24h/72h (bug-out bag)",
        points: [
          "Agua tratada + meio de tratamento, manta termica, capa de chuva, muda de roupa por camadas.",
          "Lanterna principal, pilhas extras, radio simples, apito e mapa local impresso.",
          "Comida estavel de alta densidade calorica, utensilio simples, fogareiro seguro quando apropriado.",
          "Modulo por regiao: frio (luvas/gorro), calor (protecao solar/sais), litoral (itens anti-umidade).",
        ],
      },
      {
        title: "Kit para ficar em casa",
        points: [
          "Reserva de agua, alimentos estaveis, iluminacao de emergencia e meios de recarga.",
          "Higiene e saneamento: sabao, alcool, sacos resistentes, balde com tampa, cloro domestico.",
          "Seguranca residencial: extintor adequado, trancas funcionais, fita de vedacao e ferramentas basicas.",
        ],
      },
      {
        title: "Manutencao e perfis especiais",
        points: [
          "Checklist mensal: validade, pilhas, medicamentos, roupa por tamanho, itens danificados.",
          "Crianca: identificacao, conforto emocional, snack conhecido, item de apego.",
          "Idoso: dose extra de medicamentos, oculos reserva, suporte de mobilidade.",
          "Pet: guia, agua, racao, copia de vacina e contato veterinario.",
          "Diabetico e bebe: insumos especificos, monitoramento e plano de contingencia detalhado.",
        ],
      },
    ],
    commonMistakes: [
      "Mochila pesada demais e impraticavel para deslocamento real.",
      "Comprar equipamento caro sem treinar uso.",
      "Ignorar validade de agua tratada, remedios e baterias.",
    ],
  },
  {
    id: "primeiros-socorros-saude",
    number: 4,
    title: "Primeiros socorros e saude",
    objective: "Reduzir risco de morte e agravamento ate ajuda especializada chegar.",
    quickActions: [
      "Aplicar ABC: vias aereas, respiracao, circulacao.",
      "Controlar sangramento grave imediatamente com pressao direta.",
      "Acionar emergencia cedo quando houver alteracao de consciencia, dor toracica ou trauma grave.",
      "Registrar horario, sintomas e procedimentos feitos.",
    ],
    blocks: [
      {
        title: "ABC e acionamento de ajuda",
        points: [
          "A: verifique obstrucao de vias aereas. Se necessario, reposicione de forma segura.",
          "B: observe respiracao (frequencia, esforco, cianose, ruido).",
          "C: controle hemorragia e sinais de choque (pele fria, pulso fraco, confusao).",
          "Acione socorro imediatamente em risco de vida ou piora rapida.",
        ],
      },
      {
        title: "Sangramento e trauma",
        points: [
          "Pressao direta firme com gaze ou pano limpo e sem retirar curativo encharcado; adicione camadas.",
          "Torniquete apenas em sangramento de membro sem controle por pressao direta, anotando horario.",
          "Suspeita de fratura: imobilizar na posicao encontrada e evitar movimentacao desnecessaria.",
        ],
      },
      {
        title: "Condicoes comuns em desastre",
        points: [
          "Queimaduras: resfriar com agua corrente fresca por varios minutos, sem gelo e sem pomada caseira.",
          "Entorse: repouso, compressao moderada, elevacao e gelo protegido.",
          "Hipotermia: remover umidade, aquecer tronco progressivamente, proteger vento.",
          "Hipertermia/insolacao: sombra, hidratar, resfriar pele e monitorar estado mental.",
          "Desidratacao: pequenas ingestoes frequentes de agua e sais quando possivel.",
        ],
      },
      {
        title: "Feridas, infeccao e saude mental",
        points: [
          "Limpeza com agua potavel e sabao suave ao redor da ferida; manter curativo limpo e seco.",
          "Sinais de gravidade: vermelhidao progressiva, febre, pus, dor intensa, mau cheiro.",
          "Farmacia essencial: analgesico habitual, antitermico, anti-histaminico, curativos, luvas, soro oral.",
          "Controle de panico: respiracao 4-4-6, tecnica 5-4-3-2-1 e distribuicao de tarefas simples.",
        ],
      },
    ],
    commonMistakes: [
      "Mover vitima sem necessidade em suspeita de trauma de coluna.",
      "Aplicar substancias caseiras em queimadura ou ferida aberta.",
      "Aguardar piora para pedir ajuda profissional.",
    ],
  },
  {
    id: "agua",
    number: 5,
    title: "Agua (captacao, tratamento e armazenamento)",
    objective: "Garantir agua segura e evitar doencas por contaminacao biologica ou quimica.",
    quickActions: [
      "Escolha fonte mais segura disponivel e longe de esgoto/industria.",
      "Aplique tratamento adequado ao risco (fervura, filtro, cloracao).",
      "Armazene em recipientes limpos e etiquetados com data.",
      "Calcule consumo por pessoa/dia considerando calor e esforco.",
    ],
    blocks: [
      {
        title: "Fontes e riscos",
        points: [
          "Risco biologico: bacterias, virus e protozoarios em agua superficial contaminada.",
          "Risco quimico: combustiveis, solventes, metais pesados e defensivos agricolas.",
          "Agua turva exige pre-filtragem por pano limpo antes do tratamento principal.",
        ],
      },
      {
        title: "Metodos de tratamento",
        points: [
          "Fervura: eficaz para risco biologico; nao remove contaminante quimico.",
          "Filtracao: melhora particulado e alguns patogenos dependendo do filtro; validar especificacao.",
          "Cloracao/pastilhas: util contra biologico, exige dose e tempo corretos; agua muito turva reduz eficacia.",
          "Combinacao filtro + cloro/fervura aumenta seguranca em campo.",
        ],
      },
      {
        title: "Armazenamento seguro",
        points: [
          "Use recipientes alimenticios fechados, limpos e com data de enchimento.",
          "Mantenha longe de sol e calor excessivo para reduzir degradacao.",
          "Evite contaminacao cruzada: nao encostar bico em mao/superficie suja.",
        ],
      },
      {
        title: "Consumo diario",
        points: [
          "Base minima: 2-3 litros por pessoa/dia em clima ameno e baixa atividade.",
          "Com calor ou esforco: planeje 4-6 litros por pessoa/dia.",
          "Inclua margem para higiene basica, preparo de alimento e necessidades medicas.",
        ],
      },
    ],
    commonMistakes: [
      "Confiar em agua de aparencia limpa sem tratamento.",
      "Usar dose de cloro sem medir volume e tempo de contato.",
      "Armazenar agua tratada em garrafa suja ou mal fechada.",
    ],
  },
  {
    id: "abrigo-termorregulacao",
    number: 6,
    title: "Abrigo e termorregulacao",
    objective: "Controlar perda ou ganho extremo de temperatura, um dos maiores fatores de mortalidade.",
    quickActions: [
      "Isolar do vento, chuva e solo frio antes de pensar em conforto.",
      "Organizar roupas em camadas e controlar suor.",
      "Planejar rotinas para frio ou calor conforme horario do dia.",
      "Usar fogo com ventilacao, distancia e controle de risco.",
    ],
    blocks: [
      {
        title: "Abrigo improvisado",
        points: [
          "Priorize local seco, fora de curso de agua e sem risco de queda de galhos/estrutura.",
          "Use lona inclinada para escoamento de chuva e isolamento do solo com material seco.",
          "Nos basicos uteis: bowline, clove hitch e taut-line hitch para ajuste rapido.",
        ],
      },
      {
        title: "Roupas em camadas",
        points: [
          "Camada base para gerir suor, camada intermediaria para isolamento, camada externa contra vento/chuva.",
          "Troque roupa molhada cedo para evitar hipotermia progressiva.",
          "No calor, roupas leves e respiraveis com cobertura solar.",
        ],
      },
      {
        title: "Frio e calor",
        points: [
          "Frio: proteja extremidades, bloqueie vento e mantenha ingestao de liquidos.",
          "Calor: sombra, ventilacao cruzada, pausas frequentes e atividade em horarios seguros.",
          "Sinais graves de calor: confusao, pele muito quente, tontura persistente.",
        ],
      },
      {
        title: "Fogo e energia termica",
        points: [
          "Acender fogo apenas em area controlada e com material seco preparado antes.",
          "Tenha meio de extincao rapido (agua, areia, abafador).",
          "Nunca use chama em ambiente fechado sem ventilacao adequada.",
        ],
      },
    ],
    commonMistakes: [
      "Subestimar vento e umidade como aceleradores de hipotermia.",
      "Trabalhar forte no calor sem pausa e sem reposicao hidrica.",
      "Acender fogo perto de material inflamavel ou dentro de espaco mal ventilado.",
    ],
  },
  {
    id: "alimentacao",
    number: 7,
    title: "Alimentacao (curto e medio prazo)",
    objective: "Manter energia e saude sem tratar comida como prioridade antes de agua e abrigo.",
    quickActions: [
      "Nas primeiras 24-72h priorize hidratacao e estabilidade fisiologica.",
      "Use alimentos estaveis com preparo simples e previsivel.",
      "Organize rotacao de estoque (PEPS: primeiro que entra, primeiro que sai).",
      "Somente pratique coleta/pesca/caca se houver preparo tecnico e legal.",
    ],
    blocks: [
      {
        title: "Estrategia por fases",
        points: [
          "24-72h: foco em manutencao de energia com baixo gasto de preparo.",
          "Semanas: montar plano de estoque, reposicao e variedade nutricional.",
          "Evite gastar mais calorias buscando comida do que o retorno energetico esperado.",
        ],
      },
      {
        title: "Alimentos estaveis",
        points: [
          "Priorize itens densos, duraveis e conhecidos pelo grupo (graos, enlatados, barras, leite em po).",
          "Etiquete validade e lote para controle simples.",
          "Armazene em local seco, ventilado e protegido de pragas.",
        ],
      },
      {
        title: "Cozinha sem energia",
        points: [
          "Fogareiro com combustivel adequado e area ventilada.",
          "Alcool e lenha apenas com controle de chama e distancia de materiais inflamaveis.",
          "Nunca cozinhe em espaco fechado sem renovacao de ar.",
        ],
      },
      {
        title: "Coleta, pesca e caca",
        points: [
          "Tema avancado e dependente de contexto legal e ambiental.",
          "Considere riscos de intoxicacao, acidentes e conflito de fauna.",
          "Adote apenas tecnicas treinadas, legais e com equipamento apropriado.",
        ],
      },
    ],
    commonMistakes: [
      "Priorizar comida antes de resolver agua segura.",
      "Comprar estoque sem testar aceitacao da familia.",
      "Ignorar risco de contaminacao alimentar por calor e higiene ruim.",
    ],
  },
  {
    id: "navegacao-evacuacao",
    number: 8,
    title: "Navegacao, deslocamento e evacuacao",
    objective: "Mover-se com seguranca e menor exposicao a risco em cidade, estrada e mata.",
    quickActions: [
      "Planeje rotas A/B/C com pontos de referencia claros.",
      "Combine mapa impresso + bussola + GPS (quando houver).",
      "Evite areas alagadas, encostas instaveis e vias com bloqueio tatico.",
      "Defina gatilho de recuo para nao insistir em rota insegura.",
    ],
    blocks: [
      {
        title: "Mapa, bussola e GPS",
        points: [
          "Mapa e bussola funcionam sem bateria e devem ser base principal de redundancia.",
          "GPS acelera orientacao, mas pode falhar por bateria, cobertura ou interferencia.",
          "Treine leitura de curvas de nivel, direcao cardeal e distancia estimada.",
        ],
      },
      {
        title: "Rotas e referencias",
        points: [
          "Marque pontos duros: escola, ponte, posto, torre, cruzamento principal.",
          "Identifique choke points e alternativas para cada trecho critico.",
          "Mantenha tempo alvo por trecho para avaliar atraso e tomar decisao.",
        ],
      },
      {
        title: "Deslocamento urbano e rural",
        points: [
          "Urbano: evitar multidoes, area de saque, baixa iluminacao e vias sem saida.",
          "Rural/mata: controlar ritmo, navegacao por azimute e protecao contra clima.",
          "Nunca atravesse correnteza forte a pe ou de veiculo sem avaliacao tecnica.",
        ],
      },
      {
        title: "Sinais ambientais de perigo",
        points: [
          "Rios subindo rapido, barro recente, trincas em encosta, cheiro de queimado, trovoes proximos.",
          "Mudanca brusca de vento e temperatura pode indicar tempestade severa.",
          "Ao identificar risco crescente, mova-se cedo para area segura.",
        ],
      },
    ],
    commonMistakes: [
      "Confiar em uma unica rota.",
      "Dirigir em laminas de agua sem profundidade conhecida.",
      "Continuar avancando apesar de sinais claros de deterioracao ambiental.",
    ],
  },
  {
    id: "comunicacao-sinalizacao",
    number: 9,
    title: "Comunicacao e sinalizacao",
    objective: "Aumentar chance de resgate e coordenacao usando mensagens curtas e redundancia de canais.",
    quickActions: [
      "Defina protocolo simples de mensagem para familia/equipe.",
      "Economize bateria e estabeleca janelas de contato.",
      "Prepare meios visuais e sonoros de sinalizacao.",
      "Treine operacao em cenarios sem internet e sem celular.",
    ],
    blocks: [
      {
        title: "Plano de contato",
        points: [
          "Mensagem padrao: quem, onde, estado, necessidade, proxima atualizacao.",
          "Contato fora da cidade para consolidar informacao do grupo.",
          "Palavra-codigo para confirmar autenticidade e evitar confusao.",
        ],
      },
      {
        title: "Energia e equipamentos",
        points: [
          "Power bank carregado, cabos testados, fonte alternativa (solar/manivela quando aplicavel).",
          "Radio local pode ser essencial para alertas oficiais durante pane de dados.",
          "Modo economia de bateria e tela reduzida para prolongar autonomia.",
        ],
      },
      {
        title: "Sinalizacao pratica",
        points: [
          "Visual: tecido contrastante, luz piscante, marcacao em area aberta.",
          "Sonora: apito com padrao de repeticao para localizar equipe.",
          "Geolocalizacao: compartilhar coordenadas quando sinal permitir e com consentimento.",
        ],
      },
      {
        title: "Pane de rede",
        points: [
          "Use pontos e horarios fixos para tentativa de contato.",
          "Acorde protocolo offline de encontro em caso de silencio prolongado.",
          "Documente recados em papel em local combinado quando necessario.",
        ],
      },
    ],
    commonMistakes: [
      "Mensagens longas e confusas em momento critico.",
      "Consumir bateria com apps nao essenciais.",
      "Nao combinar janela de contato e gerar desencontro.",
    ],
  },
  {
    id: "seguranca-autoprotecao",
    number: 10,
    title: "Seguranca pessoal e autoprotecao",
    objective: "Reduzir exposicao a conflito e aumentar prevencao com bom senso e legalidade.",
    quickActions: [
      "Pratique consciencia situacional: observar, orientar, decidir.",
      "Reforce barreiras simples em casa e rotina de entrada/saida.",
      "Priorize desescalada e evasao em vez de confronto.",
      "Use apenas itens legais e adequados a sua regiao.",
    ],
    blocks: [
      {
        title: "Prevencao e consciencia situacional",
        points: [
          "Mantenha atencao em pessoas, rotas de fuga e mudancas de comportamento no ambiente.",
          "Evite padroes previsiveis de deslocamento em periodos de crise.",
          "Compartilhe itinerario com pessoa confiavel em deslocamentos de risco.",
        ],
      },
      {
        title: "Barreiras e reforcos residenciais",
        points: [
          "Iluminacao externa funcional, trancas revisadas e controle de acesso.",
          "Organize area segura interna para familia em caso de intrusao.",
          "Mantenha itens de emergencia em local conhecido por todos.",
        ],
      },
      {
        title: "Conflito e desescalada",
        points: [
          "Use voz calma, frases curtas e postura nao provocativa.",
          "Se houver possibilidade de saida segura, priorize sair.",
          "Nao reaja a provocacao quando risco de escalada for alto.",
        ],
      },
      {
        title: "Legalidade",
        points: [
          "Verifique legislacao local antes de portar qualquer item de defesa.",
          "Evite orientacoes ilegais, improvisos perigosos ou condutas de risco juridico.",
          "Objetivo e autoprotecao responsavel, nao enfrentamento.",
        ],
      },
    ],
    commonMistakes: [
      "Confundir preparo com postura agressiva.",
      "Ignorar sinais de escalada verbal e insistir em discussao.",
      "Portar item proibido sem conhecimento legal.",
    ],
  },
  {
    id: "saneamento-higiene",
    number: 11,
    title: "Saneamento, higiene e prevencao de doencas",
    objective: "Manter controle sanitario para evitar surtos e agravamento de condicoes simples.",
    quickActions: [
      "Defina area limpa, area suja e fluxo de descarte.",
      "Garanta higiene de maos mesmo com pouca agua.",
      "Controle lixo e agua cinza para evitar pragas e contaminacao.",
      "Monitore sintomas precoces de doencas comuns em desastre.",
    ],
    blocks: [
      {
        title: "Banheiro improvisado e residuos",
        points: [
          "Use recipiente apropriado com tampa e descarte seguro conforme contexto local.",
          "Separe residuos organicos, reciclaveis e potencialmente contaminados.",
          "Mantenha area de preparo de alimento distante da area de descarte.",
        ],
      },
      {
        title: "Higiene sem agua abundante",
        points: [
          "Priorize higiene de maos antes de comer e apos uso do banheiro.",
          "Use alcool 70% quando nao houver agua e sabao disponiveis.",
          "Roupas e panos umidos devem ser secos rapidamente para evitar fungo.",
        ],
      },
      {
        title: "Agua cinza e controle de pragas",
        points: [
          "Nao descarte agua cinza perto da fonte de captacao de agua potavel.",
          "Elimine pontos de agua parada para reduzir mosquitos.",
          "Armazene alimentos em recipientes fechados para evitar roedores e insetos.",
        ],
      },
      {
        title: "Doencas comuns e prevencao",
        points: [
          "Diarreias: hidratacao imediata, higiene rigida e observacao de desidratacao.",
          "Leptospirose: evitar contato com agua de enchente sem protecao.",
          "Dengue e outras arboviroses: eliminar criadouros e usar barreira fisica.",
        ],
      },
    ],
    commonMistakes: [
      "Descartar residuos perto da area de preparo de comida.",
      "Negligenciar higiene das maos em rotina de crise.",
      "Ignorar sinais iniciais de desidratacao e infeccao gastrointestinal.",
    ],
  },
  {
    id: "cenarios-especificos",
    number: 12,
    title: "Cenarios especificos (se acontecer X)",
    objective: "Agir por protocolo temporal para cada crise e reduzir erros no inicio do evento.",
    quickActions: [
      "Para cada cenario, pense em 10 min, 1 hora e 24-72h.",
      "Mantenha gatilhos claros para evacuar ou abrigar.",
      "Atualize plano apos cada simulacao ou evento real.",
      "Revise erros comuns antes do periodo de maior risco sazonal.",
    ],
    blocks: [
      {
        title: "Modelo de capitulo por cenario",
        points: [
          "Sinais previos: chuva intensa, cheiro de gas, queda de energia, calor extremo, etc.",
          "Primeiros 10 min: sair de risco imediato e acionar contatos essenciais.",
          "Primeira hora: estabilizar saude, abrigo, agua e comunicacao.",
          "24-72h: consolidar rotina, racionamento e reavaliacao de seguranca.",
          "Erros comuns: atraso na evacuacao, excesso de confianca, informacao nao verificada.",
        ],
      },
      {
        title: "Cenarios recomendados",
        points: [
          "Enchente: subir para area alta, evitar agua em correnteza e contato com contaminacao.",
          "Deslizamento: sair de encosta em sinal de trinca/estalo/lamina de barro.",
          "Incendio urbano/residencial: evacuacao imediata, fechamento de porta e chamada de emergencia.",
          "Apagao prolongado: preservar energia, refrigeracao critica e comunicacao por janela de contato.",
          "Onda de calor/frio: ajuste de rotina por horario seguro e monitoramento de vulneraveis.",
          "Tempestade severa: abrigo interno protegido e distancia de estruturas metalicas expostas.",
          "Falta d'agua: racionamento por prioridade e tratamento rigoroso.",
          "Terremoto (onde aplicavel): proteger cabeca/pescoco, afastar de estruturas e reavaliar apos tremor.",
          "Acidente de carro: sinalizar via, avaliar trauma e acionar resgate.",
          "Perda em trilha: parar, orientar, sinalizar e preservar energia.",
          "Naufragio/afogamento (litoral): flutuacao, economia de energia e sinalizacao visual/sonora.",
        ],
      },
    ],
    commonMistakes: [
      "Aplicar o mesmo protocolo em cenarios diferentes sem ajuste.",
      "Esperar confirmacao absoluta para iniciar acao preventiva.",
      "Subestimar fase de 24-72h apos choque inicial.",
    ],
  },
  {
    id: "checklists-prontos",
    number: 13,
    title: "Checklists prontos",
    objective: "Converter o manual em acao rapida com listas objetivas por tempo e contexto.",
    quickActions: [
      "Use checklist de 5, 15 e 60 minutos conforme janela disponivel.",
      "Mantenha checklist do carro e de saida da casa impresso.",
      "Aplique auditoria mensal do kit com data assinada.",
      "Treine leitura da checklist em voz alta com familia.",
    ],
    blocks: [
      {
        title: "Evacuacao em 5 minutos",
        points: [
          "Pessoas prioritarias reunidas e confirmadas.",
          "Documentos, celular, carregador e agua imediata.",
          "Saida por rota primaria e notificacao do contato externo.",
        ],
      },
      {
        title: "Evacuacao em 15 minutos",
        points: [
          "Mochila 24h/72h, medicamentos, itens de crianca/idoso/pet.",
          "Corte de gas e energia se seguro.",
          "Revisao rapida de trancas e janela de comunicacao.",
        ],
      },
      {
        title: "Evacuacao em 60 minutos",
        points: [
          "Organizar suprimentos adicionais para 72h+.",
          "Atualizar rota com condicoes atuais e plano alternativo.",
          "Registrar foto da casa e estado final antes de sair (quando seguro).",
        ],
      },
      {
        title: "Checklist do carro e da casa",
        points: [
          "Carro: combustivel, triangulo, lanterna, kit medico, agua, cabo e mapa.",
          "Casa antes de sair: gas, energia, agua, pets, portas, janelas, residuos.",
          "Auditoria mensal do kit: validade, falta de item, teste de equipamento.",
        ],
      },
    ],
    commonMistakes: [
      "Checklist longa e pouco objetiva para momento de pressao.",
      "Nao adaptar listas para perfis vulneraveis da familia.",
      "Nao revisar itens apos uso em evento real.",
    ],
  },
  {
    id: "farmacia-vs-natural",
    number: 14,
    title: "Farmacia comum x medicina natural",
    objective:
      "Usar remedios de farmacia e opcoes naturais/caseiras com criterio, seguranca e limite claro.",
    quickActions: [
      "Priorize sinais de gravidade: falta de ar, dor no peito, confusao, febre alta persistente, sangramento importante.",
      "Para sintomas leves, comece com hidratacao, repouso e medidas de suporte antes de combinar varios produtos.",
      "Nao misture remedios sem verificar interacoes, alergias e condicoes cronicas.",
      "Se houver piora, duracao prolongada ou duvida de dose, procure atendimento profissional.",
    ],
    blocks: [
      {
        title: "Quando usar farmacia comum",
        points: [
          "Dor, febre leve, desconforto gastrointestinal leve e alergia leve podem responder a itens basicos do kit.",
          "Siga sempre bula, dose por faixa etaria e intervalo correto; excesso nao acelera melhora.",
          "Evite automedicacao em gestantes, criancas pequenas, idosos fragilizados e pessoas com doenca cronica sem orientacao.",
        ],
      },
      {
        title: "Medicina natural e caseira (uso seguro)",
        points: [
          "Use medidas de baixo risco para suporte: agua, soro oral, repouso, alimentacao leve, compressa morna/fria conforme sintoma.",
          "Para garganta irritada e tosse leve, prefira hidratacao e umidificacao do ambiente; evite receitas agressivas.",
          "Cha e preparos caseiros podem ser apoio, mas nao substituem tratamento de infeccao, crise respiratoria ou dor intensa.",
        ],
      },
      {
        title: "Como montar protocolo caseiro pratico",
        points: [
          "Passo 1: identificar sintoma principal e medir sinais basicos (temperatura, estado geral, hidratacao).",
          "Passo 2: escolher uma intervencao de suporte por vez e reavaliar em 30-60 minutos.",
          "Passo 3: registrar horario, melhora/piora e qualquer reacao adversa.",
          "Passo 4: escalar para atendimento se nao houver melhora clara ou surgir sinal de alerta.",
        ],
      },
      {
        title: "Limites e sinais de alerta",
        points: [
          "Nao use remedio natural/caseiro para substituir atendimento em falta de ar, dor toracica, desmaio, convulsao ou trauma importante.",
          "Febre alta persistente, vomito repetido, sangue em secrecao/fezes/urina e desidratacao exigem avaliacao medica.",
          "Nunca ofereca preparos caseiros potencialmente toxicos ou sem procedencia conhecida.",
        ],
      },
    ],
    commonMistakes: [
      "Misturar varios remedios (farmacia + caseiro) ao mesmo tempo e perder controle do que causou efeito.",
      "Usar dose de adulto em crianca ou repetir dose antes do intervalo recomendado.",
      "Acreditar que remedio natural e sempre seguro em qualquer quantidade.",
    ],
  },
  {
    id: "evasao-floresta-parana",
    number: 15,
    title: "Evasao dentro da floresta (Parana)",
    objective:
      "Sair de area de risco em ambiente de floresta no Parana com orientacao, conservacao de energia e sinalizacao eficiente.",
    quickActions: [
      "Aplique STOP: pare, respire, observe e planeje antes de andar sem direcao.",
      "Marque o ponto atual (fita, anotacao ou waypoint) e escolha uma rota principal + alternativa.",
      "Priorize terreno estavel e mais alto, longe de leito de rio, grotas e encostas com sinais de deslizamento.",
      "Se o tempo fechar, prepare abrigo rapido e reduza deslocamento ate melhorar visibilidade e seguranca.",
    ],
    blocks: [
      {
        title: "Riscos mais comuns no contexto do Parana",
        points: [
          "Chuva forte e rapida aumenta risco de cabeca d'agua em rios e de solo ceder em trilhas de encosta.",
          "Frio noturno em altitude e vento umido podem acelerar hipotermia mesmo fora do inverno.",
          "Mata fechada reduz orientacao visual; neblina e perda de trilha sao comuns em serra e areas de araucaria.",
          "Animais peconhentos e carrapatos exigem deslocamento atento, roupa cobrindo pele e checagem periodica do corpo.",
        ],
      },
      {
        title: "Evasao segura em 10 minutos, 1 hora e 6 horas",
        points: [
          "Primeiros 10 minutos: estabilizar respiracao, tratar urgencias e evitar corrida em mata fechada.",
          "Primeira hora: definir azimute simples ou referencia linear segura (estrada, crista, cerca, curso d'agua sem cheia).",
          "Ate 6 horas: alternar 40-50 min de caminhada com 10 min de pausa para navegacao, hidratacao e reavaliacao.",
          "Se houver lesao, clima severo ou noite chegando, priorize abrigo e sinalizacao em vez de continuar avancando.",
        ],
      },
      {
        title: "Navegacao pratica sem depender de internet",
        points: [
          "Use mapa offline e bussola como base; GPS do celular e apoio, nao unica referencia.",
          "Trabalhe com pontos curtos: referencia visivel, checagem de direcao e confirmacao do relevo.",
          "Evite atalho por vale fechado ou encosta escorregadia; rota mais longa e estavel costuma ser mais segura.",
          "Registre horario e direcao em anotacao simples para evitar andar em circulo.",
        ],
      },
      {
        title: "Sinalizacao e resgate",
        points: [
          "Padrao internacional de socorro: 3 sinais curtos repetidos (apito, lanterna ou batidas).",
          "Em area aberta segura, sinal visual de alto contraste ajuda localizacao por equipes e aeronaves.",
          "Envie mensagem objetiva quando houver sinal: local aproximado, estado de saude, pessoas no grupo e recursos restantes.",
          "Conserve bateria: celular em modo economia, ligado apenas para janela de comunicacao programada.",
        ],
      },
    ],
    commonMistakes: [
      "Continuar andando sem rumo por ansiedade e piorar distancia da rota segura.",
      "Seguir rio durante chuva forte sem avaliar risco de subida rapida da agua.",
      "Ignorar sinais de frio, desidratacao e exaustao antes que se tornem emergencia.",
    ],
  },
  {
    id: "apendices-uteis",
    number: 16,
    title: "Apendices uteis",
    objective: "Concentrar referencias praticas para consulta rapida em campo.",
    quickActions: [
      "Imprima tabelas e contatos essenciais em formato compacto.",
      "Treine nos basicos com repeticao curta e frequente.",
      "Monte cartoes destacaveis para mochila e carteira.",
      "Atualize enderecos e telefones uteis a cada 3 meses.",
    ],
    blocks: [
      {
        title: "Nos essenciais",
        points: [
          "Bowline: cria alca fixa para ancoragem rapida.",
          "Clove hitch: fixacao inicial em estaca ou poste.",
          "Taut-line hitch: ajuste de tensao em cordas de abrigo.",
          "Treino recomendado: 5 minutos por dia por 2 semanas, depois manutencao semanal.",
        ],
      },
      {
        title: "Tabelas de referencia",
        points: [
          "Consumo de agua por clima e esforco (base 2-3L, calor/esforco 4-6L).",
          "Sinais vitais de referencia para monitoramento basico.",
          "Sistema de camadas de roupa por faixa de temperatura e vento.",
        ],
      },
      {
        title: "Lista de contatos importantes",
        points: [
          "Defesa Civil local, hospitais de referencia, unidade de pronto atendimento, veterinario.",
          "Contato familiar fora da cidade e vizinho de confianca.",
          "Enderecos fisicos de abrigo e pontos de encontro.",
        ],
      },
      {
        title: "Glossario e cartoes laminaveis",
        points: [
          "Glossario de termos tecnicos em linguagem simples.",
          "Cartao de emergencia pessoal: alergias, medicacoes, contatos, tipo sanguineo conhecido.",
          "Cartoes de protocolo: ABC, evacuacao 5/15/60 e mensagem padrao de comunicacao.",
        ],
      },
    ],
    commonMistakes: [
      "Guardar referencia apenas no celular sem copia fisica.",
      "Nao atualizar telefones e enderecos periodicamente.",
      "Treinar no apenas em teoria sem repeticao pratica.",
    ],
  },
];

export const WATER_REFERENCE = [
  { scenario: "Clima ameno, baixa atividade", liters: "2-3 L por pessoa/dia" },
  { scenario: "Clima quente ou atividade moderada", liters: "3-4 L por pessoa/dia" },
  { scenario: "Calor intenso ou esforco alto", liters: "4-6 L por pessoa/dia" },
];

export const VITAL_SIGNS_REFERENCE = [
  { signal: "Respiracao em repouso (adulto)", value: "12-20 irpm" },
  { signal: "Frequencia cardiaca em repouso (adulto)", value: "60-100 bpm" },
  { signal: "Temperatura corporal", value: "36,0 C a 37,5 C" },
  { signal: "Saturacao de O2 (referencia geral)", value: ">= 95% quando sem doenca previa" },
];

export const LAYER_REFERENCE = [
  {
    range: "Frio umido e ventoso",
    strategy: "Base seca + isolamento + camada corta-vento/chuva",
  },
  {
    range: "Frio seco",
    strategy: "Base termica + camada de calor + protecao de extremidades",
  },
  {
    range: "Calor intenso",
    strategy: "Roupa leve respiravel + sombra + hidratacao fracionada",
  },
];

export const DEFAULT_CONTACTS = [
  "Defesa Civil municipal",
  "SAMU / emergencia medica",
  "Corpo de Bombeiros",
  "Hospital de referencia mais proximo",
  "Contato familiar fora da cidade",
];
