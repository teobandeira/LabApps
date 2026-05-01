import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LATEST_GPT_IMAGE_MODEL = "gpt-image-1.5";

type AcessorioData = {
  file: File;
  medidas: string | null;
  posicao: string | null;
  corLabel: string | null;
  corHex: string | null;
};

export async function POST(req: Request) {
  const formData = await req.formData();

  const produtoImage = formData.get("image") as File | null;

  const usarPromptPersonalizadoRaw = formData.get("usarPromptPersonalizado") as
    | string
    | null;
  const promptPersonalizadoRaw = formData.get("promptPersonalizado") as
    | string
    | null;

  const usarPromptPersonalizado = usarPromptPersonalizadoRaw === "1";
  const promptPersonalizado = promptPersonalizadoRaw
    ? promptPersonalizadoRaw.trim()
    : null;

  const medidasRaw = formData.get("medidas") as string | null;
  const ambienteRaw = formData.get("ambiente") as string | null;
  const corLabelPrincipalRaw = formData.get("corLabelPrincipal") as
    | string
    | null;
  const corHexPrincipalRaw = formData.get("corHexPrincipal") as string | null;
  const instrucoesRaw = formData.get("instrucoes") as string | null;

  const medidas = medidasRaw ? medidasRaw.trim() : null;
  const ambiente = ambienteRaw ? ambienteRaw.trim() : null;
  const corLabelPrincipal = corLabelPrincipalRaw
    ? corLabelPrincipalRaw.trim()
    : null;
  const corHexPrincipal = corHexPrincipalRaw ? corHexPrincipalRaw.trim() : null;
  const instrucoes = instrucoesRaw ? instrucoesRaw.trim() : null;

  if (usarPromptPersonalizado) {
    if (!promptPersonalizado)
      return NextResponse.json(
        { error: "É necessário fornecer o prompt personalizado." },
        { status: 400 },
      );
  } else {
    if (!ambiente)
      return NextResponse.json(
        { error: "É necessário fornecer o ambiente." },
        { status: 400 },
      );
    if (!medidas)
      return NextResponse.json(
        { error: "É necessário fornecer as medidas do produto." },
        { status: 400 },
      );
  }

  // acessorios
  const acessorios: AcessorioData[] = [];
  const imageFilesForModel: File[] = [];

  if (produtoImage) {
    console.log(
      "📄 Arquivo recebido:",
      produtoImage.name,
      produtoImage.type,
      produtoImage.size,
    );

    if (!ALLOWED_TYPES.includes(produtoImage.type))
      return NextResponse.json(
        {
          error:
            "Formato de imagem inválido para o produto principal. Utilize PNG, JPG ou WEBP.",
        },
        { status: 400 },
      );

    const mainArrayBuffer = await produtoImage.arrayBuffer();
    const mainBuffer = Buffer.from(mainArrayBuffer);

    const mainImageFile = await toFile(
      mainBuffer,
      produtoImage.name || "produto_principal.png",
      {
        type: produtoImage.type || "image/png",
      },
    );

    imageFilesForModel.push(mainImageFile);
  }

  // pega ate 15 acessorios do formdata
  for (let i = 0; i < 15; i++) {
    const file = formData.get(`acessorio_image_${i}`) as File | null;
    if (!file) continue;

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Formato de imagem inválido no acessório ${i + 1}.` },
        { status: 400 },
      );
    }

    const medidasAcessorio = formData.get(`acessorio_medidas_${i}`) as
      | string
      | null;
    const posicaoAcessorio = formData.get(`acessorio_posicao_${i}`) as
      | string
      | null;
    const corLabelAcessorio = formData.get(`acessorio_corLabel_${i}`) as
      | string
      | null;
    const corHexAcessorio = formData.get(`acessorio_corHex_${i}`) as
      | string
      | null;

    console.log(`📄 Arquivo de acessório ${i + 1} recebido:`, file.name);

    const acessorioArrayBuffer = await file.arrayBuffer();
    const acessorioBuffer = Buffer.from(acessorioArrayBuffer);

    const acessorioImageFile = await toFile(
      acessorioBuffer,
      file.name || `acessorio_${i + 1}.png`,
      { type: file.type },
    );

    imageFilesForModel.push(acessorioImageFile);

    acessorios.push({
      file,
      medidas: medidasAcessorio?.trim() || null,
      posicao: posicaoAcessorio?.trim() || null,
      corLabel: corLabelAcessorio?.trim() || null,
      corHex: corHexAcessorio?.trim() || null,
    });
  }

  console.log(`🔢 Total de acessórios recebidos: ${acessorios.length}`);

  let prompt = "";

  if (usarPromptPersonalizado) {
    // usa exatamente o que o user digitou
    prompt = promptPersonalizado!;
  } else {
    // prompt padrão
    prompt = `
Você é um especialista em composição visual, manipulação realista de produtos
e geração de imagens hiper-realistas utilizando entradas visuais múltiplas.

Sua tarefa é:
1. Utilizar todas as imagens enviadas (produto principal e acessórios);
2. Reproduzir o produto principal com FIDELIDADE ABSOLUTA — forma, materiais, proporções e identidade visual;
3. Aplicar personalizações solicitadas pelo usuário (cor, detalhes, acessórios adicionais, posição, etc.) sempre mantendo realismo e integridade do produto;
4. Integrar o produto e os acessórios em um AMBIENTE REALISTA de ${ambiente};
5. Compor uma cena natural, coerente e proporcional, preservando as características originais dos itens.

Regras gerais obrigatórias:
- Nunca altere o design estrutural dos produtos.
- Nunca distorça, estique ou modifique fisicamente qualquer item.
- Ajustes de cor devem preservar textura, brilho e material reais.
- A proporção entre todos os objetos deve ser respeitada.
- A iluminação deve ser compatível com o ambiente escolhido.
- Os acessórios devem ser incorporados de forma coerente à cena e ao produto principal.
`.trim();

    if (medidas) {
      prompt += `\n\nMedidas reais do produto principal: ${medidas} (Largura x Altura x Profundidade). Mantenha rigor total nas proporções.`;
    }

    if (corLabelPrincipal || corHexPrincipal) {
      prompt += `\n\nAjuste de cor do produto principal (se possível manter realismo):`;
      if (corLabelPrincipal) {
        prompt += `\n- Descrição da área a alterar: ${corLabelPrincipal}.`;
      }
      if (corHexPrincipal) {
        prompt += `\n- Cor desejada (hex): ${corHexPrincipal}.`;
      }
      prompt += `\nNão altere outras partes do produto nem afete sua identidade visual.`;
    }

    if (acessorios.length > 0) {
      prompt += `\n\nAcessórios adicionais (${acessorios.length} item(ns)):\n`;

      acessorios.forEach((ac, i) => {
        prompt += `\nAcessório ${i + 1}:`;

        if (ac.medidas) {
          prompt += `\n- Medidas: ${ac.medidas} (Largura x Altura x Profundidade).`;
        }
        if (ac.posicao) {
          prompt += `\n- Posição desejada na cena: ${ac.posicao}.`;
        }
        if (ac.corLabel || ac.corHex) {
          prompt += `\n- Ajuste de cor (se for coerente visualmente):`;
          if (ac.corLabel) {
            prompt += `\n  • Área a alterar: ${ac.corLabel}.`;
          }
          if (ac.corHex) {
            prompt += `\n  • Cor desejada (hex): ${ac.corHex}.`;
          }
        }

        prompt += `\n- Integre este acessório de forma natural no ambiente, mantendo proporções e realismo.`;
      });
    }

    if (instrucoes) {
      prompt += `\n\nInstruções adicionais do usuário:\n${instrucoes}`;
    }

    prompt += `
    
Regras finais:
- O produto principal deve ser o elemento central e mais importante da composição.
- Os acessórios devem complementar o cenário sem roubar o foco do produto principal.
- Não gere texto, logos, marcas d'água ou elementos artificiais na imagem.
`.trim();
  }

  console.log(
    `📝 Prompt gerado (${usarPromptPersonalizado ? "CUSTOM" : "PADRÃO"}):`,
    prompt,
  );

  try {
    const response =
      imageFilesForModel.length > 0
        ? await openai.images.edit({
            model: LATEST_GPT_IMAGE_MODEL,
            image: imageFilesForModel,
            prompt,
            input_fidelity: "high",
            size: "1024x1024",
            output_format: "png",
          })
        : await openai.images.generate({
            model: LATEST_GPT_IMAGE_MODEL,
            prompt,
            size: "1024x1024",
            output_format: "png",
          });

    const base64 = response?.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("Nenhuma imagem retornada pela API de imagem.");
    }

    console.log("🖼️ base64 length:", base64?.length);
    return NextResponse.json(
      { image: `data:image/png;base64,${base64}` },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Erro na API do ChatGPT:", error);
    const status =
      typeof error === "object" && error !== null
        ? Number(
            (error as { status?: unknown; response?: { status?: unknown } }).status ??
              (error as { response?: { status?: unknown } }).response?.status,
          ) || undefined
        : undefined;
    const code =
      typeof error === "object" && error !== null
        ? String(
            (error as { code?: unknown; error?: { code?: unknown } }).code ??
              (error as { error?: { code?: unknown } }).error?.code ??
              "",
          ) || undefined
        : undefined;
    const type =
      typeof error === "object" && error !== null
        ? String(
            (error as { type?: unknown; error?: { type?: unknown } }).type ??
              (error as { error?: { type?: unknown } }).error?.type ??
              "",
          ) || undefined
        : undefined;

    if (
      code === "billing_hard_limit_reached" ||
      type === "billing_limit_user_error"
    ) {
      return NextResponse.json(
        {
          error: "Oops, créditos insuficientes para realizar a requisição.",
          code,
        },
        { status: 400 },
      );
    }

    if (status === 429 && code === "insufficient_quota") {
      return NextResponse.json(
        {
          error: "Oops, créditos insuficientes para realizar a requisição.",
          code,
        },
        { status: 429 },
      );
    }

    if (status === 429) {
      return NextResponse.json(
        {
          error: "Muitas requisições no momento. Tente novamente em instantes.",
          code,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Erro ao gerar ambientação.", code },
      { status: status || 500 },
    );
  }
}
