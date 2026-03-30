"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ETAPA_STATUS_LABEL, ETAPA_TIPO_LABEL } from "@/lib/vaga-etapas";
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
  UserPlus,
  RotateCw,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
  DollarSign,
  Zap,
  Search,
  Loader2,
  Users,
  X,
  Briefcase,
  Filter,
  Trash2,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────

interface Triagem {
  id: string;
  score: number | null;
  status: string;
  analise: string | null;
  checklist: string | null;
  desatualizado: boolean;
  etapas: {
    id: string;
    status: string;
    vagaEtapa: {
      id: string;
      nome: string;
      tipo: keyof typeof ETAPA_TIPO_LABEL;
      ordem: number;
    };
  }[];
  candidato: {
    id: string;
    nome: string;
    email: string;
    skills: { nome: string }[];
  };
}

interface CandidatoCompleto {
  id: string;
  nome: string;
  email: string;
  cidade: string | null;
  cep: string | null;
  jobType: string;
  pretensaoSalarial: number | null;
  skills: { nome: string }[];
  _count: { triagens: number };
}

interface Requisito {
  id: string;
  descricao: string;
  tipo: "OBRIGATORIO" | "DESEJAVEL";
}

interface VagaDetalhe {
  id: string;
  titulo: string;
  area: string;
  jobType: string;
  modalidade: string;
  localizacao: string;
  cep: string | null;
  salarioMin: number | null;
  salarioMax: number | null;
  requisitos: Requisito[];
  etapas: {
    id: string;
    nome: string;
    tipo: keyof typeof ETAPA_TIPO_LABEL;
    ordem: number;
    obrigatoria: boolean;
  }[];
}

interface ChecklistItem {
  requisito: string;
  tipo: string;
  atende: boolean;
  observacao: string;
}

interface CandidatoSugerido extends CandidatoCompleto {
  compatibilidade: number;
  skillsMatch: string[];
  salarioOk: boolean | null;
  localOk: boolean | null;
}

// ── Lógica de compatibilidade básica ─────────────────

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenize(str: string): string[] {
  return normalize(str)
    .split(/[\s,;/\-+()]+/)
    .filter((t) => t.length >= 2);
}

function matchRequisito(skillsNorm: string[], skillTokens: string[][], reqDescricao: string): boolean {
  const reqNorm = normalize(reqDescricao);
  const reqTokens = tokenize(reqDescricao);

  for (const s of skillsNorm) {
    if (reqNorm.includes(s) || s.includes(reqNorm)) return true;
  }

  for (const rt of reqTokens) {
    if (rt.length < 3) continue;
    for (const st of skillTokens) {
      if (st.some((t) => t === rt || (t.length >= 4 && rt.length >= 4 && (t.includes(rt) || rt.includes(t))))) {
        return true;
      }
    }
  }

  return false;
}

function calcularCompatibilidade(
  candidato: CandidatoCompleto,
  vaga: VagaDetalhe,
): CandidatoSugerido {
  const skillsNorm = candidato.skills.map((s) => normalize(s.nome));
  const skillTokens = candidato.skills.map((s) => tokenize(s.nome));

  if (candidato.skills.length === 0) {
    return { ...candidato, compatibilidade: 0, skillsMatch: [], salarioOk: null, localOk: null };
  }

  const skillsMatch: string[] = [];
  let reqObrigMatch = 0, reqObrigTotal = 0, reqDesejMatch = 0, reqDesejTotal = 0;

  for (const req of vaga.requisitos) {
    const match = matchRequisito(skillsNorm, skillTokens, req.descricao);
    if (req.tipo === "OBRIGATORIO") {
      reqObrigTotal++;
      if (match) { reqObrigMatch++; skillsMatch.push(req.descricao); }
    } else {
      reqDesejTotal++;
      if (match) { reqDesejMatch++; skillsMatch.push(req.descricao); }
    }
  }

  const totalReqs = reqObrigTotal + reqDesejTotal;
  if (totalReqs > 0 && skillsMatch.length === 0) {
    return { ...candidato, compatibilidade: 0, skillsMatch: [], salarioOk: null, localOk: null };
  }

  const pesoObrig = reqObrigTotal > 0 ? (reqObrigMatch / reqObrigTotal) * 70 : 0;
  const pesoDesej = reqDesejTotal > 0 ? (reqDesejMatch / reqDesejTotal) * 30 : 0;
  let score = pesoObrig + pesoDesej;

  let salarioOk: boolean | null = null;
  if (candidato.pretensaoSalarial && vaga.salarioMax) {
    salarioOk = candidato.pretensaoSalarial <= vaga.salarioMax * 1.1;
    if (salarioOk) score = Math.min(100, score + 10);
  }

  let localOk: boolean | null = null;
  if (candidato.cep && vaga.cep) {
    const prefixoCand = candidato.cep.replace(/\D/g, "").slice(0, 3);
    const prefixoVaga = vaga.cep.replace(/\D/g, "").slice(0, 3);
    localOk = prefixoCand === prefixoVaga;
    if (localOk) score = Math.min(100, score + 10);
  } else if (vaga.modalidade === "REMOTO") {
    localOk = true;
    score = Math.min(100, score + 10);
  }

  return { ...candidato, compatibilidade: Math.round(score), skillsMatch, salarioOk, localOk };
}

function getEtapaAtual(triagem: Triagem) {
  return triagem.etapas.find((etapa) => etapa.status === "EM_ANDAMENTO")
    ?? triagem.etapas.find((etapa) => etapa.status === "PENDENTE")
    ?? triagem.etapas[triagem.etapas.length - 1]
    ?? null;
}

// ── Componente ───────────────────────────────────────

export default function TriagemPage() {
  const params = useParams();
  const vagaId = params.id as string;

  const [triagens, setTriagens] = useState<Triagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scoreMinimo, setScoreMinimo] = useState("");

  // Painel de sugeridos
  const [vaga, setVaga] = useState<VagaDetalhe | null>(null);
  const [todosCandidatos, setTodosCandidatos] = useState<CandidatoCompleto[]>([]);
  const [loadingSugeridos, setLoadingSugeridos] = useState(true);
  const [buscaSugerido, setBuscaSugerido] = useState("");
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [removendoTriagemId, setRemovendoTriagemId] = useState<string | null>(null);
  const [triagemParaRemover, setTriagemParaRemover] = useState<Triagem | null>(null);

  // Modal de adicionar candidato
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBusca, setModalBusca] = useState("");
  const [modalFiltroTipo, setModalFiltroTipo] = useState("");
  const [modalFiltroCidade, setModalFiltroCidade] = useState("");
  const [modalCandidatos, setModalCandidatos] = useState<CandidatoCompleto[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalTotalPages, setModalTotalPages] = useState(1);

  // ── Data fetching ──

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

  useEffect(() => {
    Promise.all([
      fetch(`/api/vagas/${vagaId}`).then((r) => r.json()),
      fetch("/api/candidatos?page=1&pageSize=100").then((r) => r.json()),
    ])
      .then(([vagaData, candidatosData]) => {
        setVaga(vagaData);
        setTodosCandidatos(Array.isArray(candidatosData?.items) ? candidatosData.items : []);
      })
      .catch(console.error)
      .finally(() => setLoadingSugeridos(false));
  }, [vagaId]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const params = new URLSearchParams({
      page: String(modalPage),
      pageSize: "10",
    });

    if (modalBusca.trim()) {
      params.set("busca", modalBusca.trim());
    }
    if (modalFiltroTipo) {
      params.set("jobType", modalFiltroTipo);
    }
    if (modalFiltroCidade) {
      params.set("cidade", modalFiltroCidade);
    }

    const timeoutId = window.setTimeout(() => {
      setModalLoading(true);

      fetch(`/api/candidatos?${params}`)
        .then(async (r) => {
          const text = await r.text();
          const data = text ? JSON.parse(text) : null;

          if (!r.ok) {
            throw new Error(data?.error || "Erro ao carregar candidatos");
          }

          return data;
        })
        .then((data) => {
          setModalCandidatos(Array.isArray(data?.items) ? data.items : []);
          setModalTotal(typeof data?.total === "number" ? data.total : 0);
          setModalTotalPages(typeof data?.totalPages === "number" ? data.totalPages : 1);
        })
        .catch((error) => {
          console.error(error);
          setModalCandidatos([]);
          setModalTotal(0);
          setModalTotalPages(1);
        })
        .finally(() => setModalLoading(false));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [modalOpen, modalBusca, modalFiltroTipo, modalFiltroCidade, modalPage]);

  // ── Candidatos sugeridos ──

  const sugeridos = useMemo(() => {
    if (!vaga || todosCandidatos.length === 0) return [];

    const idsVinculados = new Set(triagens.map((t) => t.candidato.id));
    const disponiveis = todosCandidatos.filter((c) => !idsVinculados.has(c.id));

    const filtradosPorTipo = vaga.jobType
      ? disponiveis.filter(
          (c) => c.jobType && normalize(c.jobType) === normalize(vaga.jobType!),
        )
      : disponiveis;

    const comScore = filtradosPorTipo
      .map((c) => calcularCompatibilidade(c, vaga))
      .filter((c) => vaga.jobType ? true : c.compatibilidade >= 50)
      .sort((a, b) => b.compatibilidade - a.compatibilidade);

    if (buscaSugerido.trim()) {
      const termo = normalize(buscaSugerido);
      return comScore.filter(
        (c) =>
          normalize(c.nome).includes(termo) ||
          normalize(c.email).includes(termo) ||
          c.skills.some((s) => normalize(s.nome).includes(termo)),
      );
    }

    return comScore;
  }, [vaga, todosCandidatos, triagens, buscaSugerido]);

  // ── Modal: todos os candidatos disponíveis com filtros ──

  const candidatosModal = useMemo(() => {
    const idsVinculados = new Set(triagens.map((t) => t.candidato.id));
    return modalCandidatos.filter((c) => !idsVinculados.has(c.id));
  }, [modalCandidatos, triagens]);

  // Valores únicos para chips de filtro
  const tiposUnicos = useMemo(() => {
    const set = new Set<string>();
    todosCandidatos.forEach((c) => { if (c.jobType) set.add(c.jobType); });
    return Array.from(set).sort();
  }, [todosCandidatos]);

  const cidadesUnicas = useMemo(() => {
    const set = new Set<string>();
    todosCandidatos.forEach((c) => { if (c.cidade) set.add(c.cidade); });
    return Array.from(set).sort();
  }, [todosCandidatos]);

  // ── Ações ──

  async function vincularCandidato(candidatoId: string) {
    setVinculando(candidatoId);
    try {
      const res = await fetch("/api/triagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vagaId, candidatoId }),
      });
      if (res.ok) carregarTriagens();
    } finally {
      setVinculando(null);
    }
  }

  async function analisar(triagemId: string) {
    await fetch(`/api/triagens/${triagemId}/analisar`, { method: "POST" });
    setTriagens((prev) =>
      prev.map((t) => (t.id === triagemId ? { ...t, status: "PROCESSANDO" } : t)),
    );
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

  async function removerTriagem(triagem: Triagem) {
    setRemovendoTriagemId(triagem.id);
    try {
      const res = await fetch(`/api/triagens/${triagem.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Erro ao remover candidato da triagem");
      }

      setTriagens((prev) => prev.filter((item) => item.id !== triagem.id));
      if (expandedId === triagem.id) {
        setExpandedId(null);
      }
      setTriagemParaRemover(null);
    } catch (error) {
      console.error(error);
      alert("Não foi possível remover o candidato da triagem.");
    } finally {
      setRemovendoTriagemId(null);
    }
  }

  // ── Filtro triagens ──

  const triagensFiltradas = triagens.filter((t) => {
    if (scoreMinimo && t.score != null) {
      return t.score >= parseFloat(scoreMinimo);
    }
    return true;
  });

  const activeModalFilters = [
    modalFiltroTipo && `Tipo: ${modalFiltroTipo}`,
    modalFiltroCidade && `Cidade: ${modalFiltroCidade}`,
  ].filter(Boolean).length;

  // ── Render ──

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Triagem de candidatos</h2>
          <p className="text-sm text-muted-foreground">
            {vaga?.titulo && (
              <span className="font-medium text-foreground">{vaga.titulo}</span>
            )}
            {" · "}{triagens.length} candidato(s) vinculado(s)
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

          {/* Botão para abrir modal de adicionar */}
          <Dialog
            open={modalOpen}
            onOpenChange={(open) => {
              setModalOpen(open);
              if (open) {
                setModalPage(1);
              }
            }}
          >
            <DialogTrigger
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <Users className="h-4 w-4" />
              Adicionar Candidato
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Adicionar candidato à triagem
                </DialogTitle>
              </DialogHeader>

              {/* Barra de busca + filtros */}
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou skill..."
                    className="pl-9"
                    value={modalBusca}
                    onChange={(e) => {
                      setModalBusca(e.target.value);
                      setModalPage(1);
                    }}
                    autoFocus
                  />
                </div>

                {/* Filtros em chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />

                  {/* Tipo de trabalho */}
                  {tiposUnicos.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        setModalFiltroTipo(modalFiltroTipo === tipo ? "" : tipo);
                        setModalPage(1);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        modalFiltroTipo === tipo
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Briefcase className="h-3 w-3" />
                      {tipo}
                    </button>
                  ))}

                  <span className="h-4 w-px bg-border" />

                  {/* Cidades */}
                  {cidadesUnicas.slice(0, 5).map((cidade) => (
                    <button
                      key={cidade}
                      type="button"
                      onClick={() => {
                        setModalFiltroCidade(modalFiltroCidade === cidade ? "" : cidade);
                        setModalPage(1);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        modalFiltroCidade === cidade
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <MapPin className="h-3 w-3" />
                      {cidade}
                    </button>
                  ))}

                  {/* Limpar filtros */}
                  {activeModalFilters > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalFiltroTipo("");
                        setModalFiltroCidade("");
                        setModalPage(1);
                      }}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Contagem */}
              <div className="flex items-center justify-between border-b pb-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  {modalTotal} candidato{modalTotal !== 1 ? "s" : ""} encontrado{modalTotal !== 1 ? "s" : ""}
                </p>
                {activeModalFilters > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {activeModalFilters} filtro{activeModalFilters > 1 ? "s" : ""} ativo{activeModalFilters > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {/* Lista de candidatos */}
              <div className="relative min-h-[360px] flex-1 overflow-y-auto overflow-x-hidden -mx-2 px-2">
                <div
                  className={cn(
                    "space-y-1.5 py-1 transition-opacity duration-200",
                    modalLoading && "opacity-60",
                  )}
                >
                {candidatosModal.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum candidato encontrado
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Tente ajustar os filtros ou a busca
                    </p>
                  </div>
                ) : (
                  candidatosModal.map((c) => {
                    const isVinc = vinculando === c.id;
                    return (
                      <div
                        key={c.id}
                        className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        {/* Avatar placeholder */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {c.nome.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {c.nome}
                            </p>
                            {c.jobType && (
                              <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                                {c.jobType}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.email}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden">
                            {/* Skills */}
                            <div className="flex flex-wrap gap-1">
                              {c.skills.slice(0, 3).map((s) => (
                                <Badge
                                  key={s.nome}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 whitespace-nowrap"
                                >
                                  {s.nome}
                                </Badge>
                              ))}
                              {c.skills.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{c.skills.length - 3}
                                </span>
                              )}
                            </div>
                            {c.cidade && (
                              <>
                                <span className="h-3 w-px bg-border shrink-0" />
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground whitespace-nowrap">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  {c.cidade}
                                </span>
                              </>
                            )}
                            {c.pretensaoSalarial && (
                              <>
                                <span className="h-3 w-px bg-border shrink-0" />
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground whitespace-nowrap">
                                  <DollarSign className="h-2.5 w-2.5 shrink-0" />
                                  R$ {c.pretensaoSalarial.toLocaleString("pt-BR")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Ação */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={isVinc}
                          onClick={() => vincularCandidato(c.id)}
                        >
                          {isVinc ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          {isVinc ? "..." : "Vincular"}
                        </Button>
                      </div>
                    );
                  })
                )}
                </div>
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 flex justify-center transition-opacity duration-200",
                    modalLoading ? "opacity-100" : "opacity-0",
                  )}
                >
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Atualizando resultados
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Página {modalPage} de {modalTotalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={modalPage <= 1 || modalLoading}
                    onClick={() => setModalPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={modalPage >= modalTotalPages || modalLoading}
                    onClick={() => setModalPage((current) => Math.min(modalTotalPages, current + 1))}
                  >
                    Próxima
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
                <TableHead>Etapa atual</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="h-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ) : triagensFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum candidato vinculado ainda. Veja as sugestões abaixo.
                  </TableCell>
                </TableRow>
              ) : (
                triagensFiltradas.map((t) => {
                  const isExpanded = expandedId === t.id;
                  let checklist: ChecklistItem[] = [];
                  if (t.checklist) {
                    try { checklist = JSON.parse(t.checklist); } catch { /* ignore */ }
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
                          <p className="text-xs text-muted-foreground">{t.candidato.email}</p>
                        </TableCell>
                        <TableCell>
                          {getEtapaAtual(t) ? (
                            <div className="space-y-1">
                              <Badge variant="secondary" className="text-[10px]">
                                {getEtapaAtual(t)?.vagaEtapa.nome}
                              </Badge>
                              <p className="text-[11px] text-muted-foreground">
                                {ETAPA_STATUS_LABEL[getEtapaAtual(t)?.status ?? "PENDENTE"]}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem etapas</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {t.candidato.skills.slice(0, 4).map((s) => (
                              <Badge key={s.nome} variant="outline" className="text-[10px] px-1.5 py-0">
                                {s.nome}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {t.score != null ? (
                            <span className={`text-lg font-bold ${t.score >= 70 ? "text-success" : t.score >= 40 ? "text-warning" : "text-destructive"}`}>
                              {t.score}%
                            </span>
                          ) : "—"}
                          {t.desatualizado && (
                            <div className="flex items-center justify-center gap-1 text-[10px] text-warning">
                              <AlertTriangle className="h-3 w-3" />
                              Desatualizado
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.status === "CONCLUIDO" ? "default" : t.status === "ERRO" ? "destructive" : "secondary"}>
                            {t.status === "CONCLUIDO" ? "Concluído" : t.status === "PROCESSANDO" ? "Analisando..." : t.status === "ERRO" ? "Erro" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(t.status === "PENDENTE" || t.status === "ERRO" || t.desatualizado) && (
                              <Button
                                size="sm" variant="outline" className="gap-1 text-xs"
                                onClick={(e) => { e.stopPropagation(); analisar(t.id); }}
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
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={removendoTriagemId === t.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setTriagemParaRemover(t);
                              }}
                            >
                              {removendoTriagemId === t.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && t.status === "CONCLUIDO" && (
                        <TableRow key={`${t.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              {t.etapas.length > 0 && (
                                <div>
                                  <h4 className="mb-2 text-sm font-semibold">Pipeline da vaga</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {t.etapas.map((etapa) => (
                                      <div key={etapa.id} className="rounded-md border bg-background px-2 py-1 text-xs">
                                        <p className="font-medium">{etapa.vagaEtapa.nome}</p>
                                        <p className="text-muted-foreground">
                                          {ETAPA_TIPO_LABEL[etapa.vagaEtapa.tipo]} · {ETAPA_STATUS_LABEL[etapa.status]}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <h4 className="text-sm font-semibold mb-1">Análise</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.analise}</p>
                              </div>
                              {checklist.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Checklist de Requisitos</h4>
                                  <div className="space-y-1.5">
                                    {checklist.map((item, i) => (
                                      <div key={i} className="flex items-start gap-2 text-sm">
                                        <span className={item.atende ? "text-success" : "text-destructive"}>
                                          {item.atende ? "✓" : "✗"}
                                        </span>
                                        <div>
                                          <span className="font-medium">{item.requisito}</span>
                                          <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                                            {item.tipo === "OBRIGATORIO" ? "Obrigatório" : "Desejável"}
                                          </Badge>
                                          {item.observacao && <p className="text-muted-foreground mt-0.5">{item.observacao}</p>}
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

      {/* ── Candidatos Sugeridos ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Candidatos Sugeridos</h3>
              <p className="text-xs text-muted-foreground">
                {vaga?.jobType
                  ? `Filtrados por tipo: ${vaga.jobType}`
                  : "Filtro básico por skills, salário e localização"}
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar candidato ou skill..."
              className="w-[250px] pl-8"
              value={buscaSugerido}
              onChange={(e) => setBuscaSugerido(e.target.value)}
            />
          </div>
        </div>

        {loadingSugeridos ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : sugeridos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum candidato compatível encontrado
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Candidatos precisam ter skills que correspondam aos requisitos da vaga
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sugeridos.map((c) => {
              const isVinculando = vinculando === c.id;

              return (
                <Card
                  key={c.id}
                  className={cn(
                    "group relative overflow-hidden transition-all hover:shadow-md",
                    c.compatibilidade >= 50 && "ring-1 ring-primary/20",
                  )}
                >
                  <div className="h-1 w-full bg-muted">
                    <div
                      className={cn(
                        "h-full transition-all",
                        c.compatibilidade >= 70 ? "bg-success" : c.compatibilidade >= 40 ? "bg-warning" : "bg-muted-foreground/30",
                      )}
                      style={{ width: `${c.compatibilidade}%` }}
                    />
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <Link href={`/candidatos/${c.id}`} className="text-sm font-semibold hover:text-primary truncate block">
                          {c.nome}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        {c.jobType && (
                          <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">{c.jobType}</Badge>
                        )}
                      </div>
                      <div className={cn(
                        "ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        c.compatibilidade >= 70 ? "bg-success/10 text-success" : c.compatibilidade >= 40 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground",
                      )}>
                        {c.compatibilidade}%
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {c.skillsMatch.length > 0 && (
                        <div className="flex items-center gap-1 rounded-md bg-primary/5 px-2 py-0.5 text-[11px] text-primary">
                          <Zap className="h-3 w-3" />
                          {c.skillsMatch.length} requisito{c.skillsMatch.length > 1 ? "s" : ""}
                        </div>
                      )}
                      {c.salarioOk !== null && (
                        <div className={cn("flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]", c.salarioOk ? "bg-success/5 text-success" : "bg-destructive/5 text-destructive")}>
                          <DollarSign className="h-3 w-3" />
                          {c.salarioOk ? "Compatível" : "Acima"}
                        </div>
                      )}
                      {c.localOk !== null && (
                        <div className={cn("flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]", c.localOk ? "bg-success/5 text-success" : "bg-muted text-muted-foreground")}>
                          <MapPin className="h-3 w-3" />
                          {c.localOk ? "Região" : "Distante"}
                        </div>
                      )}
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1">
                      {c.skills.slice(0, 5).map((s) => {
                        const isMatch = c.skillsMatch.some(
                          (m) => normalize(m).includes(normalize(s.nome)) || normalize(s.nome).includes(normalize(m)),
                        );
                        return (
                          <Badge key={s.nome} variant={isMatch ? "default" : "outline"} className={cn("text-[10px] px-1.5 py-0", isMatch && "bg-primary/90")}>
                            {s.nome}
                          </Badge>
                        );
                      })}
                      {c.skills.length > 5 && (
                        <span className="text-[10px] text-muted-foreground self-center">+{c.skills.length - 5}</span>
                      )}
                    </div>

                    <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                      {c.cidade && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {c.cidade}
                        </span>
                      )}
                      {c.pretensaoSalarial && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 shrink-0" />
                          R$ {c.pretensaoSalarial.toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>

                    <Button
                      size="sm" className="w-full gap-1.5"
                      disabled={isVinculando}
                      onClick={() => vincularCandidato(c.id)}
                    >
                      {isVinculando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                      {isVinculando ? "Vinculando..." : "Vincular à Vaga"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={triagemParaRemover !== null}
        onOpenChange={(open) => {
          if (!open && removendoTriagemId === null) {
            setTriagemParaRemover(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover candidato da triagem?</AlertDialogTitle>
            <AlertDialogDescription>
              {triagemParaRemover
                ? `Isso remove ${triagemParaRemover.candidato.nome} da triagem desta vaga.`
                : "Confirme a remoção deste candidato da triagem."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendoTriagemId !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!triagemParaRemover || removendoTriagemId !== null}
              onClick={() => {
                if (triagemParaRemover) {
                  void removerTriagem(triagemParaRemover);
                }
              }}
            >
              {removendoTriagemId ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
