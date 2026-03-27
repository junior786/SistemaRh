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
import { Plus, X, Save } from "lucide-react";

interface Requisito {
  descricao: string;
  tipo: "OBRIGATORIO" | "DESEJAVEL";
}

export default function NovaVagaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [area, setArea] = useState("");
  const [regime, setRegime] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [salarioMin, setSalarioMin] = useState("");
  const [salarioMax, setSalarioMax] = useState("");
  const [descricao, setDescricao] = useState("");

  // Requisitos
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [novoReqDesc, setNovoReqDesc] = useState("");
  const [novoReqTipo, setNovoReqTipo] = useState<"OBRIGATORIO" | "DESEJAVEL">("OBRIGATORIO");

  function addRequisito() {
    if (!novoReqDesc.trim()) return;
    setRequisitos([...requisitos, { descricao: novoReqDesc.trim(), tipo: novoReqTipo }]);
    setNovoReqDesc("");
  }

  function removeRequisito(index: number) {
    setRequisitos(requisitos.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/vagas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          area,
          regime,
          localizacao,
          salarioMin: salarioMin || null,
          salarioMax: salarioMax || null,
          descricao,
          requisitos,
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

          <div className="space-y-2">
            <Label htmlFor="localizacao">Localização *</Label>
            <Input
              id="localizacao"
              placeholder="ex: São Paulo, SP (Remoto)"
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
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>Descrição do requisito</Label>
              <Input
                placeholder="ex: 3+ anos com React"
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
