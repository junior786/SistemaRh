// Extrai texto de um PDF usando unpdf (server-side)
import { extractText } from "unpdf";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const { text } = await extractText(data);
  return text.join("\n\n");
}
