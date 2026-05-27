"use client";
import { apiFetch } from "@/lib/api-fetch";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Bot,
  Check,
  CheckCheck,
  AlertCircle,
  FileText,
  PencilLine,
  Trash2,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { normalizePhoneBR } from "@/lib/phone";

interface Mensagem {
  id: string;
  direcao: "ENVIADA" | "RECEBIDA";
  conteudo: string;
  status: "ENVIADA" | "ENTREGUE" | "LIDA" | "FALHA";
  tipo: "LIVRE" | "TEMPLATE";
  geradaPorIA: boolean;
  iaRascunho: boolean;
  criadoEm: string;
}

interface Candidato {
  id: string;
  nome: string;
  telefone: string | null;
}

const statusIcon: Record<string, React.ReactNode> = {
  ENVIADA: <Check className="h-3 w-3 text-muted-foreground" />,
  ENTREGUE: <CheckCheck className="h-3 w-3 text-muted-foreground" />,
  LIDA: <CheckCheck className="h-3 w-3 text-blue-500" />,
  FALHA: <AlertCircle className="h-3 w-3 text-destructive" />,
};

function formatHora(d: string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MensagensPage() {
  const params = useParams();
  const candidatoId = params.id as string;

  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [iaAtiva, setIaAtiva] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edicao de rascunho IA
  const [rascunhoEditandoId, setRascunhoEditandoId] = useState<string | null>(null);
  const [rascunhoTexto, setRascunhoTexto] = useState("");
  const [rascunhoAcao, setRascunhoAcao] = useState<string | null>(null); // id em processamento

  const scrollRef = useRef<HTMLDivElement>(null);

  // Carregar candidato e mensagens
  useEffect(() => {
    Promise.all([
      apiFetch(`/api/candidatos/${candidatoId}`).then((r) => r.json()),
      apiFetch(`/api/whatsapp/mensagens?candidatoId=${candidatoId}`).then((r) => r.json()),
    ])
      .then(([cand, data]) => {
        setCandidato(cand);
        setMensagens(data.mensagens);
        setIaAtiva(data.controle?.iaAtiva ?? true);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [candidatoId]);

  // Auto-scroll ao carregar ou receber mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  // Polling a cada 5s para novas mensagens
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/whatsapp/mensagens?candidatoId=${candidatoId}`).then((r) => r.json());
        setMensagens(data.mensagens);
        setIaAtiva(data.controle?.iaAtiva ?? true);
      } catch {
        // silenciar erros de polling
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [candidatoId]);

  const semTelefone = !candidato?.telefone;

  async function enviarMensagem() {
    if (!texto.trim() || enviando) return;

    setEnviando(true);
    try {
      const res = await apiFetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidatoId, conteudo: texto.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao enviar");
        return;
      }

      const msg = await res.json();
      setMensagens((prev) => [...prev, msg]);
      setTexto("");
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setEnviando(false);
    }
  }

  async function recarregar() {
    try {
      const data = await apiFetch(`/api/whatsapp/mensagens?candidatoId=${candidatoId}`).then((r) => r.json());
      setMensagens(data.mensagens);
      setIaAtiva(data.controle?.iaAtiva ?? true);
    } catch {
      // silenciar
    }
  }

  async function aprovarRascunho(id: string, conteudoOverride?: string) {
    setRascunhoAcao(id);
    try {
      const res = await apiFetch(`/api/whatsapp/mensagens/${id}/aprovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conteudoOverride !== undefined ? { conteudo: conteudoOverride } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao aprovar rascunho");
        return;
      }
      setRascunhoEditandoId(null);
      setRascunhoTexto("");
      await recarregar();
    } finally {
      setRascunhoAcao(null);
    }
  }

  function iniciarEdicaoRascunho(msg: Mensagem) {
    setRascunhoEditandoId(msg.id);
    setRascunhoTexto(msg.conteudo);
  }

  function cancelarEdicaoRascunho() {
    setRascunhoEditandoId(null);
    setRascunhoTexto("");
  }

  async function descartarRascunho(id: string) {
    setRascunhoAcao(id);
    try {
      const res = await apiFetch(`/api/whatsapp/mensagens/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Erro ao descartar rascunho");
        return;
      }
      await recarregar();
    } finally {
      setRascunhoAcao(null);
    }
  }

  async function toggleIA() {
    setToggling(true);
    try {
      await apiFetch("/api/whatsapp/controle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidatoId, iaAtiva: !iaAtiva }),
      });
      setIaAtiva(!iaAtiva);
    } catch {
      toast.error("Erro ao alterar controle");
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!candidato) return <p className="text-muted-foreground">Candidato não encontrado.</p>;

  // Agrupar mensagens por data
  const mensagensPorDia = new Map<string, Mensagem[]>();
  for (const msg of mensagens) {
    const dia = formatData(msg.criadoEm);
    if (!mensagensPorDia.has(dia)) mensagensPorDia.set(dia, []);
    mensagensPorDia.get(dia)!.push(msg);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div className="flex items-center gap-3">
          <Link href={`/candidatos/${candidatoId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-lg font-semibold">{candidato.nome}</h2>
            <p className="text-xs text-muted-foreground">{normalizePhoneBR(candidato.telefone) || "Sem telefone"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={iaAtiva ? "default" : "secondary"} className="text-xs">
            {iaAtiva ? "IA ativa" : "RH no controle"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={toggling}
            onClick={toggleIA}
          >
            {iaAtiva ? "Assumir conversa" : "Retomar IA"}
          </Button>
        </div>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 pr-2">
        {mensagens.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Nenhuma mensagem ainda.
          </div>
        ) : (
          Array.from(mensagensPorDia.entries()).map(([dia, msgs]) => (
            <div key={dia}>
              <div className="flex justify-center my-3">
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {dia}
                </span>
              </div>
              {msgs.map((msg) => {
                const emEdicao = rascunhoEditandoId === msg.id;
                const processando = rascunhoAcao === msg.id;
                const bolhaClasses = msg.iaRascunho
                  ? "max-w-[70%] rounded-xl px-4 py-2.5 border-2 border-dashed border-amber-400 bg-amber-50 text-amber-900"
                  : msg.direcao === "ENVIADA"
                    ? "max-w-[70%] rounded-xl px-4 py-2.5 bg-primary text-primary-foreground"
                    : "max-w-[70%] rounded-xl px-4 py-2.5 bg-muted";
                return (
                  <div
                    key={msg.id}
                    className={`flex mb-2 ${msg.direcao === "ENVIADA" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={bolhaClasses}>
                      {msg.iaRascunho && (
                        <div className="flex items-center gap-1 mb-1 text-xs font-medium">
                          <Bot className="h-3 w-3" />
                          <span>Rascunho da IA — aguardando aprovação</span>
                        </div>
                      )}

                      {!msg.iaRascunho && msg.geradaPorIA && (
                        <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
                          <Bot className="h-3 w-3" />
                          <span>IA</span>
                        </div>
                      )}

                      {msg.tipo === "TEMPLATE" && (
                        <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
                          <FileText className="h-3 w-3" />
                          <span>Template</span>
                        </div>
                      )}

                      {emEdicao ? (
                        <Textarea
                          value={rascunhoTexto}
                          onChange={(e) => setRascunhoTexto(e.target.value)}
                          rows={3}
                          className="text-sm bg-white text-foreground"
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                      )}

                      {msg.iaRascunho && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {emEdicao ? (
                            <>
                              <Button
                                size="sm"
                                disabled={processando || !rascunhoTexto.trim()}
                                onClick={() => aprovarRascunho(msg.id, rascunhoTexto.trim())}
                              >
                                {processando ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                Enviar editada
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={processando}
                                onClick={cancelarEdicaoRascunho}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                disabled={processando}
                                onClick={() => aprovarRascunho(msg.id)}
                              >
                                {processando ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processando}
                                onClick={() => iniciarEdicaoRascunho(msg)}
                              >
                                <PencilLine className="h-3 w-3" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processando}
                                onClick={() => descartarRascunho(msg.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Descartar
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] opacity-60">{formatHora(msg.criadoEm)}</span>
                        {msg.direcao === "ENVIADA" && !msg.iaRascunho && statusIcon[msg.status]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t pt-4 mt-2">
        {semTelefone ? (
          <div className="text-center text-sm text-muted-foreground py-2">
            Candidato sem telefone cadastrado. Adicione um telefone no perfil para enviar mensagens.
          </div>
        ) : (
          <div className="flex gap-2">
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviarMensagem();
                }
              }}
            />
            <Button
              size="sm"
              className="self-end"
              disabled={!texto.trim() || enviando}
              onClick={enviarMensagem}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
