"use client";
import { apiFetch } from "@/lib/api-fetch";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { normalizePhoneBR } from "@/lib/phone";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Briefcase,
  GraduationCap,
  Calendar,
  User,
  AlertTriangle,
  StickyNote,
  Save,
  MessageCircle,
  Clock3,
  ArrowRight,
} from "lucide-react";

interface Skill {
  nome: string;
}

interface Experiencia {
  id: string;
  empresa: string;
  cargo: string;
  descricao: string | null;
  dataInicio: string;
  dataFim: string | null;
  atual: boolean;
}

interface Formacao {
  id: string;
  instituicao: string;
  curso: string;
  nivel: string;
  dataInicio: string;
  dataFim: string | null;
  atual: boolean;
}

interface Triagem {
  id: string;
  score: number | null;
  status: string;
  desatualizado: boolean;
  vaga: { id: string; titulo: string; area: string; status: string };
  eventos?: { tipo: string; descricao: string }[];
}

interface Restricao {
  id: string;
  descricao: string;
}

interface Candidato {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  cep: string | null;
  genero: string | null;
  resumo: string | null;
  jobType: string;
  pretensaoSalarial: number | null;
  observacao: string | null;
  statusEmprego: string;
  contratadoEm: string | null;
  vagaEmpregado: { id: string; titulo: string; area: string } | null;
  skills: Skill[];
  experiencias: Experiencia[];
  formacoes: Formacao[];
  triagens: Triagem[];
  restricoes: Restricao[];
  timeline: {
    id: string;
    tipo: "OBSERVACAO" | "MENSAGEM" | "ENTREVISTA" | "EVENTO_TRIAGEM";
    titulo: string;
    descricao: string;
    createdAt: string;
    href: string | null;
    metadata: {
      direcao?: string;
      status?: string;
      geradaPorIA?: boolean;
      resultado?: string | null;
      origem?: string;
      vagaId?: string;
      vagaTitulo?: string;
    } | null;
  }[];
}

const statusEmpregoMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  DISPONIVEL: { label: "Disponível", variant: "default" },
  EMPREGADO: { label: "Empregado", variant: "secondary" },
  INATIVO: { label: "Inativo", variant: "destructive" },
};

const nivelLabels: Record<string, string> = {
  TECNICO: "Técnico",
  GRADUACAO: "Graduação",
  POS_GRADUACAO: "Pós-graduação",
  MBA: "MBA",
  MESTRADO: "Mestrado",
  DOUTORADO: "Doutorado",
  CURSO_LIVRE: "Curso Livre",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function calcTempo(inicio: string, fim: string | null): string {
  const d1 = new Date(inicio);
  const d2 = fim ? new Date(fim) : new Date();
  const meses = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  if (anos === 0) return `${m} meses`;
  if (m === 0) return `${anos} ano${anos > 1 ? "s" : ""}`;
  return `${anos} ano${anos > 1 ? "s" : ""} e ${m} meses`;
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timelineLabel(tipo: Candidato["timeline"][number]["tipo"]) {
  if (tipo === "MENSAGEM") return "Mensagem";
  if (tipo === "ENTREVISTA") return "Entrevista";
  if (tipo === "EVENTO_TRIAGEM") return "Triagem";
  return "Observacao";
}

function timelineBadgeClass(tipo: Candidato["timeline"][number]["tipo"]) {
  if (tipo === "MENSAGEM") return "border-sky-500/30 bg-sky-500/10 text-sky-700";
  if (tipo === "ENTREVISTA") return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  if (tipo === "EVENTO_TRIAGEM") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  return "border-primary/30 bg-primary/10 text-primary";
}

function triagemStatusLabel(triagem: Triagem) {
  if (triagem.status === "PENDENTE") return "Analise pendente";
  if (triagem.status === "PROCESSANDO") return "Analisando";
  if (triagem.status === "ERRO") return "Erro na analise";
  if (triagem.score != null) return `${triagem.score}% de compatibilidade`;
  return triagem.status;
}

export default function PerfilCandidatoPage() {
  const params = useParams();
  const candidatoId = params.id as string;
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [loading, setLoading] = useState(true);
  const [obsEdit, setObsEdit] = useState("");
  const [obsEditing, setObsEditing] = useState(false);
  const [obsSaving, setObsSaving] = useState(false);

  useEffect(() => {
    apiFetch(`/api/candidatos/${candidatoId}`)
      .then((r) => r.json())
      .then((data) => {
        setCandidato(data);
        setObsEdit(data.observacao || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [candidatoId]);

  async function salvarObservacao() {
    setObsSaving(true);
    try {
      await apiFetch(`/api/candidatos/${candidatoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacao: obsEdit || null }),
      });
      setCandidato((c) => {
        if (!c) return c;

        const timelineSemObservacao = c.timeline.filter((item) => item.tipo !== "OBSERVACAO");
        const timelineAtualizada = obsEdit
          ? [
              {
                id: `observacao-${c.id}`,
                tipo: "OBSERVACAO" as const,
                titulo: "Observacao do RH",
                descricao: obsEdit,
                createdAt: new Date().toISOString(),
                href: `/candidatos/${c.id}`,
                metadata: null,
              },
              ...timelineSemObservacao,
            ]
          : timelineSemObservacao;

        return {
          ...c,
          observacao: obsEdit || null,
          timeline: timelineAtualizada.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        };
      });
      setObsEditing(false);
    } catch {
      toast.error("Erro ao salvar observação");
    } finally {
      setObsSaving(false);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!candidato) return <p className="text-muted-foreground">Candidato não encontrado.</p>;

  const mensagensCount = candidato.timeline.filter((item) => item.tipo === "MENSAGEM").length;
  const entrevistasCount = candidato.timeline.filter((item) => item.tipo === "ENTREVISTA").length;
  const triagensOperacionais = candidato.triagens.filter((triagem) =>
    !triagem.eventos?.some((evento) => evento.tipo === "OUTRAS_TRIAGENS_ENCERRADAS"));
  const ultimaAtividade = candidato.timeline[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{candidato.nome}</h2>
            <Badge variant="outline" className="text-xs">{candidato.jobType}</Badge>
            <Badge variant={statusEmpregoMap[candidato.statusEmprego]?.variant ?? "secondary"} className="text-xs">
              {statusEmpregoMap[candidato.statusEmprego]?.label ?? candidato.statusEmprego}
            </Badge>
            {candidato.vagaEmpregado && (
              <Link
                href={`/vagas/${candidato.vagaEmpregado.id}`}
                className="text-xs text-primary hover:underline"
              >
                Contratado em {candidato.vagaEmpregado.titulo}
                {candidato.contratadoEm && (
                  <span className="text-muted-foreground ml-1">
                    ({new Date(candidato.contratadoEm).toLocaleDateString("pt-BR")})
                  </span>
                )}
              </Link>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {candidato.email}
            </span>
            {candidato.telefone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {normalizePhoneBR(candidato.telefone)}
              </span>
            )}
            {candidato.cidade && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {candidato.cidade}
              </span>
            )}
            {candidato.cep && (
              <span className="text-xs">CEP: {candidato.cep}</span>
            )}
            {candidato.genero && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {candidato.genero}
              </span>
            )}
            {candidato.pretensaoSalarial && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> R${" "}
                {candidato.pretensaoSalarial.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/candidatos/${candidatoId}/mensagens`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5", !candidato.telefone && "pointer-events-none opacity-50")}
            title={!candidato.telefone ? "Candidato sem telefone cadastrado" : "Conversa WhatsApp"}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Link>
          <Link href={`/candidatos/${candidatoId}/editar`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Editar
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="font-semibold">Centro operacional</h3>
              <p className="text-sm text-muted-foreground">
                Mensagens, entrevistas e vagas em andamento reunidas em um ponto de acao.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/candidatos/${candidatoId}/mensagens`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5", !candidato.telefone && "pointer-events-none opacity-50")}
                title={!candidato.telefone ? "Candidato sem telefone cadastrado" : "Conversa WhatsApp"}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Link>
              <Link
                href={`/candidatos/${candidatoId}/editar`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Editar cadastro
              </Link>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Mensagens</p>
              <p className="mt-2 text-2xl font-semibold">{mensagensCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Entrevistas</p>
              <p className="mt-2 text-2xl font-semibold">{entrevistasCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Triagens ativas</p>
              <p className="mt-2 text-2xl font-semibold">{triagensOperacionais.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Ultima atividade</p>
              <p className="mt-2 text-sm font-medium">
                {ultimaAtividade ? timelineLabel(ultimaAtividade.tipo) : "Sem historico"}
              </p>
              {ultimaAtividade && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(ultimaAtividade.createdAt)}
                </p>
              )}
            </div>
          </div>

          {triagensOperacionais.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Nenhuma vaga ativa vinculada no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {triagensOperacionais.map((triagem) => (
                <div key={`operacao-${triagem.id}`} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{triagem.vaga.titulo}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {triagem.vaga.area}
                        </Badge>
                        {triagem.desatualizado && (
                          <Badge variant="secondary" className="text-[10px]">
                            Desatualizado
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {triagemStatusLabel(triagem)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/vagas/${triagem.vaga.id}/triagem`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                      >
                        <Briefcase className="h-4 w-4" />
                        Abrir triagem
                      </Link>
                      <Link
                        href={`/vagas/${triagem.vaga.id}/triagem/${candidato.id}/entrevistas`}
                        className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
                      >
                        <Calendar className="h-4 w-4" />
                        Agendar entrevista
                      </Link>
                      <Link
                        href={`/vagas/${triagem.vaga.id}/entrevistas`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                      >
                        Agenda da vaga
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      {candidato.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {candidato.skills.map((s) => (
            <Badge key={s.nome} variant="secondary">
              {s.nome}
            </Badge>
          ))}
        </div>
      )}

      {/* Resumo */}
      {candidato.resumo && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-2 font-semibold">Resumo</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {candidato.resumo}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Restrições */}
      {candidato.restricoes.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Restrições / Informações Relevantes
            </h3>
            <div className="space-y-1.5">
              {candidato.restricoes.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 rounded-md bg-warning/5 px-3 py-2">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  <span className="text-sm">{r.descricao}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações — editável inline */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <StickyNote className="h-4 w-4 text-primary" />
              Observações do RH
            </h3>
            {!obsEditing ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setObsEditing(true)}
              >
                Editar
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setObsEdit(candidato.observacao || "");
                    setObsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={obsSaving}
                  onClick={salvarObservacao}
                >
                  <Save className="h-3 w-3" />
                  {obsSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </div>
          {obsEditing ? (
            <Textarea
              rows={3}
              placeholder="Notas internas sobre o candidato..."
              value={obsEdit}
              onChange={(e) => setObsEdit(e.target.value)}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {candidato.observacao || "Nenhuma observação registrada."}
            </p>
          )}
        </CardContent>
      </Card>

      {candidato.timeline.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Historico unificado</h3>
                <p className="text-sm text-muted-foreground">
                  Mensagens, triagens, entrevistas e observacoes do RH em uma unica linha do tempo.
                </p>
              </div>
              <Badge variant="outline">{candidato.timeline.length} itens</Badge>
            </div>

            <div className="space-y-4">
              {candidato.timeline.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-lg border p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", timelineBadgeClass(item.tipo))}>
                        {timelineLabel(item.tipo)}
                      </Badge>
                      <p className="text-sm font-medium">{item.titulo}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {item.descricao}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {item.metadata?.status && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.metadata.status}
                        </Badge>
                      )}
                      {item.metadata?.resultado && (
                        <Badge variant="outline" className="text-[10px]">
                          Resultado: {item.metadata.resultado}
                        </Badge>
                      )}
                      {item.metadata?.direcao && (
                        <Badge variant="outline" className="text-[10px]">
                          {item.metadata.direcao === "RECEBIDA" ? "Recebida" : "Enviada"}
                        </Badge>
                      )}
                      {item.metadata?.geradaPorIA && (
                        <Badge variant="outline" className="text-[10px]">
                          IA
                        </Badge>
                      )}
                      {item.metadata?.vagaTitulo && (
                        <span className="text-xs text-muted-foreground">
                          {item.metadata.vagaTitulo}
                        </span>
                      )}
                    </div>

                    {item.href && (
                      <div className="mt-2">
                        <Link href={item.href} className="text-xs text-primary hover:underline">
                          Abrir contexto
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Experiências */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Briefcase className="h-4 w-4" />
              Experiências ({candidato.experiencias.length})
            </h3>
            {candidato.experiencias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma experiência cadastrada.</p>
            ) : (
              <div className="space-y-4">
                {candidato.experiencias.map((exp) => (
                  <div key={exp.id} className="border-l-2 border-primary/20 pl-4">
                    <p className="font-medium">{exp.cargo}</p>
                    <p className="text-sm text-muted-foreground">{exp.empresa}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(exp.dataInicio)} — {exp.atual ? "Presente" : exp.dataFim ? formatDate(exp.dataFim) : "—"}
                      <span className="text-primary font-medium">
                        ({calcTempo(exp.dataInicio, exp.dataFim)})
                      </span>
                    </div>
                    {exp.descricao && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {exp.descricao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formações */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <GraduationCap className="h-4 w-4" />
              Formação ({candidato.formacoes.length})
            </h3>
            {candidato.formacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada.</p>
            ) : (
              <div className="space-y-4">
                {candidato.formacoes.map((f) => (
                  <div key={f.id} className="border-l-2 border-primary/20 pl-4">
                    <p className="font-medium">{f.curso}</p>
                    <p className="text-sm text-muted-foreground">
                      {f.instituicao} · {nivelLabels[f.nivel] ?? f.nivel}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(f.dataInicio)} — {f.atual ? "Cursando" : f.dataFim ? formatDate(f.dataFim) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Triagens / Vagas vinculadas — mostra se candidato foi contratado */}
      {candidato.triagens.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">
              Vagas vinculadas ({candidato.triagens.length})
            </h3>
            <div className="space-y-2">
              {candidato.triagens.map((t) => {
                const dispensadoPorContratacao = t.eventos?.some(
                  (e) => e.tipo === "OUTRAS_TRIAGENS_ENCERRADAS",
                );
                return (
                  <Link
                    key={t.id}
                    href={`/vagas/${t.vaga.id}/triagem`}
                    className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{t.vaga.titulo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{t.vaga.area}</span>
                        {dispensadoPorContratacao && (
                          <Badge variant="destructive" className="text-[10px]">
                            Encerrada — contratado em outra vaga
                          </Badge>
                        )}
                        {!dispensadoPorContratacao && t.status === "CONCLUIDO" && t.vaga.status === "FINALIZADA" && (
                          <Badge variant="outline" className="text-[10px]">
                            Vaga finalizada
                          </Badge>
                        )}
                        {t.status === "PENDENTE" && (
                          <Badge variant="outline" className="text-[10px]">
                            Análise pendente
                          </Badge>
                        )}
                        {t.status === "PROCESSANDO" && (
                          <Badge variant="secondary" className="text-[10px]">
                            Analisando...
                          </Badge>
                        )}
                        {t.status === "ERRO" && (
                          <Badge variant="destructive" className="text-[10px]">
                            Erro na análise
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.score != null ? (
                        <span
                          className={`text-lg font-bold ${
                            t.score >= 70
                              ? "text-success"
                              : t.score >= 40
                                ? "text-warning"
                                : "text-destructive"
                          }`}
                        >
                          {t.score}%
                        </span>
                      ) : (
                        !dispensadoPorContratacao && t.status !== "PENDENTE" && t.status !== "PROCESSANDO" && t.status !== "ERRO" && (
                          <Badge variant="outline" className="text-xs">
                            Sem score
                          </Badge>
                        )
                      )}
                      {t.desatualizado && (
                        <Badge variant="secondary" className="text-[10px]">
                          Desatualizado
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
