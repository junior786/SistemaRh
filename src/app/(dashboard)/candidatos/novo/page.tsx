"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Save, Upload, Loader2, AlertTriangle, Check } from "lucide-react";
import { AREAS_ATUACAO_PADRAO } from "@/lib/areas";

interface Experiencia {
  empresa: string;
  cargo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  atual: boolean;
}

interface Formacao {
  instituicao: string;
  curso: string;
  nivel: string;
  dataInicio: string;
  dataFim: string;
  atual: boolean;
}

const niveisFormacao = [
  { value: "TECNICO", label: "Técnico" },
  { value: "GRADUACAO", label: "Graduação" },
  { value: "POS_GRADUACAO", label: "Pós-graduação" },
  { value: "MBA", label: "MBA" },
  { value: "MESTRADO", label: "Mestrado" },
  { value: "DOUTORADO", label: "Doutorado" },
  { value: "CURSO_LIVRE", label: "Curso Livre" },
];

export default function NovoCandidatoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [importando, setImportando] = useState(false);
  const [areasDisponiveis, setAreasDisponiveis] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/categorias?tipo=AREA_ATUACAO")
      .then((r) => r.json())
      .then((data) => {
        const nomes = data.map((c: { nome: string }) => c.nome);
        setAreasDisponiveis(nomes.length > 0 ? nomes : AREAS_ATUACAO_PADRAO);
      })
      .catch(() => setAreasDisponiveis([...AREAS_ATUACAO_PADRAO]));
  }, []);

  // Dados pessoais
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [cep, setCep] = useState("");
  const [genero, setGenero] = useState("");
  const [resumo, setResumo] = useState("");
  const [jobType, setJobType] = useState("");
  const [pretensaoSalarial, setPretensaoSalarial] = useState("");
  const [observacao, setObservacao] = useState("");

  // Áreas de atuação
  const [areas, setAreas] = useState<string[]>([]);

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [novaSkill, setNovaSkill] = useState("");

  // Restrições
  const [restricoes, setRestricoes] = useState<string[]>([]);
  const [novaRestricao, setNovaRestricao] = useState("");

  // Experiências
  const [experiencias, setExperiencias] = useState<Experiencia[]>([]);

  // Formações
  const [formacoes, setFormacoes] = useState<Formacao[]>([]);

  function addSkill() {
    const s = novaSkill.trim();
    if (!s || skills.includes(s)) return;
    setSkills([...skills, s]);
    setNovaSkill("");
  }

  function addRestricao() {
    const r = novaRestricao.trim();
    if (!r) return;
    setRestricoes([...restricoes, r]);
    setNovaRestricao("");
  }

  function addExperiencia() {
    setExperiencias([
      ...experiencias,
      { empresa: "", cargo: "", descricao: "", dataInicio: "", dataFim: "", atual: false },
    ]);
  }

  function updateExperiencia(index: number, field: keyof Experiencia, value: string | boolean) {
    const updated = [...experiencias];
    (updated[index] as unknown as Record<string, string | boolean>)[field] = value;
    if (field === "atual" && value === true) {
      updated[index].dataFim = "";
    }
    setExperiencias(updated);
  }

  function removeExperiencia(index: number) {
    setExperiencias(experiencias.filter((_, i) => i !== index));
  }

  function addFormacao() {
    setFormacoes([
      ...formacoes,
      { instituicao: "", curso: "", nivel: "GRADUACAO", dataInicio: "", dataFim: "", atual: false },
    ]);
  }

  function updateFormacao(index: number, field: keyof Formacao, value: string | boolean) {
    const updated = [...formacoes];
    (updated[index] as unknown as Record<string, string | boolean>)[field] = value;
    if (field === "atual" && value === true) {
      updated[index].dataFim = "";
    }
    setFormacoes(updated);
  }

  function removeFormacao(index: number) {
    setFormacoes(formacoes.filter((_, i) => i !== index));
  }

  // RF-02 / RN-02: Importação de PDF
  async function handleImportPDF(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportando(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch("/api/candidatos/importar-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao importar PDF");
        return;
      }

      const { dados } = await res.json();

      // Preenche o formulário para revisão humana (RN-02: nunca salva automaticamente)
      setNome(dados.nome || "");
      setEmail(dados.email || "");
      setTelefone(dados.telefone || "");
      setCidade(dados.cidade || "");
      setCep(dados.cep || "");
      setGenero(dados.genero || "");
      setResumo(dados.resumo || "");
      setJobType(dados.jobType || "");
      setPretensaoSalarial(dados.pretensaoSalarial?.toString() || "");
      setAreas(dados.areas || []);
      setSkills(dados.skills || []);
      setRestricoes(dados.restricoes || []);

      if (dados.experiencias?.length) {
        setExperiencias(
          dados.experiencias.map((exp: Experiencia) => ({
            empresa: exp.empresa || "",
            cargo: exp.cargo || "",
            descricao: exp.descricao || "",
            dataInicio: exp.dataInicio || "",
            dataFim: exp.dataFim || "",
            atual: exp.atual || false,
          })),
        );
      }

      if (dados.formacoes?.length) {
        setFormacoes(
          dados.formacoes.map((f: Formacao) => ({
            instituicao: f.instituicao || "",
            curso: f.curso || "",
            nivel: f.nivel || "GRADUACAO",
            dataInicio: f.dataInicio || "",
            dataFim: f.dataFim || "",
            atual: f.atual || false,
          })),
        );
      }
    } catch {
      alert("Erro ao processar PDF");
    } finally {
      setImportando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Auto-add pending items before submitting
    const finalSkills = [...skills];
    if (novaSkill.trim() && !finalSkills.includes(novaSkill.trim())) {
      finalSkills.push(novaSkill.trim());
      setNovaSkill("");
    }
    const finalRestricoes = [...restricoes];
    if (novaRestricao.trim()) {
      finalRestricoes.push(novaRestricao.trim());
      setNovaRestricao("");
    }

    try {
      const res = await fetch("/api/candidatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone: telefone || null,
          cidade: cidade || null,
          cep: cep || null,
          genero: genero || null,
          resumo: resumo || null,
          jobType,
          pretensaoSalarial: pretensaoSalarial || null,
          observacao: observacao || null,
          areas,
          skills: finalSkills,
          experiencias: experiencias.filter((e) => e.empresa && e.cargo),
          formacoes: formacoes.filter((f) => f.instituicao && f.curso),
          restricoes: finalRestricoes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao salvar candidato");
        return;
      }

      const candidato = await res.json();
      router.push(`/candidatos/${candidato.id}`);
    } catch {
      alert("Erro ao salvar candidato");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Novo Candidato</h2>
          <p className="text-sm text-muted-foreground">
            Preencha manualmente ou importe um PDF de currículo.
          </p>
        </div>
        <div>
          <Label
            htmlFor="pdf-upload"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            {importando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importando ? "Extraindo..." : "Importar PDF"}
          </Label>
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleImportPDF}
            disabled={importando}
          />
        </div>
      </div>

      {/* 1. Dados Pessoais */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h3 className="text-base font-semibold">1. Dados Pessoais</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                placeholder="São Paulo, SP"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="genero">Gênero</Label>
              <Input
                id="genero"
                placeholder="ex: Masculino, Feminino, Não-binário"
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
              />
            </div>
          </div>

          {/* Áreas de atuação */}
          <div className="space-y-2">
            <Label>Áreas de Atuação</Label>
            <p className="text-xs text-muted-foreground">Selecione uma ou mais áreas em que o candidato atua</p>
            <div className="flex flex-wrap gap-2">
              {areasDisponiveis.map((area) => {
                const selecionada = areas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() =>
                      setAreas((prev) =>
                        selecionada ? prev.filter((a) => a !== area) : [...prev, area],
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selecionada
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {selecionada && <Check className="h-3 w-3" />}
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                placeholder="ex: 01001-000"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pretensao">Pretensão Salarial</Label>
              <Input
                id="pretensao"
                type="number"
                placeholder="ex: 10000"
                value={pretensaoSalarial}
                onChange={(e) => setPretensaoSalarial(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resumo">Resumo Profissional</Label>
            <Textarea
              id="resumo"
              rows={3}
              placeholder="Breve resumo da carreira..."
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Skills */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h3 className="text-base font-semibold">2. Skills</h3>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 pr-1">
                  {s}
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((x) => x !== s))}
                    className="ml-1 rounded-full hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Adicionar skill e pressione Enter..."
              value={novaSkill}
              onChange={(e) => setNovaSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <Button type="button" variant="outline" size="icon" onClick={addSkill}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Experiências Profissionais */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">3. Experiências Profissionais</h3>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addExperiencia}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {experiencias.map((exp, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Experiência {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeExperiencia(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Empresa *</Label>
                  <Input
                    value={exp.empresa}
                    onChange={(e) => updateExperiencia(i, "empresa", e.target.value)}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cargo *</Label>
                  <Input
                    value={exp.cargo}
                    onChange={(e) => updateExperiencia(i, "cargo", e.target.value)}
                    placeholder="Cargo ocupado"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={exp.dataInicio}
                    onChange={(e) => updateExperiencia(i, "dataInicio", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data Fim</Label>
                  <Input
                    type="date"
                    value={exp.dataFim}
                    onChange={(e) => updateExperiencia(i, "dataFim", e.target.value)}
                    disabled={exp.atual}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`exp-atual-${i}`}
                  checked={exp.atual}
                  onCheckedChange={(v) => updateExperiencia(i, "atual", !!v)}
                />
                <Label htmlFor={`exp-atual-${i}`} className="text-sm">
                  Trabalho aqui atualmente
                </Label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição das atividades</Label>
                <Textarea
                  rows={2}
                  value={exp.descricao}
                  onChange={(e) => updateExperiencia(i, "descricao", e.target.value)}
                  placeholder="Principais atividades e responsabilidades..."
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 4. Formação Acadêmica */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">4. Formação Acadêmica</h3>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addFormacao}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {formacoes.map((f, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Formação {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeFormacao(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Instituição *</Label>
                  <Input
                    value={f.instituicao}
                    onChange={(e) => updateFormacao(i, "instituicao", e.target.value)}
                    placeholder="Nome da instituição"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Curso *</Label>
                  <Input
                    value={f.curso}
                    onChange={(e) => updateFormacao(i, "curso", e.target.value)}
                    placeholder="Nome do curso"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nível</Label>
                <Select
                  value={f.nivel}
                  onValueChange={(v) => updateFormacao(i, "nivel", v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {niveisFormacao.map((n) => (
                      <SelectItem key={n.value} value={n.value}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={f.dataInicio}
                    onChange={(e) => updateFormacao(i, "dataInicio", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data Conclusão</Label>
                  <Input
                    type="date"
                    value={f.dataFim}
                    onChange={(e) => updateFormacao(i, "dataFim", e.target.value)}
                    disabled={f.atual}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`form-atual-${i}`}
                  checked={f.atual}
                  onCheckedChange={(v) => updateFormacao(i, "atual", !!v)}
                />
                <Label htmlFor={`form-atual-${i}`} className="text-sm">
                  Cursando atualmente
                </Label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 5. Restrições */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-base font-semibold">5. Restrições / Informações Relevantes</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Informações pessoais que podem influenciar na compatibilidade com vagas (ex: &quot;Tem 2 filhos&quot;, &quot;Não possui CNH&quot;, &quot;Disponível apenas manhã&quot;).
          </p>

          {restricoes.length > 0 && (
            <div className="space-y-2">
              {restricoes.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="flex-1 text-sm">{r}</span>
                  <button
                    type="button"
                    onClick={() => setRestricoes(restricoes.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Adicionar restrição e pressione Enter..."
              value={novaRestricao}
              onChange={(e) => setNovaRestricao(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRestricao();
                }
              }}
            />
            <Button type="button" variant="outline" size="icon" onClick={addRestricao}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 6. Observações */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h3 className="text-base font-semibold">6. Observações</h3>
          <p className="text-xs text-muted-foreground">
            Notas internas do RH sobre este candidato. Este campo pode ser editado a qualquer momento.
          </p>
          <Textarea
            rows={3}
            placeholder="Observações internas sobre o candidato..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Candidato"}
        </Button>
      </div>
    </form>
  );
}
