// IA Assistente WhatsApp — RF-13
// Gera respostas automáticas em nome da empresa
// Usa modelo via OpenRouter

interface DadosEmpresa {
  nome: string;
  iaPersona: string | null;
  iaTomVoz: string | null;
  iaFAQ: string | null;
  iaBlocklist: string | null;
}

interface DadosCandidato {
  nome: string;
  jobType: string;
  cidade: string | null;
  resumo: string | null;
  skills: string[];
  areas: string[];
  restricoes: string[];
  ultimaExperiencia: { empresa: string; cargo: string } | null;
}

interface DadosVagaResumo {
  titulo: string;
  area: string;
  modalidade: string;
  localizacao: string;
  salarioMin: number | null;
  salarioMax: number | null;
}

interface DadosVagaAtual extends DadosVagaResumo {
  regime: string;
  descricao: string;
  etapaAtual: string | null; // nome da etapa atual da triagem (se houver)
}

interface DadosEntrevista {
  dataHora: Date;
  entrevistador: string;
  vagaTitulo: string;
}

interface MensagemHistorico {
  direcao: "ENVIADA" | "RECEBIDA";
  conteudo: string;
}

export interface ContextoIA {
  empresa: DadosEmpresa;
  candidato: DadosCandidato;
  vagaAtual: DadosVagaAtual | null;
  vagasAbertas: DadosVagaResumo[];
  proximaEntrevista: DadosEntrevista | null;
  historico: MensagemHistorico[];
  mensagemAtual: string;
}

function formatarSalario(min: number | null, max: number | null): string {
  if (min === null && max === null) return "não informada";
  if (min !== null && max !== null) return `R$ ${min} a R$ ${max}`;
  return `R$ ${min ?? max}`;
}

function blocoCandidato(c: DadosCandidato): string {
  const linhas = [
    `- Nome: ${c.nome}`,
    `- Cargo pretendido: ${c.jobType}`,
    c.cidade ? `- Cidade: ${c.cidade}` : null,
    c.areas.length > 0 ? `- Áreas: ${c.areas.join(", ")}` : null,
    c.skills.length > 0 ? `- Skills: ${c.skills.join(", ")}` : null,
    c.ultimaExperiencia
      ? `- Última experiência: ${c.ultimaExperiencia.cargo} na ${c.ultimaExperiencia.empresa}`
      : null,
    c.restricoes.length > 0 ? `- Restrições/observações: ${c.restricoes.join("; ")}` : null,
    c.resumo ? `- Resumo: ${c.resumo}` : null,
  ];
  return linhas.filter(Boolean).join("\n");
}

function blocoVagaAtual(v: DadosVagaAtual): string {
  return [
    `- Título: ${v.titulo}`,
    `- Área: ${v.area}`,
    `- Regime: ${v.regime}`,
    `- Modalidade: ${v.modalidade}`,
    `- Localização: ${v.localizacao}`,
    `- Faixa salarial: ${formatarSalario(v.salarioMin, v.salarioMax)}`,
    v.etapaAtual ? `- Etapa atual do candidato: ${v.etapaAtual}` : null,
    `- Descrição: ${v.descricao}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function blocoVagasAbertas(vagas: DadosVagaResumo[]): string {
  if (vagas.length === 0) return "Nenhuma outra vaga aberta no momento.";
  return vagas
    .map(
      (v, i) =>
        `${i + 1}. ${v.titulo} (${v.area}, ${v.modalidade}, ${v.localizacao}, salário ${formatarSalario(v.salarioMin, v.salarioMax)})`,
    )
    .join("\n");
}

function blocoProximaEntrevista(e: DadosEntrevista): string {
  return `- Vaga: ${e.vagaTitulo}\n- Data/hora: ${e.dataHora.toLocaleString("pt-BR")}\n- Entrevistador: ${e.entrevistador}`;
}

function montarSystemPrompt(ctx: ContextoIA): string {
  const { empresa, candidato, vagaAtual, vagasAbertas, proximaEntrevista, historico } = ctx;

  const tom = empresa.iaTomVoz ?? "cordial e profissional";
  const persona =
    empresa.iaPersona ??
    `assistente virtual de RH da empresa "${empresa.nome}"`;

  const partes: string[] = [];

  partes.push(`Você é ${persona}.`);
  partes.push(`Adote sempre tom ${tom}.`);
  partes.push(
    `Nunca diga que é uma IA — apresente-se como assistente da ${empresa.nome}.`,
  );
  partes.push(
    `Responda de forma curta e objetiva. Se não souber, diga que vai verificar e que o RH entrará em contato.`,
  );
  partes.push(
    `Nunca exponha dados de outros candidatos. Não revele informações internas como scores, análises ou observações do RH.`,
  );

  if (empresa.iaFAQ) {
    partes.push(`\nFAQ DA EMPRESA (use como referência ao responder):\n${empresa.iaFAQ}`);
  }

  if (empresa.iaBlocklist) {
    partes.push(`\nTÓPICOS PROIBIDOS (não responder, redirecionar pro RH):\n${empresa.iaBlocklist}`);
  }

  partes.push(`\nCANDIDATO:\n${blocoCandidato(candidato)}`);

  if (vagaAtual) {
    partes.push(`\nVAGA EM QUE O CANDIDATO ESTÁ EM PROCESSO:\n${blocoVagaAtual(vagaAtual)}`);
  } else {
    partes.push(`\nO candidato não está em processo seletivo ativo no momento.`);
  }

  partes.push(`\nOUTRAS VAGAS ABERTAS NA EMPRESA:\n${blocoVagasAbertas(vagasAbertas)}`);

  if (proximaEntrevista) {
    partes.push(`\nPRÓXIMA ENTREVISTA AGENDADA:\n${blocoProximaEntrevista(proximaEntrevista)}`);
  }

  const histTexto = historico
    .map((m) => `${m.direcao === "ENVIADA" ? "Assistente" : "Candidato"}: ${m.conteudo}`)
    .join("\n");
  partes.push(
    `\nHISTÓRICO RECENTE DA CONVERSA:\n${histTexto || "(sem histórico anterior)"}`,
  );

  return partes.join("\n");
}

export async function gerarRespostaIA(ctx: ContextoIA): Promise<string> {
  const model = process.env.MODEL_ASSISTENTE_WHATS ?? "deepseek/deepseek-chat";
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

  const messages = [
    { role: "system" as const, content: montarSystemPrompt(ctx) },
    { role: "user" as const, content: ctx.mensagemAtual },
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "RH Selector",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
