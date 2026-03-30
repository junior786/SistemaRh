"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, ChevronRight } from "lucide-react";

interface Vaga {
  id: string;
  titulo: string;
  area: string;
  regime: string;
  localizacao: string;
  status: string;
  _count: { triagens: number };
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ABERTA: { label: "Aberta", variant: "default" },
  EM_REVISAO: { label: "Em revisão", variant: "secondary" },
  FECHADA: { label: "Fechada", variant: "destructive" },
};

const regimeMap: Record<string, string> = {
  CLT: "CLT",
  PJ: "PJ",
  ESTAGIO: "Estágio",
  FREELANCER: "Freelancer",
};

export default function VagasPage() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    if (filtroStatus && filtroStatus !== "todos") params.set("status", filtroStatus);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const timeoutId = window.setTimeout(() => {
      setLoading(true);

      fetch(`/api/vagas?${params}`)
        .then(async (r) => {
          const text = await r.text();
          const data = text ? JSON.parse(text) : null;

          if (!r.ok) {
            throw new Error(data?.error || "Erro ao carregar vagas");
          }

          return data;
        })
        .then((data) => {
          setVagas(Array.isArray(data?.items) ? data.items : []);
          setTotal(typeof data?.total === "number" ? data.total : 0);
          setTotalPages(typeof data?.totalPages === "number" ? data.totalPages : 1);
        })
        .catch((error) => {
          console.error(error);
          setVagas([]);
          setTotal(0);
          setTotalPages(1);
        })
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [busca, filtroStatus, page]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={filtroStatus}
            onValueChange={(v) => {
              setFiltroStatus(v ?? "todos");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ABERTA">Aberta</SelectItem>
              <SelectItem value="EM_REVISAO">Em revisão</SelectItem>
              <SelectItem value="FECHADA">Fechada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar vagas..."
              className="h-9 w-[220px] pl-8"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Link href="/vagas/nova" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <Plus className="h-4 w-4" />
            Nova Vaga
          </Link>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaga</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Regime</TableHead>
                <TableHead className="text-center">Candidatos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : vagas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma vaga encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                vagas.map((vaga) => {
                  const st = statusMap[vaga.status] ?? { label: vaga.status, variant: "outline" as const };
                  return (
                    <TableRow key={vaga.id} className="group">
                      <TableCell>
                        <Link href={`/vagas/${vaga.id}`} className="block">
                          <p className="font-medium text-foreground group-hover:text-primary">
                            {vaga.titulo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {vaga.localizacao}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vaga.area}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {regimeMap[vaga.regime] ?? vaga.regime}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {vaga._count.triagens}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/vagas/${vaga.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} vaga(s) no total
        </p>

        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Anterior"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((pageNumber) => {
                if (totalPages <= 5) return true;
                return (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - page) <= 1
                );
              })
              .map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                text="Próxima"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
