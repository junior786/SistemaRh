import { prisma } from "@/lib/prisma";

// Implementacao temporaria em single-tenant para viabilizar testes do WhatsApp.
export async function getSingleTenantEmpresa() {
  const empresas = await prisma.empresa.findMany({
    orderBy: { createdAt: "asc" },
    take: 2,
  });

  if (empresas.length === 0) return null;

  if (empresas.length > 1) {
    console.warn(
      "WhatsApp em modo single-tenant encontrou mais de uma empresa; usando o primeiro registro.",
      { empresaIds: empresas.map((empresa) => empresa.id) },
    );
  }

  return empresas[0];
}

// Retorna empresa apenas se todas as 3 credenciais Twilio estiverem preenchidas.
export async function getSingleTenantWhatsappEmpresa() {
  const empresa = await getSingleTenantEmpresa();

  if (
    !empresa?.twilioAccountSid ||
    !empresa?.twilioAuthToken ||
    !empresa?.twilioFromNumber
  ) {
    return null;
  }

  return empresa;
}
