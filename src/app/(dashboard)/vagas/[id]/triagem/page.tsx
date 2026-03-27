"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  RotateCw,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Triagem {
  id: string;
  score: number | null;
  status: string;
  analise: string | null;
  checklist: string | null;
  desatualizado: boolean;
  candidato: {
    id: string;
    nome: string;
    email: string;
    skills: { nome: string }[];
  };
}

interface Candidato {
  id: string;
  nome: string;
  email: string;
}

interface ChecklistItem {
  requisito: string;
  tipo: string;
  atende: boolean;
  observacao: string;
}

export default function TriagemPage() {
  const params = useParams();
  const vagaId = params.id as string;
  const [triagens, setTriagens] = useState<Triagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scoreMinimo, setScoreMinimo] = useState("");

  // Dialog de vincular candidato
  const [dialogOpen, setDialogOpen] = useState(false);
  const [candidatosDisponiveis, setCandidatosDisponiveis] = useState<Candidato[]>([]);
  const [candidatoSelecionado, setCandidatoSelecionado] = useState("");

  const carregarTriagens = useCallback(() => {
    fetch(`/api/triagens?vagaId=${vagaId}`)
      .then((r) => r.json())
      .then(setTriagens)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [vagaId]);

  useEffect(() => {
    carregarTriagens();
  }, [carregarTriagens]);

  async function carregarCandidatos() {
    const res = await fetch("/api/candidatos");
    const todos: Candidato[] = await res.json();
    const idsVinculados = new Set(triagens.map((t) => t.candidato.id));
    setCandidatosDisponiveis(todos.filter((c) => !idsVinculados.has(c.id)));
  }

  async function vincularCandidato() {
    if (!candidatoSelecionado) return;

    const res = await fetch("/api/triagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vagaId, candidatoId: candidatoSelecionado }),
    });

    if (res.ok) {
      setDialogOpen(false);
      setCandidatoSelecionado("");
      carregarTriagens();
    }
  }

  async function analisar(triagemId: string) {
    await fetch(`/api/triagens/${triagemId}/analisar`, { method: "POST" });
    // Atualiza status localmente
    setTriagens((prev) =>
      prev.map((t) => (t.id === triagemId ? { ...t, status: "PROCESSANDO" } : t)),
    );
    // Poll para atualizar quando concluir
    const interval = setInterval(async () => {
      const res = await fetch(`/api/triagens?vagaId=${vagaId}`);
      const data: Triagem[] = await res.json();
      const t = data.find((x) => x.id === triagemId);
      if (t && (t.status === "CONCLUIDO" || t.status === "ERRO")) {
        setTriagens(data);
        clearInterval(interval);
      }
    }, 3000);
  }

  const triagensFiltradas = triagens.filter((t) => {
    if (scoreMinimo && t.score != null) {
      return t.score >= parseFloat(scoreMinimo);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Triagem de candidatos</h2>
          <p className="text-sm text-muted-foreground">
            {triagens.length} candidato(s) vinculado(s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            placeholder="Score mínimo"
            className="w-[130px]"
            value={scoreMinimo}
            onChange={(e) => setScoreMinimo(e.target.value)}
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
              onClick={carregarCandidatos}
            >
              <UserPlus className="h-4 w-4" />
              Vincular Candidato
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vincular candidato à vaga</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Select
                  value={candidatoSelecionado}
                  onValueChange={(v) => setCandidatoSelecionado(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um candidato" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidatosDisponiveis.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={vincularCandidato} disabled={!candidatoSelecionado}>
                    Vincular e Analisar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabela de triagem */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="h-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ) : triagensFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum candidato encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                triagensFiltradas.map((t) => {
                  const isExpanded = expandedId === t.id;
                  let checklist: ChecklistItem[] = [];
                  if (t.checklist) {
                    try {
                      checklist = JSON.parse(t.checklist);
                    } catch { /* ignore */ }
                  }

                  return (
                    <>
                      <TableRow
                        key={t.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      >
                        <TableCell>
                          <p className="font-medium">{t.candidato.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.candidato.email}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {t.candidato.skills.slice(0, 4).map((s) => (
                              <Badge
                                key={s.nome}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {s.nome}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
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
                            "—"
                          )}
                          {t.desatualizado && (
                            <div className="flex items-center justify-center gap-1 text-[10px] text-warning">
                              <AlertTriangle className="h-3 w-3" />
                              Desatualizado
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              t.status === "CONCLUIDO"
                                ? "default"
                                : t.status === "ERRO"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {t.status === "CONCLUIDO"
                              ? "Concluído"
                              : t.status === "PROCESSANDO"
                                ? "Analisando..."
                                : t.status === "ERRO"
                                  ? "Erro"
                                  : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(t.status === "PENDENTE" ||
                              t.status === "ERRO" ||
                              t.desatualizado) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  analisar(t.id);
                                }}
                              >
                                <RotateCw className="h-3 w-3" />
                                {t.desatualizado ? "Reanalisar" : "Analisar"}
                              </Button>
                            )}
                            {t.status === "CONCLUIDO" && (
                              <Link
                                href={`/vagas/${vagaId}/triagem/${t.candidato.id}/entrevistas`}
                                onClick={(e) => e.stopPropagation()}
                                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1 text-xs")}
                              >
                                <Calendar className="h-3 w-3" />
                                Entrevistas
                              </Link>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && t.status === "CONCLUIDO" && (
                        <TableRow key={`${t.id}-detail`}>
                          <TableCell colSpan={5} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              {/* Análise */}
                              <div>
                                <h4 className="text-sm font-semibold mb-1">
                                  Análise
                                </h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {t.analise}
                                </p>
                              </div>
                              {/* Checklist */}
                              {checklist.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">
                                    Checklist de Requisitos
                                  </h4>
                                  <div className="space-y-1.5">
                                    {checklist.map((item, i) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2 text-sm"
                                      >
                                        <span
                                          className={
                                            item.atende
                                              ? "text-success"
                                              : "text-destructive"
                                          }
                                        >
                                          {item.atende ? "✓" : "✗"}
                                        </span>
                                        <div>
                                          <span className="font-medium">
                                            {item.requisito}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="ml-2 text-[10px] px-1 py-0"
                                          >
                                            {item.tipo === "OBRIGATORIO"
                                              ? "Obrigatório"
                                              : "Desejável"}
                                          </Badge>
                                          {item.observacao && (
                                            <p className="text-muted-foreground mt-0.5">
                                              {item.observacao}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
