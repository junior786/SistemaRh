"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Users,
  CalendarDays,
  Settings,
} from "lucide-react";

const navItems = [
  {
    section: "RECRUTAMENTO",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Vagas", href: "/vagas", icon: Briefcase },
      { label: "Nova Vaga", href: "/vagas/nova", icon: PlusCircle },
      { label: "Candidatos", href: "/candidatos", icon: Users },
      { label: "Entrevistas", href: "/entrevistas", icon: CalendarDays },
    ],
  },
  {
    section: "SISTEMA",
    items: [
      { label: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Briefcase className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold text-foreground">
          RH Selector
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((group) => (
          <div key={group.section} className="mb-6">
            <p
              className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--sidebar-section)" }}
            >
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            RH
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">Admin</p>
            <p className="text-xs text-muted-foreground">RH Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
