"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { addMonths, endOfMonth, format, getDay, parse, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  User,
} from "lucide-react";

interface EntrevistaAPI {
  id: string;
  dataHora: string;
  entrevistador: string;
  status: string;
  observacoes: string | null;
  resultado: string | null;
  triagem: {
    candidato: { id: string; nome: string; email: string; jobType: string };
    vaga: { id: string; titulo: string; area: string };
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: EntrevistaAPI;
}

interface VagaResumo {
  id: string;
  titulo: string;
  area: string;
}

interface VagaAgendaSectionProps {
  vagaId: string;
  mode?: "embedded" | "page";
}

const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const statusLabels: Record<string, string> = {
  AGENDADA: "Agendada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

const statusColor: Record<string, string> = {
  AGENDADA: "bg-primary",
  REALIZADA: "bg-success",
  CANCELADA: "bg-destructive",
};

const resultadoLabels: Record<string, string> = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  PROXIMA_FASE: "Próxima fase",
};

const resultadoVariant: Record<string, "default" | "destructive" | "secondary"> = {
  APROVADO: "default",
  REPROVADO: "destructive",
  PROXIMA_FASE: "secondary",
};

function CustomToolbar({
  label,
  onNavigate,
  onView,
  view,
}: {
  label: string;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  onView: (view: View) => void;
  view: View;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate("PREV")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate("TODAY")}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate("NEXT")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h3 className="ml-2 text-base font-semibold capitalize">{label}</h3>
      </div>
      <div className="flex gap-1">
        {([
          { key: "month" as View, label: "Mês" },
          { key: "week" as View, label: "Semana" },
          { key: "day" as View, label: "Dia" },
          { key: "agenda" as View, label: "Lista" },
        ]).map((option) => (
          <Button
            key={option.key}
            variant={view === option.key ? "default" : "outline"}
            size="sm"
            onClick={() => onView(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function VagaAgendaSection({ vagaId, mode = "embedded" }: VagaAgendaSectionProps) {
  const [vaga, setVaga] = useState<VagaResumo | null>(null);
  const [entrevistas, setEntrevistas] = useState<EntrevistaAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [selected, setSelected] = useState<EntrevistaAPI | null>(null);

  const fetchEntrevistas = useCallback(async (date: Date) => {
    const from = startOfMonth(subMonths(date, 1)).toISOString();
    const to = endOfMonth(addMonths(date, 1)).toISOString();

    try {
      const [vagaRes, entrevistasRes] = await Promise.all([
        fetch(`/api/vagas/${vagaId}`),
        fetch(`/api/entrevistas?vagaId=${vagaId}&from=${from}&to=${to}`),
      ]);

      const vagaText = await vagaRes.text();
      const entrevistasText = await entrevistasRes.text();
      const vagaData = vagaText ? JSON.parse(vagaText) : null;
      const entrevistasData = entrevistasText ? JSON.parse(entrevistasText) : [];

      if (!vagaRes.ok) {
        throw new Error(vagaData?.error || "Erro ao carregar vaga");
      }
      if (!entrevistasRes.ok) {
        throw new Error(entrevistasData?.error || "Erro ao carregar entrevistas");
      }

      setVaga({
        id: vagaData.id,
        titulo: vagaData.titulo,
        area: vagaData.area,
      });
      setEntrevistas(Array.isArray(entrevistasData) ? entrevistasData : []);
    } catch (error) {
      console.error("Erro ao carregar agenda da vaga:", error);
    } finally {
      setLoading(false);
    }
  }, [vagaId]);

  useEffect(() => {
    void fetchEntrevistas(currentDate);
  }, [currentDate, fetchEntrevistas]);

  const events: CalendarEvent[] = useMemo(
    () =>
      entrevistas.map((entrevista) => {
        const start = new Date(entrevista.dataHora);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return {
          id: entrevista.id,
          title: entrevista.triagem.candidato.nome,
          start,
          end,
          resource: entrevista,
        };
      }),
    [entrevistas],
  );

  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    const fimSemana = new Date(hoje);
    fimSemana.setDate(fimSemana.getDate() + 7);

    return {
      total: entrevistas.length,
      hoje: entrevistas.filter((entrevista) => {
        const data = new Date(entrevista.dataHora);
        return data >= hoje && data <= fimHoje;
      }).length,
      semana: entrevistas.filter((entrevista) => {
        const data = new Date(entrevista.dataHora);
        return data >= hoje && data <= fimSemana && entrevista.status === "AGENDADA";
      }).length,
      agendadas: entrevistas.filter((entrevista) => entrevista.status === "AGENDADA").length,
    };
  }, [entrevistas]);

  const proximasEntrevistas = useMemo(
    () =>
      [...entrevistas]
        .filter((entrevista) => entrevista.status === "AGENDADA" && new Date(entrevista.dataHora) >= new Date())
        .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
        .slice(0, 4),
    [entrevistas],
  );

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const colorMap: Record<string, string> = {
      AGENDADA: "var(--primary)",
      REALIZADA: "var(--success)",
      CANCELADA: "var(--destructive)",
    };
    return {
      style: {
        backgroundColor: colorMap[event.resource.status] || "var(--primary)",
        borderRadius: "6px",
        border: "none",
        color: "white",
        fontSize: "12px",
        padding: "2px 6px",
      },
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="h-[420px] animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={mode === "embedded" ? "border-primary/20 shadow-sm" : undefined}>
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <CalendarDays className="h-5 w-5 text-primary" />
                Agenda da vaga
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {vaga ? `${vaga.titulo} · ${vaga.area}` : "Entrevistas filtradas por vaga"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {mode === "page" && (
                <Link href={`/vagas/${vagaId}`} className="inline-flex">
                  <Button variant="outline" size="sm">
                    Voltar para vaga
                  </Button>
                </Link>
              )}
              <Link href={`/vagas/${vagaId}/triagem`} className="inline-flex">
                <Button size="sm">
                  Abrir triagem
                </Button>
              </Link>
              {mode === "embedded" && (
                <Link href={`/vagas/${vagaId}/entrevistas`} className="inline-flex">
                  <Button variant="outline" size="sm">
                    Tela completa
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-background px-4 py-3">
              <p className="text-2xl font-semibold">{stats.hoje}</p>
              <p className="text-xs text-muted-foreground">Hoje</p>
            </div>
            <div className="rounded-2xl border bg-primary/5 px-4 py-3">
              <p className="text-2xl font-semibold text-primary">{stats.semana}</p>
              <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3">
              <p className="text-2xl font-semibold">{stats.agendadas}</p>
              <p className="text-xs text-muted-foreground">Agendadas</p>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3">
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total no período</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
            <div className="rounded-2xl border p-4">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: mode === "embedded" ? 460 : 650 }}
                date={currentDate}
                view={view}
                onNavigate={setCurrentDate}
                onView={(nextView) => setView(nextView)}
                onSelectEvent={(event) => setSelected(event.resource)}
                eventPropGetter={eventStyleGetter}
                components={{ toolbar: CustomToolbar }}
                messages={{
                  today: "Hoje",
                  previous: "Anterior",
                  next: "Próximo",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia",
                  agenda: "Lista",
                  date: "Data",
                  time: "Horário",
                  event: "Entrevista",
                  noEventsInRange: "Nenhuma entrevista desta vaga neste período.",
                  showMore: (count: number) => `+${count} mais`,
                }}
                culture="pt-BR"
                popup
              />
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm font-semibold">Próximas entrevistas</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Atalho rápido para o que precisa ser acompanhado agora.
                </p>
              </div>

              {proximasEntrevistas.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhuma entrevista agendada para os próximos dias.
                </div>
              ) : (
                proximasEntrevistas.map((entrevista) => (
                  <button
                    key={entrevista.id}
                    type="button"
                    onClick={() => setSelected(entrevista)}
                    className="w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{entrevista.triagem.candidato.nome}</p>
                        <p className="text-xs text-muted-foreground">{entrevista.triagem.candidato.jobType}</p>
                      </div>
                      <Badge variant="outline">{statusLabels[entrevista.status] ?? entrevista.status}</Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>{format(new Date(entrevista.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      <p>{entrevista.entrevistador}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Detalhes da entrevista
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(new Date(selected.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs text-white ${statusColor[selected.status] || ""}`}
                  >
                    {statusLabels[selected.status] ?? selected.status}
                  </Badge>
                  {selected.resultado && (
                    <Badge variant={resultadoVariant[selected.resultado] ?? "outline"}>
                      {resultadoLabels[selected.resultado] ?? selected.resultado}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Candidato
                </div>
                <p className="text-sm">{selected.triagem.candidato.nome}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {selected.triagem.candidato.jobType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selected.triagem.candidato.email}
                  </span>
                </div>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Contexto da vaga
                </div>
                <p className="text-sm">{selected.triagem.vaga.titulo}</p>
                <span className="text-xs text-muted-foreground">{selected.triagem.vaga.area}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Entrevistador:</span>
                <span className="font-medium">{selected.entrevistador}</span>
              </div>

              {selected.observacoes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Observações</p>
                  <p className="whitespace-pre-wrap text-sm">{selected.observacoes}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Link
                  href={`/vagas/${selected.triagem.vaga.id}/triagem/${selected.triagem.candidato.id}/entrevistas`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  Ver todas as entrevistas
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
