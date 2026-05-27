import { NextRequest } from "next/server";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { resolveRequestContext } from "@/lib/request-context";
import type { Role } from "@/generated/prisma/client";

const ROLES: Role[] = ["OWNER", "ADMIN", "RECRUITER"];

function canManageRole(actorRole: Role, targetRole: Role) {
  if (actorRole === "OWNER") return true;
  return actorRole === "ADMIN" && targetRole !== "OWNER";
}

function shapeMembership(item: {
  id: string;
  role: Role;
  ativo: boolean;
  createdAt: Date;
  usuario: {
    id: string;
    nome: string;
    email: string;
    ativo: boolean;
  };
}) {
  return {
    id: item.id,
    role: item.role,
    ativo: item.ativo,
    createdAt: item.createdAt,
    usuario: item.usuario,
  };
}

export async function GET() {
  const ctx = await resolveRequestContext(["OWNER", "ADMIN"]);
  if (ctx instanceof Response) return ctx;
  const { empresa } = ctx;

  const memberships = await prisma.empresaUsuario.findMany({
    where: { empresaId: empresa.id },
    include: {
      usuario: {
        select: { id: true, nome: true, email: true, ativo: true },
      },
    },
    orderBy: [
      { role: "asc" },
      { usuario: { nome: "asc" } },
    ],
  });

  return Response.json(memberships.map(shapeMembership));
}

export async function POST(request: NextRequest) {
  const ctx = await resolveRequestContext(["OWNER", "ADMIN"]);
  if (ctx instanceof Response) return ctx;
  const { empresa, membership: actorMembership } = ctx;

  const body = await request.json().catch(() => ({}));
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const senha = String(body.senha ?? "");
  const role = body.role as Role;

  if (!nome || !email || !senha || !ROLES.includes(role)) {
    return Response.json(
      { error: "Nome, e-mail, senha e role sao obrigatorios" },
      { status: 400 },
    );
  }

  if (senha.length < 6) {
    return Response.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });
  }

  if (!canManageRole(actorMembership.role, role)) {
    return Response.json({ error: "Sem permissao para criar usuario com esta role" }, { status: 403 });
  }

  const auth = getFirebaseAuth();
  let firebaseUser;

  try {
    firebaseUser = await auth.getUserByEmail(email);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "auth/user-not-found") throw err;
    firebaseUser = await auth.createUser({
      email,
      password: senha,
      displayName: nome,
      emailVerified: false,
      disabled: false,
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.upsert({
      where: { firebaseUid: firebaseUser.uid },
      create: {
        firebaseUid: firebaseUser.uid,
        nome,
        email,
        ativo: true,
      },
      update: {
        nome,
        email,
        ativo: true,
      },
    });

    const membership = await tx.empresaUsuario.upsert({
      where: { empresaId_usuarioId: { empresaId: empresa.id, usuarioId: usuario.id } },
      create: {
        empresaId: empresa.id,
        usuarioId: usuario.id,
        role,
        ativo: true,
      },
      update: {
        role,
        ativo: true,
      },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, ativo: true },
        },
      },
    });

    return membership;
  });

  return Response.json(shapeMembership(result), { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const ctx = await resolveRequestContext(["OWNER", "ADMIN"]);
  if (ctx instanceof Response) return ctx;
  const { empresa, usuario: actor, membership: actorMembership } = ctx;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "ID e obrigatorio" }, { status: 400 });
  }

  const target = await prisma.empresaUsuario.findFirst({
    where: { id, empresaId: empresa.id },
    include: { usuario: true },
  });

  if (!target) {
    return Response.json({ error: "Usuario nao encontrado nesta empresa" }, { status: 404 });
  }

  if (target.usuarioId === actor.id) {
    return Response.json({ error: "Voce nao pode remover seu proprio acesso" }, { status: 400 });
  }

  if (!canManageRole(actorMembership.role, target.role)) {
    return Response.json({ error: "Sem permissao para remover usuario com esta role" }, { status: 403 });
  }

  if (target.role === "OWNER" && target.ativo) {
    const owners = await prisma.empresaUsuario.count({
      where: { empresaId: empresa.id, role: "OWNER", ativo: true },
    });
    if (owners <= 1) {
      return Response.json({ error: "A empresa precisa manter pelo menos um OWNER ativo" }, { status: 400 });
    }
  }

  await prisma.empresaUsuario.delete({ where: { id } });

  const remainingMemberships = await prisma.empresaUsuario.count({
    where: { usuarioId: target.usuarioId },
  });

  if (remainingMemberships === 0) {
    await prisma.usuario.update({
      where: { id: target.usuarioId },
      data: { ativo: false },
    });
  }

  return Response.json({ ok: true });
}
