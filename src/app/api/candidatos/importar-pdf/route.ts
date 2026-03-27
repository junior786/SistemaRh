import { NextRequest } from "next/server";
import { extrairDadosPDF } from "@/services/extracao-pdf";
import { extractTextFromPDF } from "@/lib/pdf-extract";

// POST /api/candidatos/importar-pdf — RN-02: extrai dados do PDF para revisão
// Retorna o rascunho para o RH revisar antes de salvar
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("pdf") as File | null;

  if (!file) {
    return Response.json({ error: "Nenhum arquivo PDF enviado" }, { status: 400 });
  }

  // Extrai texto do PDF
  const buffer = Buffer.from(await file.arrayBuffer());
  let textoPDF: string;

  try {
    textoPDF = await extractTextFromPDF(buffer);
  } catch (err) {
    console.error("Erro ao parsear PDF:", err);
    return Response.json({ error: "Não foi possível ler o PDF" }, { status: 400 });
  }

  if (!textoPDF.trim()) {
    return Response.json({ error: "PDF sem texto extraível (pode ser imagem)" }, { status: 400 });
  }

  try {
    const dados = await extrairDadosPDF(textoPDF);
    return Response.json({ dados, status: "rascunho" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return Response.json({ error: `Falha na extração: ${message}` }, { status: 500 });
  }
}
