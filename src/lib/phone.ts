export function normalizePhoneBR(value: string | null | undefined): string | null {
  if (!value) return null;

  let digits = value.replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");

  if (!digits) return null;

  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
}

// Para casar numeros BR salvos com/sem o "9" da nona posicao do celular.
// Ex: "555184735359" (12 dig) gera tambem "5551984735359" (13 dig).
// Usado em buscas por contains no telefone do candidato.
export function getPhoneMatchVariations(digits: string): string[] {
  const set = new Set<string>();
  if (digits) set.add(digits);

  if (digits.startsWith("55") && digits.length === 12) {
    set.add(`55${digits.slice(2, 4)}9${digits.slice(4)}`);
  }
  if (digits.startsWith("55") && digits.length === 13 && digits[4] === "9") {
    set.add(`55${digits.slice(2, 4)}${digits.slice(5)}`);
  }

  return Array.from(set);
}
