"use client";
import { apiFetch } from "@/lib/api-fetch";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ETAPA_STATUS_LABEL } from "@/lib/vaga-etapas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Calendar, Edit2, Trash2 } from "lucide-react";

interface Entrevista {
  id: string;
  dataHora: string;
  entrevistador: string;
  status: string;
  observacoes: string | null;
  resultado: string | null;
  vagaEtapa: {
    id: string;
    nome: string;
  } | null;
}

interface TriagemInfo {
  id: string;
  score: number | null;
  candidato: { nome: string; email: string };
  vaga: { titulo: string };
  etapas: {
    id: string;
    status: string;
    vagaEtapa: {
      id: string;
      nome: string;
      tipo: string;
    };
  }[];
}

const statusLabels: Record<string, string> = {
  AGENDADA: "Agendada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
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

export default function EntrevistasPage() {
  const params = useParams();
  const vagaId = params.id as string;
  const candidatoId = params.candidatoId as string;

  const [triagem, setTriagem] = useState<TriagemInfo | null>(null);
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
  const [loading, setLoading] = useState(true);

  // Form nova entrevista
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dataHora, setDataHora] = useState("");
  const [entrevistador, setEntrevistador] = useState("");
  const [vagaEtapaId, setVagaEtapaId] = useState("");

  // Form edição
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");
  const [editResultado, setEditResultado] = useState("");

  const carregarDados = useCallback(async () => {
    // Buscar triagem pelo par vagaId + candidatoId
    const resTriagens = await apiFetch(`/api/triagens?vagaId=${vagaId}`);
    const triagens = await resTriagens.json();
    const t = triagens.find(
      (x: { candidato: { id: string } }) => x.candidato.id === candidatoId,
    );

    if (t) {
      // Buscar detalhe da triagem
      const resDetalhe = await apiFetch(`/api/triagens/${t.id}`);
      const detalhe = await resDetalhe.json();
      setTriagem({
        id: detalhe.id,
        score: detalhe.score,
        candidato: { nome: detalhe.candidato.nome, email: detalhe.candidato.email },
        vaga: { titulo: detalhe.vaga.titulo },
        etapas: detalhe.etapas || [],
      });
      setEntrevistas(detalhe.entrevistas || []);
      const etapaAtualEntrevista = (detalhe.etapas || []).find(
        (etapa: TriagemInfo["etapas"][number]) =>
          etapa.vagaEtapa.tipo === "ENTREVISTA" && etapa.status !== "CONCLUIDO" && etapa.status !== "REPROVADO",
      );
      setVagaEtapaId(etapaAtualEntrevista?.vagaEtapa.id ?? "");
    }
    setLoading(false);
  }, [vagaId, candidatoId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarDados();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarDados]);

  async function criarEntrevista() {
    if (!triagem || !dataHora || !entrevistador) return;

    await apiFetch("/api/entrevistas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        triagemId: triagem.id,
        vagaEtapaId: vagaEtapaId || null,
        dataHora,
        entrevistador,
      }),
    });

    setDialogOpen(false);
    setDataHora("");
    setEntrevistador("");
    setVagaEtapaId("");
    carregarDados();
  }

  async function atualizarEntrevista(id: string) {
    await apiFetch(`/api/entrevistas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: editStatus,
        observacoes: editObservacoes || null,
        resultado: editResultado || null,
      }),
    });

    setEditId(null);
    carregarDados();
  }

  async function excluirEntrevista(id: string) {
    if (!confirm("Excluir esta entrevista?")) return;
    await apiFetch(`/api/entrevistas/${id}`, { method: "DELETE" });
    carregarDados();
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  }

  if (!triagem) {
    return <p className="text-muted-foreground">Triagem não encontrada.</p>;
  }

  const etapasEntrevista = triagem.etapas.filter((etapa) => etapa.vagaEtapa.tipo === "ENTREVISTA");
  const etapaSelecionada = etapasEntrevista.find((etapa) => etapa.vagaEtapa.id === vagaEtapaId) ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Info do candidato + vaga */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold">{triagem.candidato.nome}</p>
            <p className="text-sm text-muted-foreground">
              {triagem.vaga.titulo} · {triagem.candidato.email}
            </p>
          </div>
          {triagem.score != null && (
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{triagem.score}%</p>
              <p className="text-xs text-muted-foreground">Compatibilidade</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header entrevistas */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Entrevistas ({entrevistas.length})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <Plus className="h-4 w-4" />
            Agendar Entrevista
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar nova entrevista</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Data e Horário *</Label>
                <Input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Entrevistador *</Label>
                <Input
                  placeholder="Nome do entrevistador"
                  value={entrevistador}
                  onChange={(e) => setEntrevistador(e.target.value)}
                />
              </div>
              {etapasEntrevista.length > 0 && (
                <div className="space-y-2">
                  <Label>Etapa vinculada</Label>
                  <Select value={vagaEtapaId} onValueChange={(value) => setVagaEtapaId(value ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa">
                        {etapaSelecionada
                          ? `${etapaSelecionada.vagaEtapa.nome} · ${ETAPA_STATUS_LABEL[etapaSelecionada.status]}`
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {etapasEntrevista.map((etapa) => (
                        <SelectItem key={etapa.id} value={etapa.vagaEtapa.id}>
                          {etapa.vagaEtapa.nome} · {ETAPA_STATUS_LABEL[etapa.status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={criarEntrevista}
                  disabled={!dataHora || !entrevistador}
                >
                  Agendar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de entrevistas */}
      {entrevistas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p>Nenhuma entrevista agendada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entrevistas.map((ent) => {
            const isEditing = editId === ent.id;
            const data = new Date(ent.dataHora);

            return (
              <Card key={ent.id}>
                <CardContent className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Status</Label>
                          <Select value={editStatus} onValueChange={(v) => setEditStatus(v ?? "")}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AGENDADA">Agendada</SelectItem>
                              <SelectItem value="REALIZADA">Realizada</SelectItem>
                              <SelectItem value="CANCELADA">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Resultado</Label>
                          <Select value={editResultado} onValueChange={(v) => setEditResultado(v ?? "")}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="APROVADO">Aprovado</SelectItem>
                              <SelectItem value="REPROVADO">Reprovado</SelectItem>
                              <SelectItem value="PROXIMA_FASE">Próxima fase</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Observações</Label>
                        <Textarea
                          rows={3}
                          value={editObservacoes}
                          onChange={(e) => setEditObservacoes(e.target.value)}
                          placeholder="Anotações pós-entrevista..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditId(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => atualizarEntrevista(ent.id)}
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {data.toLocaleDateString("pt-BR")} às{" "}
                            {data.toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <Badge variant="outline">
                            {statusLabels[ent.status] ?? ent.status}
                          </Badge>
                          {ent.resultado && (
                            <Badge variant={resultadoVariant[ent.resultado] ?? "outline"}>
                              {resultadoLabels[ent.resultado] ?? ent.resultado}
                            </Badge>
                          )}
                          {ent.vagaEtapa && (
                            <Badge variant="secondary">
                              {ent.vagaEtapa.nome}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Entrevistador: {ent.entrevistador}
                        </p>
                        {ent.observacoes && (
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                            {ent.observacoes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditId(ent.id);
                            setEditStatus(ent.status);
                            setEditObservacoes(ent.observacoes || "");
                            setEditResultado(ent.resultado || "");
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => excluirEntrevista(ent.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
