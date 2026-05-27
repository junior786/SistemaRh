"use client";
import { apiFetch } from "@/lib/api-fetch";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EtapasForm } from "@/components/vagas/etapas-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getDefaultEtapas, type EtapaFormInput } from "@/lib/vaga-etapas";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Save, Loader2, Clock, Check } from "lucide-react";
import { AREAS_ATUACAO_PADRAO } from "@/lib/areas";
import { type FormErrors, validateVagaFields } from "@/lib/form-validations";

interface Requisito {
  descricao: string;
  tipo: "OBRIGATORIO" | "DESEJAVEL";
  tempoMeses: number | null;
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-destructive mt-1">{error}</p>;
}

export default function EditarVagaPage() {
  const params = useParams();
  const router = useRouter();
  const vagaId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [areasDisponiveis, setAreasDisponiveis] = useState<string[]>([]);

  const [titulo, setTitulo] = useState("");
  const [area, setArea] = useState("");
  const [jobType, setJobType] = useState("");
  const [regime, setRegime] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [cep, setCep] = useState("");
  const [salarioMin, setSalarioMin] = useState("");
  const [salarioMax, setSalarioMax] = useState("");
  const [descricao, setDescricao] = useState("");
  const [areasVaga, setAreasVaga] = useState<string[]>([]);
  const [etapas, setEtapas] = useState<EtapaFormInput[]>(getDefaultEtapas());
  const [bloquearEdicaoEtapas, setBloquearEdicaoEtapas] = useState(false);

  const exigeCep = modalidade === "PRESENCIAL" || modalidade === "HIBRIDO";

  // Requisitos
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [novoReqDesc, setNovoReqDesc] = useState("");
  const [novoReqTipo, setNovoReqTipo] = useState<"OBRIGATORIO" | "DESEJAVEL">("OBRIGATORIO");
  const [novoReqTempoValor, setNovoReqTempoValor] = useState("");
  const [novoReqTempoUnidade, setNovoReqTempoUnidade] = useState<"meses" | "anos">("anos");

  useEffect(() => {
    apiFetch("/api/categorias?tipo=AREA_ATUACAO")
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok || !Array.isArray(data)) return [];
        return data;
      })
      .then((data) => {
        const nomes = data.map((c: { nome: string }) => c.nome);
        setAreasDisponiveis(nomes.length > 0 ? nomes : AREAS_ATUACAO_PADRAO);
      })
      .catch(() => setAreasDisponiveis([...AREAS_ATUACAO_PADRAO]));
  }, []);

  // Carregar dados existentes
  useEffect(() => {
    apiFetch(`/api/vagas/${vagaId}`)
      .then((r) => r.json())
      .then((data) => {
        setTitulo(data.titulo || "");
        setArea(data.area || "");
        setJobType(data.jobType || "");
        setRegime(data.regime || "");
        setModalidade(data.modalidade || "");
        setLocalizacao(data.localizacao || "");
        setCep(data.cep || "");
        setSalarioMin(data.salarioMin?.toString() || "");
        setSalarioMax(data.salarioMax?.toString() || "");
        setDescricao(data.descricao || "");
        setAreasVaga((data.areas || []).map((item: { nome: string }) => item.nome));
        setEtapas(
          (data.etapas || []).length > 0
            ? data.etapas.map((etapa: { nome: string; tipo: EtapaFormInput["tipo"]; obrigatoria: boolean }) => ({
                nome: etapa.nome,
                tipo: etapa.tipo,
                obrigatoria: etapa.obrigatoria,
              }))
            : getDefaultEtapas(),
        );
        setBloquearEdicaoEtapas((data.triagens || []).length > 0);
        setRequisitos(
          (data.requisitos || []).map((r: { descricao: string; tipo: string; tempoMeses?: number | null }) => ({
            descricao: r.descricao,
            tipo: r.tipo as "OBRIGATORIO" | "DESEJAVEL",
            tempoMeses: r.tempoMeses ?? null,
          })),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [vagaId]);

  function calcTempoMeses(): number | null {
    const v = parseInt(novoReqTempoValor);
    if (!v || v <= 0) return null;
    return novoReqTempoUnidade === "anos" ? v * 12 : v;
  }

  function addRequisito() {
    if (!novoReqDesc.trim()) return;
    setRequisitos([...requisitos, { descricao: novoReqDesc.trim(), tipo: novoReqTipo, tempoMeses: calcTempoMeses() }]);
    setNovoReqDesc("");
    setNovoReqTempoValor("");
  }

  function removeRequisito(index: number) {
    setRequisitos(requisitos.filter((_, i) => i !== index));
  }

  function formatTempo(meses: number): string {
    const anos = Math.floor(meses / 12);
    const resto = meses % 12;
    if (anos === 0) return `${resto} ${resto === 1 ? "mês" : "meses"}`;
    if (resto === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
    return `${anos} ${anos === 1 ? "ano" : "anos"} e ${resto} ${resto === 1 ? "mês" : "meses"}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateVagaFields({ titulo, area, jobType, regime, modalidade, localizacao, descricao, cep });
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const firstErrorField = document.querySelector("[data-error='true']");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);

    // Auto-add pending requisito text before submitting
    const finalRequisitos = [...requisitos];
    if (novoReqDesc.trim()) {
      finalRequisitos.push({ descricao: novoReqDesc.trim(), tipo: novoReqTipo, tempoMeses: calcTempoMeses() });
      setNovoReqDesc("");
      setNovoReqTempoValor("");
    }

    try {
      const res = await apiFetch(`/api/vagas/${vagaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          area,
          jobType,
          regime,
          modalidade,
          localizacao,
          cep: cep || null,
          salarioMin: salarioMin || null,
          salarioMax: salarioMax || null,
          descricao,
          areas: areasVaga,
          requisitos: finalRequisitos,
          etapas,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.fieldErrors) {
          setErrors(err.fieldErrors as FormErrors);
        }
        toast.error(err.error || "Erro ao salvar vaga");
        return;
      }

      router.push(`/vagas/${vagaId}`);
    } catch {
      toast.error("Erro ao salvar vaga");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Editar Vaga</h2>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {titulo || "vaga"}.
        </p>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Corrija os campos abaixo para continuar:</p>
          <ul className="mt-2 list-inside list-disc text-sm text-destructive/80">
            {Object.values(errors).map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Informações básicas */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h3 className="text-base font-semibold">1. Informações Básicas</h3>

          <div className="space-y-2" data-error={!!errors.titulo || undefined}>
            <Label htmlFor="titulo">Título da Vaga *</Label>
            <Input
              id="titulo"
              placeholder="ex: Desenvolvedor Frontend Sênior"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setErrors((prev) => {
                  const { titulo: _titulo, ...rest } = prev;
                  return rest;
                });
              }}
              className={errors.titulo ? "border-destructive" : ""}
            />
            <FieldError error={errors.titulo} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2" data-error={!!errors.area || undefined}>
              <Label htmlFor="area">Área *</Label>
              <Input
                id="area"
                placeholder="ex: Engenharia"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setErrors((prev) => {
                    const { area: _area, ...rest } = prev;
                    return rest;
                  });
                }}
                className={errors.area ? "border-destructive" : ""}
              />
              <FieldError error={errors.area} />
            </div>
            <div className="space-y-2" data-error={!!errors.jobType || undefined}>
              <Label htmlFor="jobType">Tipo de Trabalho *</Label>
              <Input
                id="jobType"
                placeholder="ex: Desenvolvedor, Motorista, Doméstica"
                value={jobType}
                onChange={(e) => {
                  setJobType(e.target.value);
                  setErrors((prev) => {
                    const { jobType: _jobType, ...rest } = prev;
                    return rest;
                  });
                }}
                className={errors.jobType ? "border-destructive" : ""}
              />
              <FieldError error={errors.jobType} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2" data-error={!!errors.regime || undefined}>
              <Label htmlFor="regime">Regime *</Label>
              <Select value={regime} onValueChange={(v) => {
                setRegime(v ?? "");
                setErrors((prev) => {
                  const { regime: _regime, ...rest } = prev;
                  return rest;
                });
              }}>
                <SelectTrigger className={errors.regime ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione o regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="ESTAGIO">Estágio</SelectItem>
                  <SelectItem value="FREELANCER">Freelancer</SelectItem>
                </SelectContent>
              </Select>
              <FieldError error={errors.regime} />
            </div>
            <div className="space-y-2" data-error={!!errors.modalidade || undefined}>
              <Label htmlFor="modalidade">Modalidade *</Label>
              <Select value={modalidade} onValueChange={(v) => {
                setModalidade(v ?? "");
                setErrors((prev) => {
                  const { modalidade: _modalidade, ...rest } = prev;
                  return rest;
                });
              }}>
                <SelectTrigger className={errors.modalidade ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                  <SelectItem value="REMOTO">Remoto</SelectItem>
                  <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                </SelectContent>
              </Select>
              <FieldError error={errors.modalidade} />
            </div>
          </div>

          {exigeCep && (
            <div className="space-y-2" data-error={!!errors.cep || undefined}>
              <Label htmlFor="cep">CEP da Vaga *</Label>
              <Input
                id="cep"
                placeholder="ex: 01001-000"
                value={cep}
                onChange={(e) => {
                  setCep(e.target.value);
                  setErrors((prev) => {
                    const { cep: _cep, ...rest } = prev;
                    return rest;
                  });
                }}
                className={errors.cep ? "border-destructive" : ""}
              />
              <FieldError error={errors.cep} />
            </div>
          )}

          <div className="space-y-2" data-error={!!errors.localizacao || undefined}>
            <Label htmlFor="localizacao">Localização *</Label>
            <Input
              id="localizacao"
              placeholder="ex: São Paulo, SP"
              value={localizacao}
              onChange={(e) => {
                setLocalizacao(e.target.value);
                setErrors((prev) => {
                  const { localizacao: _localizacao, ...rest } = prev;
                  return rest;
                });
              }}
              className={errors.localizacao ? "border-destructive" : ""}
            />
            <FieldError error={errors.localizacao} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salarioMin">Salário Mínimo</Label>
              <Input
                id="salarioMin"
                type="number"
                placeholder="ex: 8000"
                value={salarioMin}
                onChange={(e) => setSalarioMin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salarioMax">Salário Máximo</Label>
              <Input
                id="salarioMax"
                type="number"
                placeholder="ex: 15000"
                value={salarioMax}
                onChange={(e) => setSalarioMax(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2" data-error={!!errors.descricao || undefined}>
            <Label htmlFor="descricao">Descrição da Vaga *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva as responsabilidades e o que o candidato vai fazer..."
              rows={5}
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setErrors((prev) => {
                  const { descricao: _descricao, ...rest } = prev;
                  return rest;
                });
              }}
              className={errors.descricao ? "border-destructive" : ""}
            />
            <FieldError error={errors.descricao} />
          </div>
          <div className="space-y-2">
            <Label>Areas de Atuacao</Label>
            <p className="text-xs text-muted-foreground">
              Selecione uma ou mais areas para melhorar a compatibilidade dos candidatos.
            </p>
            <div className="flex flex-wrap gap-2">
              {areasDisponiveis.map((areaAtuacao) => {
                const selecionada = areasVaga.includes(areaAtuacao);
                return (
                  <button
                    key={areaAtuacao}
                    type="button"
                    onClick={() =>
                      setAreasVaga((prev) =>
                        selecionada
                          ? prev.filter((item) => item !== areaAtuacao)
                          : [...prev, areaAtuacao],
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selecionada
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {selecionada && <Check className="h-3 w-3" />}
                    {areaAtuacao}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Requisitos */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">2. Requisitos</h3>
            <span className="text-xs text-destructive font-medium">
              Alterar requisitos marca triagens como desatualizadas
            </span>
          </div>

          {requisitos.length > 0 && (
            <div className="space-y-2">
              {requisitos.map((req, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <Badge
                    variant={req.tipo === "OBRIGATORIO" ? "destructive" : "secondary"}
                    className="shrink-0 text-xs"
                  >
                    {req.tipo === "OBRIGATORIO" ? "Obrigatório" : "Desejável"}
                  </Badge>
                  <span className="flex-1 text-sm">{req.descricao}</span>
                  {req.tempoMeses && (
                    <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {formatTempo(req.tempoMeses)}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRequisito(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>Descrição do requisito</Label>
                <Input
                  placeholder="ex: Experiência com React"
                  value={novoReqDesc}
                  onChange={(e) => setNovoReqDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRequisito();
                    }
                  }}
                />
              </div>
              <div className="flex items-end gap-1">
                <div className="space-y-2">
                  <Label className="text-xs">Tempo mín.</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="—"
                    className="w-[70px]"
                    value={novoReqTempoValor}
                    onChange={(e) => setNovoReqTempoValor(e.target.value)}
                  />
                </div>
                <Select
                  value={novoReqTempoUnidade}
                  onValueChange={(v) => setNovoReqTempoUnidade((v ?? "anos") as "meses" | "anos")}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meses">Meses</SelectItem>
                    <SelectItem value="anos">Anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Select
                value={novoReqTipo}
                onValueChange={(v) => setNovoReqTipo((v ?? "OBRIGATORIO") as "OBRIGATORIO" | "DESEJAVEL")}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OBRIGATORIO">Obrigatório</SelectItem>
                  <SelectItem value="DESEJAVEL">Desejável</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={addRequisito}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">3. Etapas do processo</h3>
            <span className="text-xs font-medium text-muted-foreground">
              {etapas.length} etapa(s)
            </span>
          </div>

          {bloquearEdicaoEtapas && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              Esta vaga já possui candidatos vinculados. As etapas ficam bloqueadas para preservar o andamento atual.
            </div>
          )}

          <EtapasForm value={etapas} onChange={setEtapas} disabled={bloquearEdicaoEtapas} />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {requisitos.length} requisito(s), {areasVaga.length} area(s) e {etapas.length} etapa(s)
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </form>
  );
}
