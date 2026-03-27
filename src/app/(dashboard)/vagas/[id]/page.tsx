"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Briefcase, DollarSign, Users, ArrowRight, Pencil } from "lucide-react";

interface Requisito {
  id: string;
  descricao: string;
  tipo: "OBRIGATORIO" | "DESEJAVEL";
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
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  }

  if (!vaga) {
    return <p className="text-muted-foreground">Vaga não encontrada.</p>;
  }

  const st = statusMap[vaga.status] ?? { label: vaga.status, variant: "outline" as const };
  const faixa =
    vaga.salarioMin && vaga.salarioMax
      ? `R$ ${vaga.salarioMin.toLocaleString()} - R$ ${vaga.salarioMax.toLocaleString()}`
      : vaga.salarioMin
        ? `A partir de R$ ${vaga.salarioMin.toLocaleString()}`
        : vaga.salarioMax
          ? `Até R$ ${vaga.salarioMax.toLocaleString()}`
          : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{vaga.titulo}</h2>
            <Badge variant="outline" className="text-xs">{vaga.jobType}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {vaga.localizacao}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" /> {vaga.area} · {regimeMap[vaga.regime] ?? vaga.regime} · {modalidadeMap[vaga.modalidade] ?? vaga.modalidade}
            </span>
            {vaga.cep && (
              <span className="text-xs">CEP: {vaga.cep}</span>
            )}
            {faixa && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> {faixa}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={vaga.status} onValueChange={(v) => v && handleStatusChange(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ABERTA">Aberta</SelectItem>
              <SelectItem value="EM_REVISAO">Em revisão</SelectItem>
              <SelectItem value="FECHADA">Fechada</SelectItem>
            </SelectContent>
          </Select>
          <Link href={`/vagas/${vagaId}/editar`} className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
            <Pencil className="h-4 w-4" />
            Editar
          </Link>
          <Link href={`/vagas/${vagaId}/triagem`} className={cn(buttonVariants(), "gap-1.5")}>
            <Users className="h-4 w-4" />
            Triagem
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Descrição + Requisitos */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-3 font-semibold">Descrição</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {vaga.descricao}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="mb-3 font-semibold">Requisitos</h3>
              {vaga.requisitos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum requisito definido.</p>
              ) : (
                <div className="space-y-2">
                  {vaga.requisitos.map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <Badge
                        variant={r.tipo === "OBRIGATORIO" ? "destructive" : "secondary"}
                        className="shrink-0 text-xs"
                      >
                        {r.tipo === "OBRIGATORIO" ? "Obrigatório" : "Desejável"}
                      </Badge>
                      <span className="text-sm">{r.descricao}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Candidatos vinculados */}
        <div>
          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">
                  Candidatos ({vaga.triagens.length})
                </h3>
              </div>
              {vaga.triagens.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum candidato vinculado.
                  <br />
                  <Link
                    href={`/vagas/${vagaId}/triagem`}
                    className="mt-2 inline-block text-primary hover:underline"
                  >
                    Ir para triagem
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {vaga.triagens.slice(0, 10).map((t) => (
                    <Link
                      key={t.id}
                      href={`/vagas/${vagaId}/triagem`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{t.candidato.nome}</p>
                        <div className="flex gap-1 mt-0.5">
                          {t.candidato.skills.slice(0, 3).map((s) => (
                            <Badge key={s.nome} variant="outline" className="text-[10px] px-1.5 py-0">
                              {s.nome}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.score != null ? (
                          <span className="text-sm font-bold text-primary">
                            {t.score}%
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {t.status === "PROCESSANDO" ? "Analisando..." : "Pendente"}
                          </Badge>
                        )}
                        {t.desatualizado && (
                          <Badge variant="secondary" className="text-[10px]">
                            Desatualizado
                          </Badge>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
