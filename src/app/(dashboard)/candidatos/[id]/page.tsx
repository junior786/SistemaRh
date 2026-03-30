"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Briefcase,
  GraduationCap,
  Calendar,
  User,
  AlertTriangle,
  StickyNote,
  Save,
  CheckCircle2,
} from "lucide-react";

interface Skill {
  nome: string;
}

interface Experiencia {
  id: string;
  empresa: string;
  cargo: string;
  descricao: string | null;
  dataInicio: string;
  dataFim: string | null;
  atual: boolean;
}

interface Formacao {
  id: string;
  instituicao: string;
  curso: string;
  nivel: string;
  dataInicio: string;
  dataFim: string | null;
  atual: boolean;
}

interface Triagem {
  id: string;
  score: number | null;
  status: string;
  desatualizado: boolean;
  vaga: { id: string; titulo: string; area: string };
}

interface Restricao {
  id: string;
  descricao: string;
}

interface Candidato {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  cep: string | null;
  genero: string | null;
  resumo: string | null;
  jobType: string;
  pretensaoSalarial: number | null;
  observacao: string | null;
  statusEmprego: string;
  skills: Skill[];
  experiencias: Experiencia[];
  formacoes: Formacao[];
  triagens: Triagem[];
  restricoes: Restricao[];
}

const statusEmpregoMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  DISPONIVEL: { label: "Disponível", variant: "default" },
  EMPREGADO: { label: "Empregado", variant: "secondary" },
  INATIVO: { label: "Inativo", variant: "destructive" },
};

const nivelLabels: Record<string, string> = {
  TECNICO: "Técnico",
  GRADUACAO: "Graduação",
  POS_GRADUACAO: "Pós-graduação",
  MBA: "MBA",
  MESTRADO: "Mestrado",
  DOUTORADO: "Doutorado",
  CURSO_LIVRE: "Curso Livre",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function calcTempo(inicio: string, fim: string | null): string {
  const d1 = new Date(inicio);
  const d2 = fim ? new Date(fim) : new Date();
  const meses = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  if (anos === 0) return `${m} meses`;
  if (m === 0) return `${anos} ano${anos > 1 ? "s" : ""}`;
  return `${anos} ano${anos > 1 ? "s" : ""} e ${m} meses`;
}

export default function PerfilCandidatoPage() {
  const params = useParams();
  const candidatoId = params.id as string;
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [loading, setLoading] = useState(true);
  const [obsEdit, setObsEdit] = useState("");
  const [obsEditing, setObsEditing] = useState(false);
  const [obsSaving, setObsSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/candidatos/${candidatoId}`)
      .then((r) => r.json())
      .then((data) => {
        setCandidato(data);
        setObsEdit(data.observacao || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [candidatoId]);

  async function salvarObservacao() {
    setObsSaving(true);
    try {
      await fetch(`/api/candidatos/${candidatoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacao: obsEdit || null }),
      });
      setCandidato((c) => c ? { ...c, observacao: obsEdit || null } : c);
      setObsEditing(false);
    } catch {
      alert("Erro ao salvar observação");
    } finally {
      setObsSaving(false);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!candidato) return <p className="text-muted-foreground">Candidato não encontrado.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{candidato.nome}</h2>
            <Badge variant="outline" className="text-xs">{candidato.jobType}</Badge>
            <Badge variant={statusEmpregoMap[candidato.statusEmprego]?.variant ?? "secondary"} className="text-xs">
              {statusEmpregoMap[candidato.statusEmprego]?.label ?? candidato.statusEmprego}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {candidato.email}
            </span>
            {candidato.telefone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {candidato.telefone}
              </span>
            )}
            {candidato.cidade && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {candidato.cidade}
              </span>
            )}
            {candidato.cep && (
              <span className="text-xs">CEP: {candidato.cep}</span>
            )}
            {candidato.genero && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {candidato.genero}
              </span>
            )}
            {candidato.pretensaoSalarial && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> R${" "}
                {candidato.pretensaoSalarial.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <Link href={`/candidatos/${candidatoId}/editar`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Editar
        </Link>
      </div>

      {/* Skills */}
      {candidato.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {candidato.skills.map((s) => (
            <Badge key={s.nome} variant="secondary">
              {s.nome}
            </Badge>
          ))}
        </div>
      )}

      {/* Resumo */}
      {candidato.resumo && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-2 font-semibold">Resumo</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {candidato.resumo}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Restrições */}
      {candidato.restricoes.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Restrições / Informações Relevantes
            </h3>
            <div className="space-y-1.5">
              {candidato.restricoes.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 rounded-md bg-warning/5 px-3 py-2">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  <span className="text-sm">{r.descricao}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações — editável inline */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <StickyNote className="h-4 w-4 text-primary" />
              Observações do RH
            </h3>
            {!obsEditing ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setObsEditing(true)}
              >
                Editar
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setObsEdit(candidato.observacao || "");
                    setObsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={obsSaving}
                  onClick={salvarObservacao}
                >
                  <Save className="h-3 w-3" />
                  {obsSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </div>
          {obsEditing ? (
            <Textarea
              rows={3}
              placeholder="Notas internas sobre o candidato..."
              value={obsEdit}
              onChange={(e) => setObsEdit(e.target.value)}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {candidato.observacao || "Nenhuma observação registrada."}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Experiências */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Briefcase className="h-4 w-4" />
              Experiências ({candidato.experiencias.length})
            </h3>
            {candidato.experiencias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma experiência cadastrada.</p>
            ) : (
              <div className="space-y-4">
                {candidato.experiencias.map((exp) => (
                  <div key={exp.id} className="border-l-2 border-primary/20 pl-4">
                    <p className="font-medium">{exp.cargo}</p>
                    <p className="text-sm text-muted-foreground">{exp.empresa}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(exp.dataInicio)} — {exp.atual ? "Presente" : exp.dataFim ? formatDate(exp.dataFim) : "—"}
                      <span className="text-primary font-medium">
                        ({calcTempo(exp.dataInicio, exp.dataFim)})
                      </span>
                    </div>
                    {exp.descricao && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {exp.descricao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formações */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <GraduationCap className="h-4 w-4" />
              Formação ({candidato.formacoes.length})
            </h3>
            {candidato.formacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada.</p>
            ) : (
              <div className="space-y-4">
                {candidato.formacoes.map((f) => (
                  <div key={f.id} className="border-l-2 border-primary/20 pl-4">
                    <p className="font-medium">{f.curso}</p>
                    <p className="text-sm text-muted-foreground">
                      {f.instituicao} · {nivelLabels[f.nivel] ?? f.nivel}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(f.dataInicio)} — {f.atual ? "Cursando" : f.dataFim ? formatDate(f.dataFim) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Triagens / Vagas vinculadas — mostra se candidato foi contratado */}
      {candidato.triagens.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">
              Vagas vinculadas ({candidato.triagens.length})
            </h3>
            <div className="space-y-2">
              {candidato.triagens.map((t) => (
                <Link
                  key={t.id}
                  href={`/vagas/${t.vaga.id}/triagem`}
                  className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{t.vaga.titulo}</p>
                    <p className="text-xs text-muted-foreground">{t.vaga.area}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
                      <Badge variant="outline" className="text-xs">
                        Pendente
                      </Badge>
                    )}
                    {t.desatualizado && (
                      <Badge variant="secondary" className="text-[10px]">
                        Desatualizado
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
