"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Briefcase, Users, BarChart3, CheckCircle } from "lucide-react";

interface Metricas {
  vagasAbertas: number;
  totalCandidatos: number;
  analisesConcluidas: number;
  candidatosAprovados: number;
}

interface VagaDestaque {
  id: string;
  titulo: string;
  area: string;
  regime: string;
  status: string;
  totalCandidatos: number;
  melhorScore: number | null;
}

interface DashboardData {
  metricas: Metricas;
  vagasDestaque: VagaDestaque[];
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ABERTA: { label: "Aberta", variant: "default" },
  EM_REVISAO: { label: "Em revisão", variant: "secondary" },
  FECHADA: { label: "Fechada", variant: "destructive" },
};

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

  if (loading) {
    return <DashboardSkeleton />;
  }

  const metricas = data?.metricas ?? {
    vagasAbertas: 0,
    totalCandidatos: 0,
    analisesConcluidas: 0,
    candidatosAprovados: 0,
  };

  const stats = [
    { label: "Vagas Abertas", value: metricas.vagasAbertas, icon: Briefcase, color: "text-info" },
    { label: "Total Candidatos", value: metricas.totalCandidatos, icon: Users, color: "text-primary" },
    { label: "Análises Geradas", value: metricas.analisesConcluidas, icon: BarChart3, color: "text-warning" },
    { label: "Aprovados", value: metricas.candidatosAprovados, icon: CheckCircle, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-lg bg-muted p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vagas em destaque */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-base font-semibold">Vagas em destaque</h2>
            <Link
              href="/vagas"
              className="text-sm text-primary hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaga</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Regime</TableHead>
                <TableHead className="text-center">Candidatos</TableHead>
                <TableHead className="text-center">Melhor Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.vagasDestaque ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma vaga cadastrada ainda.
                  </TableCell>
                </TableRow>
              ) : (
                data!.vagasDestaque.map((vaga) => {
                  const st = statusMap[vaga.status] ?? { label: vaga.status, variant: "outline" as const };
                  return (
                    <TableRow key={vaga.id}>
                      <TableCell>
                        <Link
                          href={`/vagas/${vaga.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {vaga.titulo}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vaga.area}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vaga.regime}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {vaga.totalCandidatos}
                      </TableCell>
                      <TableCell className="text-center">
                        {vaga.melhorScore != null ? (
                          <span className="font-semibold text-primary">
                            {vaga.melhorScore}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="h-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="h-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}
