import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Empresa } from "@/generated/prisma/client";
import { parseTenantFromHost, getBaseDomain, TenantError } from "@/lib/tenant-parser";

export { parseTenantFromHost, getBaseDomain, TenantError } from "@/lib/tenant-parser";
export type { TenantResolution } from "@/lib/tenant-parser";

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

  // Dev bypass — defina TENANT_BYPASS_SLUG no .env.local para acessar via localhost:3000
  const bypassSlug = process.env.TENANT_BYPASS_SLUG;
  if (bypassSlug && (info.kind === "root" || info.kind === "invalid")) {
    const empresa = await prisma.empresa.findUnique({ where: { slug: bypassSlug } });
    if (empresa) {
      if (empresa.status !== "ATIVA") {
        throw new TenantError(`Tenant ${empresa.slug} esta com status ${empresa.status}`, "INACTIVE");
      }
      return empresa;
    }
  }

  if (info.kind === "invalid" || info.kind === "root") {
    throw new TenantError(`Host invalido para resolucao de tenant: ${info.raw}`, "INVALID_HOST");
  }

  let empresa: Empresa | null = null;
  if (info.kind === "subdomain") {
    empresa = await prisma.empresa.findUnique({ where: { slug: info.slug } });
  } else if (info.kind === "custom") {
    empresa = await prisma.empresa.findUnique({ where: { dominioCustom: info.customDomain } });
  }

  if (!empresa) {
    throw new TenantError(`Tenant nao encontrado para host ${info.raw}`, "NOT_FOUND");
  }

  if (empresa.status !== "ATIVA") {
    throw new TenantError(`Tenant ${empresa.slug} esta com status ${empresa.status}`, "INACTIVE");
  }

  return empresa;
}

export async function resolveTenant(): Promise<{ empresa: Empresa } | Response> {
  try {
    return { empresa: await requireTenant() };
  } catch (err) {
    if (err instanceof TenantError) {
      const status = err.code === "NOT_FOUND" ? 404 : err.code === "INACTIVE" ? 403 : 400;
      return Response.json({ error: err.message }, { status });
    }
    throw err;
  }
}
