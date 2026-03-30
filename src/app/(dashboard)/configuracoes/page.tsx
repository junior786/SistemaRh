"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, Tags } from "lucide-react";
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

const SECOES = [
  {
    tipo: "AREA_ATUACAO",
    titulo: "Áreas de Atuação",
    descricao: "Categorias disponíveis para selecionar no cadastro de candidatos",
    placeholder: "ex: Desenvolvimento, Líder Técnico, DevOps...",
  },
] as const;

export default function ConfiguracoesPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState<Record<string, string>>({});
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [categoriaParaRemover, setCategoriaParaRemover] = useState<Categoria | null>(null);

  const carregar = useCallback(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then(setCategorias)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function adicionar(tipo: string) {
    const nome = novoNome[tipo]?.trim();
    if (!nome) return;

    setAdicionando(tipo);
    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, nome }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao adicionar");
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
      const res = await fetch(`/api/categorias?id=${categoria.id}`, {
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

                {/* Lista de categorias */}
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

                {/* Adicionar nova */}
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
    </div>
  );
}
