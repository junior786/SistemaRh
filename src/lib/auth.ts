import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import type { Empresa, EmpresaUsuario, Role, Usuario } from "@/generated/prisma/client";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "MISSING_TOKEN" | "INVALID_TOKEN" | "USER_INACTIVE" | "NOT_A_MEMBER" | "INSUFFICIENT_ROLE",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type AuthContext = {
  usuario: Usuario;
  membership: EmpresaUsuario;
  empresa: Empresa;
};

async function extractBearerToken(): Promise<string | null> {
  const h = await headers();
  const authorization = h.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7);
}

async function verifyFirebaseBearerToken() {
  const token = await extractBearerToken();
  if (!token) {
    throw new AuthError("Token de autenticacao ausente", "MISSING_TOKEN");
  }

  try {
    return await getFirebaseAuth().verifyIdToken(token);
  } catch {
    throw new AuthError("Token invalido ou expirado", "INVALID_TOKEN");
  }
}

export async function requireExistingAuthenticatedUser(): Promise<{ usuario: Usuario; firebaseUid: string }> {
  const decoded = await verifyFirebaseBearerToken();
  const usuario = await prisma.usuario.findUnique({ where: { firebaseUid: decoded.uid } });

  if (!usuario || !usuario.ativo) {
    throw new AuthError(
      `Usuario nao possui acesso ativo a esta empresa`,
      "NOT_A_MEMBER",
    );
  }

  return { usuario, firebaseUid: decoded.uid };
}

export async function requireTenantMembership(
  empresaId: string,
  rolesPermitidos?: Role[],
): Promise<AuthContext> {
  const decoded = await verifyFirebaseBearerToken();
  const usuario = await prisma.usuario.findUnique({ where: { firebaseUid: decoded.uid } });

  if (!usuario || !usuario.ativo) {
    throw new AuthError(
      `Usuario nao possui acesso ativo a esta empresa`,
      "NOT_A_MEMBER",
    );
  }

  const membership = await prisma.empresaUsuario.findUnique({
    where: { empresaId_usuarioId: { empresaId, usuarioId: usuario.id } },
    include: { empresa: true },
  });

  if (!membership || !membership.ativo) {
    throw new AuthError(
      `Usuario nao possui acesso ativo a esta empresa`,
      "NOT_A_MEMBER",
    );
  }

  if (rolesPermitidos && !rolesPermitidos.includes(membership.role)) {
    throw new AuthError(
      `Role ${membership.role} nao tem permissao para esta acao`,
      "INSUFFICIENT_ROLE",
    );
  }

  return { usuario, membership, empresa: membership.empresa };
}

export function authErrorToResponse(err: AuthError): Response {
  const status =
    err.code === "MISSING_TOKEN" || err.code === "INVALID_TOKEN" ? 401
    : err.code === "USER_INACTIVE" || err.code === "NOT_A_MEMBER" ? 403
    : err.code === "INSUFFICIENT_ROLE" ? 403
    : 401;
  return Response.json({ error: err.message }, { status });
}

export async function resolveAuth(empresaId: string, rolesPermitidos?: Role[]): Promise<AuthContext | Response> {
  try {
    return await requireTenantMembership(empresaId, rolesPermitidos);
  } catch (err) {
    if (err instanceof AuthError) return authErrorToResponse(err);
    throw err;
  }
}
