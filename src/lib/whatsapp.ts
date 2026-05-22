// WhatsApp via Twilio — Client
// SDK oficial twilio v6
// Tokens nunca expostos ao cliente

import twilio, { Twilio } from "twilio";

export type MensagemStatusEnum = "ENVIADA" | "ENTREGUE" | "LIDA" | "FALHA";

export interface TwilioInboundMessage {
  messageSid: string;
  from: string; // whatsapp:+E164
  to: string;   // whatsapp:+E164
  body: string;
  profileName?: string;
  waId?: string;
  numMedia: number;
}

export interface TwilioStatusUpdate {
  messageSid: string;
  status: string; // queued | sent | delivered | read | failed | undelivered
  to?: string;
  from?: string;
  errorCode?: string;
  errorMessage?: string;
}

// ─────────────────────────────────────────────
// CLIENTE
// ─────────────────────────────────────────────

export function getTwilioClient(accountSid: string, authToken: string): Twilio {
  return twilio(accountSid, authToken);
}

// Aceita "+55 51 9...", "5511...", "11...", já com prefixo "whatsapp:"
// e devolve "whatsapp:+E164" sem espaços/pontuação.
export function formatWhatsAppAddress(phone: string): string {
  const trimmed = phone.trim();
  const withoutPrefix = trimmed.startsWith("whatsapp:")
    ? trimmed.slice("whatsapp:".length)
    : trimmed;
  const digits = withoutPrefix.replace(/\D/g, "");
  if (!digits) return trimmed;
  return `whatsapp:+${digits}`;
}

// ─────────────────────────────────────────────
// ENVIO
// ─────────────────────────────────────────────

export async function sendTextMessage(
  client: Twilio,
  from: string,
  to: string,
  body: string,
): Promise<string> {
  const msg = await client.messages.create({
    from: formatWhatsAppAddress(from),
    to: formatWhatsAppAddress(to),
    body,
  });
  return msg.sid;
}

// Envia template aprovado (ContentSid + ContentVariables).
// variables: map indexado por posicao começando em "1" (ex: {"1": "12/1", "2": "3pm"}).
export async function sendTemplateMessage(
  client: Twilio,
  from: string,
  to: string,
  contentSid: string,
  variables?: Record<string, string>,
): Promise<string> {
  const msg = await client.messages.create({
    from: formatWhatsAppAddress(from),
    to: formatWhatsAppAddress(to),
    contentSid,
    ...(variables && Object.keys(variables).length > 0
      ? { contentVariables: JSON.stringify(variables) }
      : {}),
  });
  return msg.sid;
}

// ─────────────────────────────────────────────
// WEBHOOK
// ─────────────────────────────────────────────

export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}

// Twilio POSTa form-urlencoded. Esta funcao recebe o map ja parseado.
export function parseTwilioInboundForm(
  params: Record<string, string>,
): TwilioInboundMessage | null {
  if (!params.MessageSid || !params.From || !params.To) return null;
  // Status updates trazem MessageStatus mas nao trazem Body inbound real
  if (params.MessageStatus && !params.Body) return null;

  return {
    messageSid: params.MessageSid,
    from: params.From,
    to: params.To,
    body: params.Body ?? "",
    profileName: params.ProfileName,
    waId: params.WaId,
    numMedia: Number(params.NumMedia ?? "0") || 0,
  };
}

export function parseTwilioStatusForm(
  params: Record<string, string>,
): TwilioStatusUpdate | null {
  if (!params.MessageSid || !params.MessageStatus) return null;
  return {
    messageSid: params.MessageSid,
    status: params.MessageStatus,
    to: params.To,
    from: params.From,
    errorCode: params.ErrorCode,
    errorMessage: params.ErrorMessage,
  };
}

// Reconstroi a URL absoluta esperada pelo Twilio para validacao da assinatura.
// Usa WHATSAPP_WEBHOOK_BASE_URL para evitar problemas com proxies/tunnels.
export function buildWebhookUrl(pathname: string, search: string = ""): string {
  const base = process.env.WHATSAPP_WEBHOOK_BASE_URL?.replace(/\/+$/, "") ?? "";
  return `${base}${pathname}${search}`;
}

// ─────────────────────────────────────────────
// JANELA DE 24H (RN-06)
// ─────────────────────────────────────────────

export function isWithin24hWindow(lastIncomingAt: Date | null): boolean {
  if (!lastIncomingAt) return false;
  const diffMs = Date.now() - lastIncomingAt.getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return diffMs < twentyFourHoursMs;
}

// Mapeia status do Twilio para o enum do Prisma.
export function mapTwilioStatus(status: string): MensagemStatusEnum {
  switch (status) {
    case "queued":
    case "sending":
    case "sent":
    case "accepted":
      return "ENVIADA";
    case "delivered":
      return "ENTREGUE";
    case "read":
      return "LIDA";
    case "failed":
    case "undelivered":
      return "FALHA";
    default:
      return "ENVIADA";
  }
}
