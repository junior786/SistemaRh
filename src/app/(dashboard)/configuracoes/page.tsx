"use client";
import { apiFetch } from "@/lib/api-fetch";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, Tags, MessageCircle, Save, FileText, Bot, UserPlus, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Categoria {
  id: string;
  tipo: string;
  nome: string;
  ordem: number;
  ativa: boolean;
}

type Role = "OWNER" | "ADMIN" | "RECRUITER";

interface EmpresaUsuario {
  id: string;
  role: Role | string;
  ativo: boolean;
  createdAt: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    ativo: boolean;
  };
}

interface AuthMe {
  membership: {
    role: Role | string;
    ativo: boolean;
  };
}

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  RECRUITER: "Recrutador",
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as Array<[Role, string]>;

const USUARIO_FORM_VAZIO = {
  nome: "",
  email: "",
  senha: "",
  role: "RECRUITER" as Role,
};

const SECOES = [
  {
    tipo: "AREA_ATUACAO",
    titulo: "Áreas de Atuação",
    descricao: "Categorias disponíveis para selecionar no cadastro de candidatos",
    placeholder: "ex: Desenvolvimento, Líder Técnico, DevOps...",
  },
] as const;

interface WhatsAppConfig {
  iaWhatsappAtivo: boolean;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioFromNumber: string | null;
  iaPersona: string | null;
  iaTomVoz: string | null;
  iaFAQ: string | null;
  iaBlocklist: string | null;
  iaModoDraft: boolean;
}

const TOM_OPCOES = ["formal", "informal", "amigável", "técnico"] as const;

interface TwilioTemplate {
  id: string;
  slug: string;
  nome: string;
  contentSid: string;
  variaveis: string;
  descricao: string | null;
  ativo: boolean;
}

interface TemplateForm {
  slug: string;
  nome: string;
  contentSid: string;
  variaveis: string;
  descricao: string;
}

const TEMPLATE_FORM_VAZIO: TemplateForm = {
  slug: "",
  nome: "",
  contentSid: "",
  variaveis: "",
  descricao: "",
};

export default function ConfiguracoesPage() {
  const [currentRole, setCurrentRole] = useState<Role | string | null>(null);
  const [usuarios, setUsuarios] = useState<EmpresaUsuario[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(true);
  const [usuarioForm, setUsuarioForm] = useState(USUARIO_FORM_VAZIO);
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);
  const [removendoUsuarioId, setRemovendoUsuarioId] = useState<string | null>(null);
  const [usuarioParaRemover, setUsuarioParaRemover] = useState<EmpresaUsuario | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState<Record<string, string>>({});
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [categoriaParaRemover, setCategoriaParaRemover] = useState<Categoria | null>(null);

  // WhatsApp (Twilio)
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>({
    iaWhatsappAtivo: false,
    twilioAccountSid: null,
    twilioAuthToken: null,
    twilioFromNumber: null,
    iaPersona: null,
    iaTomVoz: null,
    iaFAQ: null,
    iaBlocklist: null,
    iaModoDraft: false,
  });
  const [waForm, setWaForm] = useState({
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioFromNumber: "",
  });
  const [iaForm, setIaForm] = useState({
    iaPersona: "",
    iaTomVoz: "",
    iaFAQ: "",
    iaBlocklist: "",
  });
  const [waSaving, setWaSaving] = useState(false);
  const [waLoading, setWaLoading] = useState(true);
  const [iaSaving, setIaSaving] = useState(false);

  // Templates Twilio
  const [templates, setTemplates] = useState<TwilioTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(TEMPLATE_FORM_VAZIO);
  const [editandoTemplateId, setEditandoTemplateId] = useState<string | null>(null);
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [removendoTemplateId, setRemovendoTemplateId] = useState<string | null>(null);
  const [templateParaRemover, setTemplateParaRemover] = useState<TwilioTemplate | null>(null);

  const canManageUsers = currentRole === "OWNER" || currentRole === "ADMIN";

  const carregarUsuarioAtual = useCallback(() => {
    apiFetch("/api/auth/me")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(data?.error ?? "Erro ao carregar acesso atual");
        }
        setCurrentRole((data as AuthMe).membership.role);
      })
      .catch(() => setCurrentRole(null));
  }, []);

  const carregarUsuarios = useCallback(() => {
    if (!canManageUsers) {
      setUsuarios([]);
      setUsuariosLoading(false);
      return;
    }

    setUsuariosLoading(true);
    apiFetch("/api/configuracoes/usuarios")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(data?.error ?? "Erro ao carregar usuarios");
        }
        setUsuarios(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setUsuarios([]);
        toast.error(err instanceof Error ? err.message : "Erro ao carregar usuarios");
      })
      .finally(() => setUsuariosLoading(false));
  }, [canManageUsers]);

  const carregar = useCallback(() => {
    setLoading(true);
    apiFetch("/api/categorias")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(data?.error ?? "Erro ao carregar categorias");
        }
        setCategorias(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setCategorias([]);
        toast.error(err instanceof Error ? err.message : "Erro ao carregar categorias");
      })
      .finally(() => setLoading(false));
  }, []);

  const carregarTemplates = useCallback(() => {
    setTemplatesLoading(true);
    apiFetch("/api/configuracoes/whatsapp/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setTemplatesLoading(false));
  }, []);

  useEffect(() => {
    carregarUsuarioAtual();
    carregar();
    apiFetch("/api/configuracoes/whatsapp")
      .then((r) => r.json())
      .then((data: WhatsAppConfig) => {
        setWaConfig(data);
        setWaForm({
          twilioAccountSid: data.twilioAccountSid || "",
          twilioAuthToken: "",
          twilioFromNumber: data.twilioFromNumber || "",
        });
        setIaForm({
          iaPersona: data.iaPersona || "",
          iaTomVoz: data.iaTomVoz || "",
          iaFAQ: data.iaFAQ || "",
          iaBlocklist: data.iaBlocklist || "",
        });
      })
      .catch(console.error)
      .finally(() => setWaLoading(false));
    carregarTemplates();
  }, [carregar, carregarTemplates, carregarUsuarioAtual]);

  useEffect(() => {
    if (currentRole === null) return;
    carregarUsuarios();
  }, [currentRole, carregarUsuarios]);

  async function salvarWhatsApp() {
    setWaSaving(true);
    try {
      const payload: Record<string, unknown> = {
        iaWhatsappAtivo: waConfig.iaWhatsappAtivo,
      };
      if (waForm.twilioAccountSid) payload.twilioAccountSid = waForm.twilioAccountSid;
      if (waForm.twilioFromNumber) payload.twilioFromNumber = waForm.twilioFromNumber;
      if (waForm.twilioAuthToken) payload.twilioAuthToken = waForm.twilioAuthToken;

      const res = await apiFetch("/api/configuracoes/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setWaConfig(data);
        setWaForm((prev) => ({ ...prev, twilioAuthToken: "" }));
        toast.success("Configurações Twilio salvas");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao salvar configurações");
      }
    } catch {
      toast.error("Erro ao salvar configurações Twilio");
    } finally {
      setWaSaving(false);
    }
  }

  async function salvarComportamentoIA() {
    setIaSaving(true);
    try {
      const res = await apiFetch("/api/configuracoes/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iaPersona: iaForm.iaPersona || null,
          iaTomVoz: iaForm.iaTomVoz || null,
          iaFAQ: iaForm.iaFAQ || null,
          iaBlocklist: iaForm.iaBlocklist || null,
          iaModoDraft: waConfig.iaModoDraft,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWaConfig(data);
        toast.success("Comportamento da IA salvo");
      } else {
        toast.error("Erro ao salvar comportamento da IA");
      }
    } catch {
      toast.error("Erro ao salvar comportamento da IA");
    } finally {
      setIaSaving(false);
    }
  }

  function iniciarEdicaoTemplate(template: TwilioTemplate) {
    setEditandoTemplateId(template.id);
    setTemplateForm({
      slug: template.slug,
      nome: template.nome,
      contentSid: template.contentSid,
      variaveis: template.variaveis,
      descricao: template.descricao ?? "",
    });
  }

  function cancelarEdicaoTemplate() {
    setEditandoTemplateId(null);
    setTemplateForm(TEMPLATE_FORM_VAZIO);
  }

  async function salvarTemplate() {
    if (!templateForm.slug.trim() || !templateForm.nome.trim() || !templateForm.contentSid.trim()) {
      toast.error("slug, nome e ContentSid são obrigatórios");
      return;
    }

    setSalvandoTemplate(true);
    try {
      const isEdicao = editandoTemplateId !== null;
      const url = isEdicao
        ? `/api/configuracoes/whatsapp/templates/${editandoTemplateId}`
        : "/api/configuracoes/whatsapp/templates";
      const method = isEdicao ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: templateForm.slug.trim(),
          nome: templateForm.nome.trim(),
          contentSid: templateForm.contentSid.trim(),
          variaveis: templateForm.variaveis.trim(),
          descricao: templateForm.descricao.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao salvar template");
        return;
      }

      toast.success(isEdicao ? "Template atualizado" : "Template adicionado");
      cancelarEdicaoTemplate();
      carregarTemplates();
    } finally {
      setSalvandoTemplate(false);
    }
  }

  async function removerTemplate(template: TwilioTemplate) {
    setRemovendoTemplateId(template.id);
    try {
      const res = await apiFetch(`/api/configuracoes/whatsapp/templates/${template.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== template.id));
        toast.success("Template removido");
      } else {
        toast.error("Erro ao remover template");
      }
      setTemplateParaRemover(null);
    } finally {
      setRemovendoTemplateId(null);
    }
  }

  async function adicionarUsuario() {
    if (!usuarioForm.nome.trim() || !usuarioForm.email.trim() || !usuarioForm.senha.trim()) {
      toast.error("Nome, e-mail e senha são obrigatórios");
      return;
    }

    setSalvandoUsuario(true);
    try {
      const res = await apiFetch("/api/configuracoes/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nome: usuarioForm.nome.trim(),
          email: usuarioForm.email.trim(),
          senha: usuarioForm.senha,
          role: usuarioForm.role,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "Erro ao adicionar usuário");
        return;
      }

      toast.success("Usuário adicionado");
      setUsuarioForm(USUARIO_FORM_VAZIO);
      carregarUsuarios();
    } finally {
      setSalvandoUsuario(false);
    }
  }

  async function removerUsuario(membership: EmpresaUsuario) {
    setRemovendoUsuarioId(membership.id);
    try {
      const res = await apiFetch(`/api/configuracoes/usuarios?id=${membership.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "Erro ao remover usuário");
        return;
      }

      setUsuarios((prev) => prev.filter((item) => item.id !== membership.id));
      setUsuarioParaRemover(null);
      toast.success("Usuário removido da empresa");
    } finally {
      setRemovendoUsuarioId(null);
    }
  }

  async function adicionar(tipo: string) {
    const nome = novoNome[tipo]?.trim();
    if (!nome) return;

    setAdicionando(tipo);
    try {
      const res = await apiFetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, nome }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao adicionar");
        return;
      }

      setNovoNome((prev) => ({ ...prev, [tipo]: "" }));
      carregar();
    } finally {
      setAdicionando(null);
    }
  }

  async function remover(categoria: Categoria) {
    setRemovendo(categoria.id);
    try {
      const res = await apiFetch(`/api/categorias?id=${categoria.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCategorias((prev) => prev.filter((c) => c.id !== categoria.id));
      }
      setCategoriaParaRemover(null);
    } finally {
      setRemovendo(null);
    }
  }

  function categoriasPorTipo(tipo: string) {
    return categorias.filter((c) => c.tipo === tipo);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as categorias e opções do sistema
        </p>
      </div>

      {canManageUsers && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Usuários da empresa</h3>
                <p className="text-xs text-muted-foreground">
                  Adicione e remova acessos somente desta empresa
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {usuarios.length} {usuarios.length === 1 ? "usuário" : "usuários"}
              </Badge>
            </div>

            {usuariosLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : (
              <div className="space-y-6">
                <div className="overflow-hidden rounded-lg border">
                  {usuarios.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      Nenhum usuário vinculado a esta empresa.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {usuarios.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium">{item.usuario.nome}</p>
                              <Badge variant={item.ativo && item.usuario.ativo ? "secondary" : "outline"}>
                                {ROLE_LABELS[item.role as Role] ?? item.role}
                              </Badge>
                              {(!item.ativo || !item.usuario.ativo) && (
                                <Badge variant="outline">inativo</Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{item.usuario.email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={removendoUsuarioId === item.id}
                            onClick={() => setUsuarioParaRemover(item)}
                          >
                            {removendoUsuarioId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-dashed p-4">
                  <div className="text-sm font-medium">Adicionar usuário</div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_160px_160px]">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <Input
                        value={usuarioForm.nome}
                        onChange={(e) => setUsuarioForm((prev) => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">E-mail</Label>
                      <Input
                        type="email"
                        value={usuarioForm.email}
                        onChange={(e) => setUsuarioForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="usuario@empresa.com"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Senha inicial</Label>
                      <Input
                        type="password"
                        value={usuarioForm.senha}
                        onChange={(e) => setUsuarioForm((prev) => ({ ...prev, senha: e.target.value }))}
                        placeholder="mín. 6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Perfil</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                        value={usuarioForm.role}
                        onChange={(e) => setUsuarioForm((prev) => ({ ...prev, role: e.target.value as Role }))}
                      >
                        {ROLE_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={salvandoUsuario}
                    onClick={adicionarUsuario}
                  >
                    {salvandoUsuario ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Adicionar usuário
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        SECOES.map((secao) => {
          const items = categoriasPorTipo(secao.tipo);
          const inputValue = novoNome[secao.tipo] || "";
          const isAdding = adicionando === secao.tipo;

          return (
            <Card key={secao.tipo}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Tags className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{secao.titulo}</h3>
                    <p className="text-xs text-muted-foreground">
                      {secao.descricao}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {items.length} {items.length === 1 ? "item" : "itens"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Nenhuma categoria cadastrada. Adicione abaixo.
                    </p>
                  ) : (
                    items.map((cat) => (
                      <div
                        key={cat.id}
                        className="group inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:border-destructive/50"
                      >
                        {cat.nome}
                        <button
                          type="button"
                          onClick={() => setCategoriaParaRemover(cat)}
                          disabled={removendo === cat.id}
                          className="ml-0.5 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        >
                          {removendo === cat.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder={secao.placeholder}
                    value={inputValue}
                    onChange={(e) =>
                      setNovoNome((prev) => ({
                        ...prev,
                        [secao.tipo]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        adicionar(secao.tipo);
                      }
                    }}
                    disabled={isAdding}
                  />
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    disabled={!inputValue.trim() || isAdding}
                    onClick={() => adicionar(secao.tipo)}
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* WhatsApp via Twilio — RF-12 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
              <MessageCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">WhatsApp via Twilio</h3>
              <p className="text-xs text-muted-foreground">
                Credenciais Twilio para envio e recebimento de mensagens
              </p>
            </div>
          </div>

          {waLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">IA Assistente WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">
                    Quando ativada, a IA responde automaticamente mensagens dos candidatos
                  </p>
                </div>
                <Switch
                  checked={waConfig.iaWhatsappAtivo}
                  onCheckedChange={(checked) =>
                    setWaConfig((prev) => ({ ...prev, iaWhatsappAtivo: checked }))
                  }
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Account SID</Label>
                  <Input
                    value={waForm.twilioAccountSid}
                    onChange={(e) => setWaForm((prev) => ({ ...prev, twilioAccountSid: e.target.value }))}
                    placeholder="AC..."
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Auth Token</Label>
                  <Input
                    type="password"
                    value={waForm.twilioAuthToken}
                    onChange={(e) => setWaForm((prev) => ({ ...prev, twilioAuthToken: e.target.value }))}
                    placeholder={waConfig.twilioAuthToken ? "Token configurado (deixe vazio para manter)" : "Cole o Auth Token"}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">From Number (WhatsApp)</Label>
                  <Input
                    value={waForm.twilioFromNumber}
                    onChange={(e) => setWaForm((prev) => ({ ...prev, twilioFromNumber: e.target.value }))}
                    placeholder="whatsapp:+14155238886"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Formato esperado: <code>whatsapp:+E164</code>. Sandbox padrão do Twilio: <code>whatsapp:+14155238886</code>.
                  </p>
                </div>
              </div>

              <Button
                className="gap-1.5"
                disabled={waSaving}
                onClick={salvarWhatsApp}
              >
                {waSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar configurações
              </Button>
              <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                Configure no console Twilio o webhook inbound como{" "}
                <code>https://SEU_DOMINIO/api/whatsapp/webhook</code>. A assinatura{" "}
                <code>X-Twilio-Signature</code> é validada em produção usando{" "}
                <code>WHATSAPP_WEBHOOK_BASE_URL</code>.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comportamento da IA */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
              <Bot className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Comportamento da IA</h3>
              <p className="text-xs text-muted-foreground">
                Define persona, tom, FAQ e tópicos proibidos usados pela IA nas respostas WhatsApp
              </p>
            </div>
          </div>

          {waLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Modo rascunho</Label>
                  <p className="text-xs text-muted-foreground">
                    Quando ativo, a IA apenas sugere a resposta. O RH precisa aprovar antes do envio.
                  </p>
                </div>
                <Switch
                  checked={waConfig.iaModoDraft}
                  onCheckedChange={(checked) =>
                    setWaConfig((prev) => ({ ...prev, iaModoDraft: checked }))
                  }
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Persona</Label>
                <Textarea
                  rows={3}
                  value={iaForm.iaPersona}
                  onChange={(e) => setIaForm((prev) => ({ ...prev, iaPersona: e.target.value }))}
                  placeholder='Ex: "Sou Ana, assistente virtual de RH da Acme. Ajudo candidatos com dúvidas sobre vagas e entrevistas."'
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Tom de voz</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                  value={iaForm.iaTomVoz}
                  onChange={(e) => setIaForm((prev) => ({ ...prev, iaTomVoz: e.target.value }))}
                >
                  <option value="">(usar padrão)</option>
                  {TOM_OPCOES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">FAQ (markdown)</Label>
                <Textarea
                  rows={6}
                  value={iaForm.iaFAQ}
                  onChange={(e) => setIaForm((prev) => ({ ...prev, iaFAQ: e.target.value }))}
                  placeholder={"Ex:\n- Qual o horário de trabalho? Segunda a sexta, 9h às 18h.\n- Tem vale-refeição? Sim, R$ 35/dia."}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Tópicos proibidos</Label>
                <Textarea
                  rows={3}
                  value={iaForm.iaBlocklist}
                  onChange={(e) => setIaForm((prev) => ({ ...prev, iaBlocklist: e.target.value }))}
                  placeholder={"Ex:\n- política e religião\n- valor de salário (encaminhar pro RH)"}
                />
              </div>

              <Button
                className="gap-1.5"
                disabled={iaSaving}
                onClick={salvarComportamentoIA}
              >
                {iaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar comportamento da IA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates Twilio (ContentSid) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Templates Twilio</h3>
              <p className="text-xs text-muted-foreground">
                Mapeie cada ContentSid aprovado no Twilio Content Builder a um slug usado pelo código
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {templates.length} {templates.length === 1 ? "template" : "templates"}
            </Badge>
          </div>

          {templatesLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          ) : (
            <div className="space-y-6">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum template cadastrado. Adicione abaixo o ContentSid de um template aprovado no Twilio.
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start justify-between gap-4 rounded-lg border p-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{t.slug}</code>
                          <span className="text-sm font-medium">{t.nome}</span>
                          {!t.ativo && <Badge variant="outline" className="text-xs">inativo</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground break-all">
                          ContentSid: <code>{t.contentSid}</code>
                        </div>
                        {t.variaveis && (
                          <div className="text-xs text-muted-foreground">
                            Variáveis: <code>{t.variaveis}</code>
                          </div>
                        )}
                        {t.descricao && (
                          <p className="text-xs text-muted-foreground">{t.descricao}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => iniciarEdicaoTemplate(t)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={removendoTemplateId === t.id}
                          onClick={() => setTemplateParaRemover(t)}
                        >
                          {removendoTemplateId === t.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 rounded-lg border border-dashed p-4">
                <div className="text-sm font-medium">
                  {editandoTemplateId ? "Editar template" : "Adicionar template"}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Slug (ID interno)</Label>
                    <Input
                      value={templateForm.slug}
                      onChange={(e) => setTemplateForm((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="entrevista_agendada"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input
                      value={templateForm.nome}
                      onChange={(e) => setTemplateForm((prev) => ({ ...prev, nome: e.target.value }))}
                      placeholder="Convite de entrevista"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">ContentSid (HX...)</Label>
                    <Input
                      value={templateForm.contentSid}
                      onChange={(e) => setTemplateForm((prev) => ({ ...prev, contentSid: e.target.value }))}
                      placeholder="HXb5b62575e6e4ff6129ad7c8efe1f983e"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Variáveis (CSV ordenado, ex: data,horario)</Label>
                    <Input
                      value={templateForm.variaveis}
                      onChange={(e) => setTemplateForm((prev) => ({ ...prev, variaveis: e.target.value }))}
                      placeholder="data,horario"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cada nome vira a chave numérica esperada pelo Twilio: posição 1, 2, 3...
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <Input
                      value={templateForm.descricao}
                      onChange={(e) => setTemplateForm((prev) => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={salvandoTemplate}
                    onClick={salvarTemplate}
                  >
                    {salvandoTemplate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {editandoTemplateId ? "Atualizar" : "Adicionar"}
                  </Button>
                  {editandoTemplateId && (
                    <Button size="sm" variant="ghost" onClick={cancelarEdicaoTemplate}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={usuarioParaRemover !== null}
        onOpenChange={(open) => {
          if (!open && removendoUsuarioId === null) {
            setUsuarioParaRemover(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário da empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              {usuarioParaRemover
                ? `Isso remove o acesso de "${usuarioParaRemover.usuario.nome}" somente desta empresa. O usuário não será apagado globalmente.`
                : "Confirme a remoção."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendoUsuarioId !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!usuarioParaRemover || removendoUsuarioId !== null}
              onClick={() => {
                if (usuarioParaRemover) {
                  void removerUsuario(usuarioParaRemover);
                }
              }}
            >
              {removendoUsuarioId ? (
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

      <AlertDialog
        open={categoriaParaRemover !== null}
        onOpenChange={(open) => {
          if (!open && removendo === null) {
            setCategoriaParaRemover(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              {categoriaParaRemover
                ? `Isso remove "${categoriaParaRemover.nome}" das opções disponíveis. Candidatos que já possuem essa área não serão afetados.`
                : "Confirme a remoção."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!categoriaParaRemover || removendo !== null}
              onClick={() => {
                if (categoriaParaRemover) {
                  void remover(categoriaParaRemover);
                }
              }}
            >
              {removendo ? (
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

      <AlertDialog
        open={templateParaRemover !== null}
        onOpenChange={(open) => {
          if (!open && removendoTemplateId === null) {
            setTemplateParaRemover(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover template?</AlertDialogTitle>
            <AlertDialogDescription>
              {templateParaRemover
                ? `Isso remove o template "${templateParaRemover.nome}" (${templateParaRemover.slug}). Mensagens já enviadas continuam preservadas.`
                : "Confirme a remoção."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendoTemplateId !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!templateParaRemover || removendoTemplateId !== null}
              onClick={() => {
                if (templateParaRemover) {
                  void removerTemplate(templateParaRemover);
                }
              }}
            >
              {removendoTemplateId ? (
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
