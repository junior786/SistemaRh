"use client";

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

// ─── Localizer (date-fns + pt-BR) ───────────────────────
const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// ─── Types ───────────────────────────────────────────────
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

// ─── Custom Toolbar ──────────────────────────────────────
function CustomToolbar({ label, onNavigate, onView, view }: {
  label: string;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  onView: (view: View) => void;
  view: View;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
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
        ]).map((v) => (
          <Button
            key={v.key}
            variant={view === v.key ? "default" : "outline"}
            size="sm"
            onClick={() => onView(v.key)}
          >
            {v.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────
export default function EntrevistasCalendarioPage() {
  const [entrevistas, setEntrevistas] = useState<EntrevistaAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");

  // Modal de detalhe
  const [selected, setSelected] = useState<EntrevistaAPI | null>(null);

  const fetchEntrevistas = useCallback(async (date: Date) => {
    const from = startOfMonth(subMonths(date, 1)).toISOString();
    const to = endOfMonth(addMonths(date, 1)).toISOString();

    try {
      const res = await fetch(`/api/entrevistas?from=${from}&to=${to}`);
      const data = await res.json();
      setEntrevistas(data);
    } catch (err) {
      console.error("Erro ao carregar entrevistas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntrevistas(currentDate);
  }, [currentDate, fetchEntrevistas]);

  // Converter para eventos do calendário
  const events: CalendarEvent[] = useMemo(
    () =>
      entrevistas.map((e) => {
        const start = new Date(e.dataHora);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h duração
        return {
          id: e.id,
          title: `${e.triagem.candidato.nome} — ${e.triagem.vaga.titulo}`,
          start,
          end,
          resource: e,
        };
      }),
    [entrevistas],
  );

  // Contadores para os cards de resumo
  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    const fimSemana = new Date(hoje);
    fimSemana.setDate(fimSemana.getDate() + 7);

    return {
      total: entrevistas.length,
      hoje: entrevistas.filter((e) => {
        const d = new Date(e.dataHora);
        return d >= hoje && d <= fimHoje;
      }).length,
      semana: entrevistas.filter((e) => {
        const d = new Date(e.dataHora);
        return d >= hoje && d <= fimSemana && e.status === "AGENDADA";
      }).length,
      agendadas: entrevistas.filter((e) => e.status === "AGENDADA").length,
    };
  }, [entrevistas]);

  // Estilos dos eventos no calendário
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const status = event.resource.status;
    const colorMap: Record<string, string> = {
      AGENDADA: "var(--primary)",
      REALIZADA: "var(--success)",
      CANCELADA: "var(--destructive)",
    };
    return {
      style: {
        backgroundColor: colorMap[status] || "var(--primary)",
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
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Calendário de Entrevistas
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visualize e gerencie todas as entrevistas agendadas
        </p>
      </div>

      {/* Stats Cards */}
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

      {/* Calendar */}
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
            onView={(v) => setView(v)}
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

      {/* Modal de detalhe da entrevista */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Detalhes da Entrevista
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 pt-2">
              {/* Data/Hora + Status */}
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

              {/* Candidato */}
              <div className="rounded-lg border p-3 space-y-1">
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

              {/* Vaga */}
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Vaga
                </div>
                <p className="text-sm">{selected.triagem.vaga.titulo}</p>
                <span className="text-xs text-muted-foreground">
                  {selected.triagem.vaga.area}
                </span>
              </div>

              {/* Entrevistador */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Entrevistador:</span>
                <span className="font-medium">{selected.entrevistador}</span>
              </div>

              {/* Observações */}
              {selected.observacoes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.observacoes}</p>
                </div>
              )}

              {/* Link para página da triagem */}
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
    </div>
  );
}
