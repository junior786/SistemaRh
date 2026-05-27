import type { Empresa, EmpresaUsuario, Role, Usuario } from "@/generated/prisma/client";
import { resolveTenant } from "@/lib/tenant";
import { resolveAuth } from "@/lib/auth";

export type RequestContext = {
  empresa: Empresa;
  usuario: Usuario;
  membership: EmpresaUsuario;
};

export async function resolveRequestContext(rolesPermitidos?: Role[]): Promise<RequestContext | Response> {
  try {
    const tenantResult = await resolveTenant();
    if (tenantResult instanceof Response) return tenantResult;

    const authResult = await resolveAuth(tenantResult.empresa.id, rolesPermitidos);
    if (authResult instanceof Response) return authResult;

    const { usuario, membership } = authResult;
    return { empresa: tenantResult.empresa, usuario, membership };
  } catch (err) {
    console.error("[resolveRequestContext] erro inesperado:", err);
    return Response.json({ error: "Erro interno de autenticacao" }, { status: 500 });
  }
}
