import { prisma } from "@/lib/prisma";
import { resolveTenant } from "@/lib/tenant";
import { AuthError, authErrorToResponse, requireExistingAuthenticatedUser } from "@/lib/auth";

// GET /api/auth/me — retorna usuário autenticado e seu membership na empresa atual
export async function GET() {
  let usuario, firebaseUid;
  try {
    ({ usuario, firebaseUid } = await requireExistingAuthenticatedUser());
  } catch (err) {
    if (err instanceof AuthError) return authErrorToResponse(err);
    throw err;
  }

  const tenantResult = await resolveTenant();
  if (tenantResult instanceof Response) return tenantResult;
  const { empresa } = tenantResult;

  const membership = await prisma.empresaUsuario.findUnique({
    where: { empresaId_usuarioId: { empresaId: empresa.id, usuarioId: usuario.id } },
  });

  if (!membership || !membership.ativo) {
    return Response.json(
      { error: "Usuario nao possui acesso ativo a esta empresa" },
      { status: 403 },
    );
  }

  return Response.json({
    usuario: {
      id: usuario.id,
      firebaseUid,
      nome: usuario.nome,
      email: usuario.email,
      ativo: usuario.ativo,
    },
    empresa: {
      id: empresa.id,
      slug: empresa.slug,
      nome: empresa.nome,
      status: empresa.status,
    },
    membership: { role: membership.role, ativo: membership.ativo },
  });
}
