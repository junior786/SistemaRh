"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ETAPA_TIPO_LABEL, type EtapaFormInput, type VagaEtapaTipo } from "@/lib/vaga-etapas";

type EtapasFormProps = {
  value: EtapaFormInput[];
  onChange: (value: EtapaFormInput[]) => void;
  disabled?: boolean;
};

const tiposDisponiveis = Object.entries(ETAPA_TIPO_LABEL) as [VagaEtapaTipo, string][];

export function EtapasForm({ value, onChange, disabled = false }: EtapasFormProps) {
  function updateItem(index: number, patch: Partial<EtapaFormInput>) {
    onChange(value.map((item, currentIndex) => (
      currentIndex === index ? { ...item, ...patch } : item
    )));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) {
      return;
    }

    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  function removeItem(index: number) {
    if (index === 0 || value.length === 1) {
      return;
    }

    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  }

  function addItem() {
    onChange([
      ...value,
      {
        nome: "Nova etapa",
        tipo: "ENTREVISTA",
        obrigatoria: true,
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        A primeira etapa é fixa como triagem automática. As próximas etapas definem o funil da vaga.
      </div>

      <div className="space-y-3">
        {value.map((etapa, index) => {
          const isFirst = index === 0;

          return (
            <div key={index} className="rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Etapa {index + 1}</p>
                  <p className="text-xs text-muted-foreground">
                    {isFirst ? "Etapa obrigatória de entrada" : "Etapa configurável do processo"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={disabled || index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={disabled || index === value.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={disabled || isFirst || value.length === 1}
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_auto]">
                <div className="space-y-2">
                  <Label>Nome da etapa</Label>
                  <Input
                    value={etapa.nome}
                    disabled={disabled}
                    onChange={(e) => updateItem(index, { nome: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={etapa.tipo}
                    onValueChange={(tipo) => updateItem(index, { tipo: tipo as VagaEtapaTipo })}
                    disabled={disabled || isFirst}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposDisponiveis.map(([tipo, label]) => (
                        <SelectItem key={tipo} value={tipo}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label
                  className={cn(
                    "flex items-end gap-2 pb-2 text-sm text-muted-foreground",
                    disabled && "opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={etapa.obrigatoria}
                    disabled={disabled}
                    onChange={(e) => updateItem(index, { obrigatoria: e.target.checked })}
                  />
                  Obrigatória
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        className="gap-1.5"
        disabled={disabled}
        onClick={addItem}
      >
        <Plus className="h-4 w-4" />
        Adicionar etapa
      </Button>
    </div>
  );
}
