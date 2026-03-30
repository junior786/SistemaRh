"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/vagas": "Vagas",
  "/vagas/nova": "Nova Vaga",
  "/candidatos": "Candidatos",
  "/candidatos/novo": "Novo Candidato",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.match(/^\/vagas\/[^/]+\/triagem/)) return "Triagem";
  if (pathname.match(/^\/vagas\/[^/]+$/)) return "Detalhe da Vaga";
  if (pathname.match(/^\/candidatos\/[^/]+$/)) return "Perfil do Candidato";
  return "RH Selector";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="h-9 w-[200px] pl-8 text-sm"
          />
        </div>

        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>

        <ThemeToggle />

        <Link href="/vagas/nova" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus className="h-4 w-4" />
          Nova Vaga
        </Link>
      </div>
    </header>
  );
}
