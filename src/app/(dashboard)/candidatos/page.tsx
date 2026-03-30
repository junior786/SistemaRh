"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, ChevronRight } from "lucide-react";

interface Candidato {
  id: string;
  nome: string;
  email: string;
  cidade: string | null;
  genero: string | null;
  statusEmprego: string;
  skills: { nome: string }[];
  _count: { triagens: number };
}

const statusEmpregoLabel: Record<string, string> = {
  DISPONIVEL: "Disponível",
  EMPREGADO: "Empregado",
  INATIVO: "Inativo",
};

export default function CandidatosPage() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);

    fetch(`/api/candidatos?${params}`)
      .then((r) => r.json())
      .then(setCandidatos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [busca]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar candidatos..."
            className="h-9 w-[260px] pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Link href="/candidatos/novo" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus className="h-4 w-4" />
          Novo Candidato
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Gênero</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="text-center">Vagas</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : candidatos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum candidato encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                candidatos.map((c) => (
                  <TableRow key={c.id} className="group">
                    <TableCell>
                      <Link
                        href={`/candidatos/${c.id}`}
                        className="font-medium text-foreground group-hover:text-primary"
                      >
                        {c.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.cidade || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.genero || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.statusEmprego === "DISPONIVEL" ? "default" :
                          c.statusEmprego === "EMPREGADO" ? "secondary" : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {statusEmpregoLabel[c.statusEmprego] ?? c.statusEmprego}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.skills.slice(0, 4).map((s) => (
                          <Badge
                            key={s.nome}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {s.nome}
                          </Badge>
                        ))}
                        {c.skills.length > 4 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{c.skills.length - 4}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {c._count.triagens}
                    </TableCell>
                    <TableCell>
                      <Link href={`/candidatos/${c.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
