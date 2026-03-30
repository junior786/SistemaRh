"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Save, Clock } from "lucide-react";

interface Requisito {
  descricao: string;
  tipo: "OBRIGATORIO" | "DESEJAVEL";
  tempoMeses: number | null;
}

export default function NovaVagaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

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

  const exigeCep = modalidade === "PRESENCIAL" || modalidade === "HIBRIDO";

  // Requisitos
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [novoReqDesc, setNovoReqDesc] = useState("");
  const [novoReqTipo, setNovoReqTipo] = useState<"OBRIGATORIO" | "DESEJAVEL">("OBRIGATORIO");
  const [novoReqTempoValor, setNovoReqTempoValor] = useState("");
  const [novoReqTempoUnidade, setNovoReqTempoUnidade] = useState<"meses" | "anos">("anos");

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
    setSaving(true);

    // Auto-add pending requisito text before submitting
    const finalRequisitos = [...requisitos];
    if (novoReqDesc.trim()) {
      finalRequisitos.push({ descricao: novoReqDesc.trim(), tipo: novoReqTipo, tempoMeses: calcTempoMeses() });
      setNovoReqDesc("");
      setNovoReqTempoValor("");
    }

    try {
      const res = await fetch("/api/vagas", {
        method: "POST",
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
          requisitos: finalRequisitos,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao salvar vaga");
        return;
      }

      const vaga = await res.json();
      router.push(`/vagas/${vaga.id}`);
    } catch {
      alert("Erro ao salvar vaga");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Criar Nova Vaga</h2>
        <p className="text-sm text-muted-foreground">
          Preencha os dados abaixo para criar uma nova vaga e começar a receber candidatos.
        </p>
      </div>

      {/* 1. Informações básicas */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h3 className="text-base font-semibold">1. Informações Básicas</h3>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Vaga *</Label>
            <Input
              id="titulo"
              placeholder="ex: Desenvolvedor Frontend Sênior"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Área *</Label>
              <Input
                id="area"
                placeholder="ex: Engenharia"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobType">Tipo de Trabalho *</Label>
              <Input
                id="jobType"
                placeholder="ex: Desenvolvedor, Motorista, Doméstica"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regime">Regime *</Label>
              <Select value={regime} onValueChange={(v) => setRegime(v ?? "")} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="ESTAGIO">Estágio</SelectItem>
                  <SelectItem value="FREELANCER">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="modalidade">Modalidade *</Label>
              <Select value={modalidade} onValueChange={(v) => setModalidade(v ?? "")} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                  <SelectItem value="REMOTO">Remoto</SelectItem>
                  <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exigeCep && (
              <div className="space-y-2">
                <Label htmlFor="cep">CEP da Vaga *</Label>
                <Input
                  id="cep"
                  placeholder="ex: 01001-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  required={exigeCep}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="localizacao">Localização *</Label>
            <Input
              id="localizacao"
              placeholder="ex: São Paulo, SP"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              required
            />
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

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição da Vaga *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva as responsabilidades e o que o candidato vai fazer..."
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Requisitos Obrigatórios */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">2. Requisitos</h3>
            <span className="text-xs text-destructive font-medium">
              Obrigatórios afetam o score de compatibilidade
            </span>
          </div>

          {/* Lista de requisitos adicionados */}
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

          {/* Adicionar novo requisito */}
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

      {/* Ações */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {requisitos.length} requisito(s) adicionado(s)
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Vaga"}
          </Button>
        </div>
      </div>
    </form>
  );
}
