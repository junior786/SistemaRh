"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CartesianGrid, Area, AreaChart, Bar, BarChart, Pie, PieChart, XAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Users,
  Sparkles,
  ArrowRight,
  UserCheck,
  Clock3,
  BrainCircuit,
  History,
} from "lucide-react";

interface Metricas {
  vagasAbertas: number;
  vagasEmRevisao: number;
  vagasFechadas: number;
  totalCandidatos: number;
  candidatosDisponiveis: number;
  candidatosContratados: number;
  analisesConcluidas: number;
  mediaScore: number | null;
}

interface Pipeline {
  pendentes: number;
  processando: number;
  concluidas: number;
}

interface SerieMensal {
  key: string;
  label: string;
  vagas: number;
  candidatos: number;
  triagens: number;
}

interface StatusVaga {
  status: string;
  label: string;
  total: number;
  fill: string;
}

interface VagaDestaque {
  id: string;
  titulo: string;
  area: string;
  regime: string;
  status: string;
  totalCandidatos: number;
  contratados: number;
  melhorScore: number | null;
}

interface DashboardData {
  metricas: Metricas;
  pipeline: Pipeline;
  statusVagas: StatusVaga[];
  seriesMensal: SerieMensal[];
  vagasDestaque: VagaDestaque[];
  atividadesRecentes: {
    id: string;
    tipo: string;
    descricao: string;
    origem: string;
    createdAt: string;
    vagaId: string;
    vagaTitulo: string;
    candidatoId: string;
    candidatoNome: string;
  }[];
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ABERTA: { label: "Aberta", variant: "default" },
  EM_REVISAO: { label: "Em revisao", variant: "secondary" },
  FECHADA: { label: "Fechada", variant: "destructive" },
};

const chartConfig = {
  vagas: { label: "Vagas", color: "var(--color-chart-1)" },
  candidatos: { label: "Candidatos", color: "var(--color-chart-3)" },
  triagens: { label: "Triagens", color: "var(--color-chart-5)" },
  abertas: { label: "Abertas", color: "var(--color-chart-1)" },
  revisao: { label: "Em revisao", color: "var(--color-chart-5)" },
  fechadas: { label: "Fechadas", color: "var(--color-chart-4)" },
} as const;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const atividadesRecentes = data?.atividadesRecentes ?? [];

  const metricas = data?.metricas ?? {
    vagasAbertas: 0,
    vagasEmRevisao: 0,
    vagasFechadas: 0,
    totalCandidatos: 0,
    candidatosDisponiveis: 0,
    candidatosContratados: 0,
    analisesConcluidas: 0,
    mediaScore: null,
  };

  const taxaContratacao = metricas.totalCandidatos
    ? Math.round((metricas.candidatosContratados / metricas.totalCandidatos) * 100)
    : 0;

  const cards = [
    {
      label: "Vagas abertas",
      value: metricas.vagasAbertas,
      helper: `${metricas.vagasEmRevisao} em revisao`,
      icon: Briefcase,
      tone: "text-primary",
      shell: "from-primary/15 via-primary/5 to-transparent",
    },
    {
      label: "Candidatos ativos",
      value: metricas.candidatosDisponiveis,
      helper: `${metricas.totalCandidatos} cadastrados`,
      icon: Users,
      tone: "text-info",
      shell: "from-info/15 via-info/5 to-transparent",
    },
    {
      label: "Contratados",
      value: metricas.candidatosContratados,
      helper: `${taxaContratacao}% da base`,
      icon: UserCheck,
      tone: "text-success",
      shell: "from-success/15 via-success/5 to-transparent",
    },
    {
      label: "Analises concluidas",
      value: metricas.analisesConcluidas,
      helper: metricas.mediaScore != null ? `score medio ${metricas.mediaScore}%` : "sem score medio ainda",
      icon: BrainCircuit,
      tone: "text-warning",
      shell: "from-warning/15 via-warning/5 to-transparent",
    },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_28%)]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
          <div className="space-y-4">
            <Badge variant="secondary" className="w-fit gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
              <Sparkles className="h-3 w-3" />
              Visao executiva
            </Badge>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight lg:text-4xl">
                Panorama do recrutamento com foco em conversao, volume e ritmo de operacao.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">
                Acompanhe vagas abertas, contratacoes e andamento das triagens em uma visao unica,
                desenhada para leitura rapida e tomada de decisao.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/vagas" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
                Ver vagas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/candidatos" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                Ver candidatos
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border bg-background/80 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pipeline</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-semibold">{data?.pipeline.pendentes ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">Pendentes</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">{data?.pipeline.processando ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">Processando</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">{data?.pipeline.concluidas ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">Concluidas</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/80 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vagas</p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-semibold">{metricas.vagasAbertas}</p>
                  <p className="text-sm text-muted-foreground">em andamento agora</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{metricas.vagasEmRevisao} em revisao</p>
                  <p>{metricas.vagasFechadas} fechadas</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/80 p-4 backdrop-blur">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-warning" />
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Destaque</p>
              </div>
              <p className="mt-3 text-3xl font-semibold">{metricas.mediaScore ?? 0}%</p>
              <p className="text-sm text-muted-foreground">score medio das triagens concluidas</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="overflow-hidden">
            <CardContent className="relative p-5">
              <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-70", card.shell)} />
              <div className="relative flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.helper}</p>
                </div>
                <div className={cn("rounded-2xl border bg-background/80 p-3 shadow-sm", card.tone)}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-semibold">Ritmo dos ultimos 6 meses</h2>
                <p className="text-sm text-muted-foreground">Vagas, candidatos e triagens ao longo do tempo</p>
              </div>
            </div>
            <div className="p-4 pt-2">
              <ChartContainer
                className="h-[320px] w-full"
                config={chartConfig}
              >
                <AreaChart data={data?.seriesMensal ?? []} margin={{ left: 8, right: 8, top: 16 }}>
                  <defs>
                    <linearGradient id="fillVagas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-vagas)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-vagas)" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="fillCandidatos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-candidatos)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-candidatos)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="candidatos"
                    stroke="var(--color-candidatos)"
                    fill="url(#fillCandidatos)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="vagas"
                    stroke="var(--color-vagas)"
                    fill="url(#fillVagas)"
                    strokeWidth={2.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="triagens"
                    stroke="var(--color-triagens)"
                    fillOpacity={0}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b px-6 py-5">
                <h2 className="text-base font-semibold">Distribuicao das vagas</h2>
                <p className="text-sm text-muted-foreground">Status operacional da carteira</p>
              </div>
              <div className="grid items-center gap-2 p-4 lg:grid-cols-[1fr_0.9fr]">
                <ChartContainer className="h-[220px] w-full" config={chartConfig}>
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                    <Pie
                      data={data?.statusVagas ?? []}
                      dataKey="total"
                      nameKey="label"
                      innerRadius={55}
                      outerRadius={82}
                      paddingAngle={4}
                    />
                  </PieChart>
                </ChartContainer>

                <div className="space-y-3">
                  {(data?.statusVagas ?? []).map((item) => (
                    <div key={item.status} className="rounded-2xl border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                          <p className="text-sm font-medium">{item.label}</p>
                        </div>
                        <span className="text-lg font-semibold">{item.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b px-6 py-5">
                <h2 className="text-base font-semibold">Pipeline de triagens</h2>
                <p className="text-sm text-muted-foreground">Volume em cada estado do processamento</p>
              </div>
              <div className="p-4 pt-2">
                <ChartContainer
                  className="h-[220px] w-full"
                  config={{
                    pendentes: { label: "Pendentes", color: "var(--color-chart-5)" },
                    processando: { label: "Processando", color: "var(--color-chart-3)" },
                    concluidas: { label: "Concluidas", color: "var(--color-chart-4)" },
                  }}
                >
                  <BarChart
                    data={[
                      { etapa: "Pendentes", total: data?.pipeline.pendentes ?? 0, fill: "var(--color-pendentes)" },
                      { etapa: "Processando", total: data?.pipeline.processando ?? 0, fill: "var(--color-processando)" },
                      { etapa: "Concluidas", total: data?.pipeline.concluidas ?? 0, fill: "var(--color-concluidas)" },
                    ]}
                    margin={{ left: 0, right: 0, top: 12 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="etapa" tickLine={false} axisLine={false} tickMargin={10} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="total" radius={10} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b px-6 py-5">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Atividade recente</h2>
                </div>
                <p className="text-sm text-muted-foreground">Ultimos movimentos do funil e operacao do RH</p>
              </div>

              <div className="divide-y">
                {atividadesRecentes.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">
                    Nenhuma atividade recente registrada ainda.
                  </div>
                ) : (
                  atividadesRecentes.map((atividade) => (
                    <Link
                      key={atividade.id}
                      href={`/vagas/${atividade.vagaId}`}
                      className="block px-6 py-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{atividade.candidatoNome}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {atividade.origem}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{atividade.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {atividade.vagaTitulo}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(atividade.createdAt))}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2 className="text-base font-semibold">Vagas em destaque</h2>
              <p className="text-sm text-muted-foreground">As vagas com mais atividade recente e maior potencial de fechamento</p>
            </div>
            <Link href="/vagas" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {(data?.vagasDestaque ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground lg:col-span-2">
                Nenhuma vaga cadastrada ainda.
              </div>
            ) : (
              data!.vagasDestaque.map((vaga) => {
                const st = statusMap[vaga.status] ?? { label: vaga.status, variant: "outline" as const };
                return (
                  <Link
                    key={vaga.id}
                    href={`/vagas/${vaga.id}`}
                    className="group rounded-3xl border bg-gradient-to-br from-background to-muted/30 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold tracking-tight group-hover:text-primary">
                            {vaga.titulo}
                          </p>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{vaga.area}</span>
                          <span>•</span>
                          <span>{vaga.regime}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl border bg-background/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Candidatos</p>
                        <p className="mt-1 text-2xl font-semibold">{vaga.totalCandidatos}</p>
                      </div>
                      <div className="rounded-2xl border bg-background/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Contratados</p>
                        <p className="mt-1 text-2xl font-semibold">{vaga.contratados}</p>
                      </div>
                      <div className="rounded-2xl border bg-background/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Melhor score</p>
                        <p className="mt-1 text-2xl font-semibold">
                          {vaga.melhorScore != null ? `${vaga.melhorScore}%` : "—"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-8">
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardContent className="p-5">
              <div className="h-28 animate-pulse rounded-3xl bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="p-6">
            <div className="h-[320px] animate-pulse rounded-3xl bg-muted" />
          </CardContent>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="h-[220px] animate-pulse rounded-3xl bg-muted" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="h-[220px] animate-pulse rounded-3xl bg-muted" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
