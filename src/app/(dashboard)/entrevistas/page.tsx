"use client";
import { apiFetch } from "@/lib/api-fetch";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Clock,
  User,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

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

function CustomToolbar({ label, onNavigate, onView, view }: {
  label: string;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  onView: (view: View) => void;
  view: View;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
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
        <h2 className="ml-2 text-lg font-semibold capitalize">{label}</h2>
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

export default function EntrevistasCalendarioPage() {
  const [entrevistas, setEntrevistas] = useState<EntrevistaAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [selected, setSelected] = useState<EntrevistaAPI | null>(null);

  const fetchEntrevistas = useCallback(async (date: Date) => {
    const from = startOfMonth(subMonths(date, 1)).toISOString();
    const to = endOfMonth(addMonths(date, 1)).toISOString();

    try {
      const res = await apiFetch(`/api/entrevistas?from=${from}&to=${to}`);
      const data = await res.json();
      setEntrevistas(data);
    } catch (err) {
      console.error("Erro ao carregar entrevistas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

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
          title: `${entrevista.triagem.candidato.nome} - ${entrevista.triagem.vaga.titulo}`,
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

  function handleNavigate(date: Date) {
    setCurrentDate(date);
  }

  function handleSelectEvent(event: CalendarEvent) {
    setSelected(event.resource);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-[600px] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <CalendarDays className="h-5 w-5" />
          Visão Geral de Entrevistas
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Panorama operacional de todas as vagas. O fluxo principal de agendamento acontece dentro de cada vaga.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.hoje}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{stats.semana}</p>
            <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-warning">{stats.agendadas}</p>
            <p className="text-xs text-muted-foreground">Agendadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total no período</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 650 }}
            date={currentDate}
            view={view}
            onNavigate={handleNavigate}
            onView={(nextView) => setView(nextView)}
            onSelectEvent={handleSelectEvent}
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
              noEventsInRange: "Nenhuma entrevista neste período.",
              showMore: (count: number) => `+${count} mais`,
            }}
            culture="pt-BR"
            popup
          />
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
                  Vaga
                </div>
                <p className="text-sm">{selected.triagem.vaga.titulo}</p>
                <span className="text-xs text-muted-foreground">
                  {selected.triagem.vaga.area}
                </span>
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

              <div className="flex justify-end gap-4 pt-2">
                <Link
                  href={`/vagas/${selected.triagem.vaga.id}/entrevistas`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  Abrir agenda da vaga
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/vagas/${selected.triagem.vaga.id}/triagem/${selected.triagem.candidato.id}/entrevistas`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  Abrir agenda do candidato
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
