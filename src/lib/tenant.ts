import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Empresa } from "@/generated/prisma/client";

export type TenantResolution =
  | { kind: "subdomain"; slug: string; raw: string }
  | { kind: "custom"; customDomain: string; raw: string }
  | { kind: "root"; raw: string }
  | { kind: "invalid"; raw: string };

export class TenantError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_HOST" | "NOT_FOUND" | "INACTIVE",
  ) {
    super(message);
    this.name = "TenantError";
  }
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function getBaseDomain(): string {
  return (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "localhost").toLowerCase();
}

function stripPort(host: string): string {
  const idx = host.lastIndexOf(":");
  return idx === -1 ? host : host.slice(0, idx);
}

function stripLeadingWww(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : host;
}

export function parseTenantFromHost(
  rawHost: string | null | undefined,
  baseDomain: string = getBaseDomain(),
): TenantResolution {
  const raw = (rawHost ?? "").toLowerCase().trim();
  if (!raw) return { kind: "invalid", raw };

  const host = stripPort(raw);
  const base = baseDomain.toLowerCase();
  const noWww = stripLeadingWww(host);

  if (host === base || noWww === base) {
    return { kind: "root", raw };
  }

  if (host.endsWith(`.${base}`)) {
    const sub = host.slice(0, -(base.length + 1));
    const normalized = stripLeadingWww(sub);
    if (!normalized || normalized.includes(".")) {
      return { kind: "invalid", raw };
    }
    if (!SLUG_PATTERN.test(normalized)) {
      return { kind: "invalid", raw };
    }
    return { kind: "subdomain", slug: normalized, raw };
  }

  if (!host.includes(".")) {
    return { kind: "invalid", raw };
  }

  return { kind: "custom", customDomain: host, raw };
}

async function readHostFromRequest(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-host") ?? h.get("host");
}

export const getTenantFromRequest = cache(async (): Promise<Empresa | null> => {
  const host = await readHostFromRequest();
  const info = parseTenantFromHost(host);

  if (info.kind === "subdomain") {
    return prisma.empresa.findUnique({ where: { slug: info.slug } });
  }

  if (info.kind === "custom") {
    return prisma.empresa.findUnique({ where: { dominioCustom: info.customDomain } });
  }

  return null;
});

export async function requireTenant(): Promise<Empresa> {
  const host = await readHostFromRequest();
  const info = parseTenantFromHost(host);

  if (info.kind === "invalid" || info.kind === "root") {
    throw new TenantError(`Host invalido para resolucao de tenant: ${info.raw}`, "INVALID_HOST");
  }

  const empresa = await getTenantFromRequest();
  if (!empresa) {
    throw new TenantError(`Tenant nao encontrado para host ${info.raw}`, "NOT_FOUND");
  }

  if (empresa.status !== "ATIVA") {
    throw new TenantError(
      `Tenant ${empresa.slug} esta com status ${empresa.status}`,
      "INACTIVE",
    );
  }

  return empresa;
}
