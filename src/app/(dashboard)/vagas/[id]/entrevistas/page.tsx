import { VagaAgendaSection } from "@/components/entrevistas/vaga-agenda-section";

export default async function VagaEntrevistasPage({
  params,
}: PageProps<"/vagas/[id]/entrevistas">) {
  const { id } = await params;

  return <VagaAgendaSection vagaId={id} mode="page" />;
}
