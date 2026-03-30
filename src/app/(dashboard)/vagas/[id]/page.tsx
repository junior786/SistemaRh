"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Users,
  ArrowRight,
  Pencil,
  ClipboardCheck,
  Building2,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
} from "lucide-react";

interface Requisito {
  id: string;
  descricao: string;
  tipo: "OBRIGATORIO" | "DESEJAVEL";
  tempoMeses: number | null;
}

interface Triagem {
  id: string;
  score: number | null;
  status: string;
  desatualizado: boolean;
  candidato: {
    id: string;
    nome: string;
    email: string;
    skills: { nome: string }[];
  };
}

interface Empregado {
  id: string;
  nome: string;
  email: string;
}

interface Vaga {
  id: string;
  titulo: string;
  area: string;
  jobType: string;
  regime: string;
  modalidade: string;
  localizacao: string;
  cep: string | null;
  salarioMin: number | null;
  salarioMax: number | null;
  descricao: string;
  status: string;
  requisitos: Requisito[];
  triagens: Triagem[];
  empregados: Empregado[];
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ABERTA: { label: "Aberta", variant: "default" },
  EM_REVISAO: { label: "Em revisão", variant: "secondary" },
  FECHADA: { label: "Fechada", variant: "destructive" },
};

const regimeMap: Record<string, string> = {
  CLT: "CLT",
  PJ: "PJ",
  ESTAGIO: "Estágio",
  FREELANCER: "Freelancer",
};

const modalidadeMap: Record<string, string> = {
  PRESENCIAL: "Presencial",
  REMOTO: "Remoto",
  HIBRIDO: "Híbrido",
};

function formatTempo(meses: number): string {
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anos === 0) return `${resto} ${resto === 1 ? "mês" : "meses"}`;
  if (resto === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"} e ${resto} ${resto === 1 ? "mês" : "meses"}`;
}

function scoreColor(score: number) {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-success/10";
  if (score >= 40) return "bg-warning/10";
  return "bg-destructive/10";
}

export default function DetalheVagaPage() {
  const params = useParams();
  const vagaId = params.id as string;
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vagas/${vagaId}`)
      .then((r) => r.json())
      .then(setVaga)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [vagaId]);

  async function handleStatusChange(status: string) {
    await fetch(`/api/vagas/${vagaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setVaga((v) => (v ? { ...v, status } : v));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
            <div className="h-36 animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!vaga) {
    return <p className="text-muted-foreground">Vaga não encontrada.</p>;
  }

  const st = statusMap[vaga.status] ?? { label: vaga.status, variant: "outline" as const };
  const faixa =
    vaga.salarioMin && vaga.salarioMax
      ? `R$ ${vaga.salarioMin.toLocaleString("pt-BR")} – R$ ${vaga.salarioMax.toLocaleString("pt-BR")}`
      : vaga.salarioMin
        ? `A partir de R$ ${vaga.salarioMin.toLocaleString("pt-BR")}`
        : vaga.salarioMax
          ? `Até R$ ${vaga.salarioMax.toLocaleString("pt-BR")}`
          : null;

  const reqObrigatorios = vaga.requisitos.filter((r) => r.tipo === "OBRIGATORIO");
  const reqDesejaveis = vaga.requisitos.filter((r) => r.tipo === "DESEJAVEL");

  const triagensConcluidas = vaga.triagens.filter((t) => t.score != null);
  const mediaScore = triagensConcluidas.length > 0
    ? Math.round(triagensConcluidas.reduce((acc, t) => acc + (t.score ?? 0), 0) / triagensConcluidas.length)
    : null;

  return (
    <div className="space-y-6">
      {/* ═══ Hero Card ═══ */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Gradient top bar */}
          <div className="h-2 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />

          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* Left: title + meta */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{vaga.titulo}</h1>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1 text-xs font-medium">
                    <Briefcase className="h-3 w-3" />
                    {vaga.jobType}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Building2 className="h-3 w-3" />
                    {vaga.area}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {regimeMap[vaga.regime] ?? vaga.regime}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Monitor className="h-3 w-3" />
                    {modalidadeMap[vaga.modalidade] ?? vaga.modalidade}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {vaga.localizacao}
                    {vaga.cep && <span className="text-xs opacity-60">({vaga.cep})</span>}
                  </span>
                  {faixa && (
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <DollarSign className="h-4 w-4 text-success" />
                      {faixa}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex shrink-0 items-center gap-2">
                <Select value={vaga.status} onValueChange={(v) => v && handleStatusChange(v)}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABERTA">Aberta</SelectItem>
                    <SelectItem value="EM_REVISAO">Em revisão</SelectItem>
                    <SelectItem value="FECHADA">Fechada</SelectItem>
                  </SelectContent>
                </Select>
                <Link
                  href={`/vagas/${vagaId}/editar`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Link>
                <Link
                  href={`/vagas/${vagaId}/triagem`}
                  className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
                >
                  <Users className="h-3.5 w-3.5" />
                  Triagem
                </Link>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ═══ Stats mini-cards ═══ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vaga.triagens.length}</p>
              <p className="text-xs text-muted-foreground">Candidatos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{triagensConcluidas.length}</p>
              <p className="text-xs text-muted-foreground">Analisados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <ClipboardCheck className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mediaScore != null ? `${mediaScore}%` : "—"}</p>
              <p className="text-xs text-muted-foreground">Score médio</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reqObrigatorios.length}</p>
              <p className="text-xs text-muted-foreground">Obrigatórios</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Body: 2 cols ═══ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Descrição */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Briefcase className="h-4 w-4 text-primary" />
                Descrição da Vaga
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {vaga.descricao}
              </p>
            </CardContent>
          </Card>

          {/* Requisitos */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                Requisitos
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {vaga.requisitos.length} total
                </span>
              </h3>

              {vaga.requisitos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum requisito definido.</p>
              ) : (
                <div className="space-y-4">
                  {/* Obrigatórios */}
                  {reqObrigatorios.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-destructive">
                        Obrigatórios ({reqObrigatorios.length})
                      </p>
                      <div className="space-y-1.5">
                        {reqObrigatorios.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-2.5 rounded-md bg-destructive/5 px-3 py-2"
                          >
                            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                            <span className="flex-1 text-sm">{r.descricao}</span>
                            {r.tempoMeses && (
                              <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                                <Clock className="h-3 w-3" />
                                {formatTempo(r.tempoMeses)}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Desejáveis */}
                  {reqDesejaveis.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Desejáveis ({reqDesejaveis.length})
                      </p>
                      <div className="space-y-1.5">
                        {reqDesejaveis.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-2.5 rounded-md bg-muted/50 px-3 py-2"
                          >
                            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                            <span className="flex-1 text-sm">{r.descricao}</span>
                            {r.tempoMeses && (
                              <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                                <Clock className="h-3 w-3" />
                                {formatTempo(r.tempoMeses)}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — Empregados + Candidatos */}
        <div className="space-y-4">
          {/* Empregados nesta vaga */}
          {vaga.empregados.length > 0 && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-success/20 px-4 py-3">
                  <h3 className="flex items-center gap-2 font-semibold text-success">
                    <UserCheck className="h-4 w-4" />
                    Contratados
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {vaga.empregados.length}
                  </Badge>
                </div>
                <div className="divide-y divide-success/10">
                  {vaga.empregados.map((emp) => (
                    <Link
                      key={emp.id}
                      href={`/candidatos/${emp.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-success/10"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/20 text-xs font-bold text-success">
                        {emp.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{emp.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="sticky top-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-primary" />
                  Candidatos
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {vaga.triagens.length}
                </Badge>
              </div>

              {vaga.triagens.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Users className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nenhum candidato</p>
                    <p className="text-xs text-muted-foreground">
                      Vincule candidatos pela triagem
                    </p>
                  </div>
                  <Link
                    href={`/vagas/${vagaId}/triagem`}
                    className={cn(buttonVariants({ size: "sm" }), "mt-1 gap-1.5")}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Ir para triagem
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {vaga.triagens.slice(0, 10).map((t) => (
                    <Link
                      key={t.id}
                      href={`/vagas/${vagaId}/triagem`}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {t.candidato.nome.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.candidato.nome}
                        </p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {t.candidato.skills.slice(0, 3).map((s) => (
                            <Badge
                              key={s.nome}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {s.nome}
                            </Badge>
                          ))}
                          {t.candidato.skills.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{t.candidato.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score / Status */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {t.score != null ? (
                          <div className={cn("rounded-md px-2 py-1 text-center", scoreBg(t.score))}>
                            <span className={cn("text-sm font-bold", scoreColor(t.score))}>
                              {t.score}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {t.status === "PROCESSANDO" ? "Analisando" : "Pendente"}
                          </div>
                        )}
                        {t.desatualizado && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            Desatualizado
                          </Badge>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </Link>
                  ))}

                  {/* Show more link */}
                  {vaga.triagens.length > 10 && (
                    <Link
                      href={`/vagas/${vagaId}/triagem`}
                      className="flex items-center justify-center gap-1 py-3 text-xs font-medium text-primary hover:underline"
                    >
                      Ver todos os {vaga.triagens.length} candidatos
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
