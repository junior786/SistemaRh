"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Briefcase,
  GraduationCap,
  Calendar,
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

interface Candidato {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  cep: string | null;
  resumo: string | null;
  jobType: string;
  pretensaoSalarial: number | null;
  skills: Skill[];
  experiencias: Experiencia[];
  formacoes: Formacao[];
  triagens: Triagem[];
}

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

  useEffect(() => {
    fetch(`/api/candidatos/${candidatoId}`)
      .then((r) => r.json())
      .then(setCandidato)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [candidatoId]);

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

      {/* Triagens / Vagas vinculadas */}
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
