"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api-fetch";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

type AuthMe = {
  empresa: {
    nome: string;
    slug: string;
  };
  membership: {
    role: string;
    ativo: boolean;
  };
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [session, setSession] = useState<AuthMe | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user) return;

    let cancelled = false;

    async function checkAccess() {
      setCheckingAccess(true);
      const response = await apiFetch("/api/auth/me");
      const data = await response.json().catch(() => null);

      if (cancelled) return;

      if (!response.ok || !data?.membership?.ativo) {
        await signOut();
        router.replace("/login");
        return;
      }

      setSession(data as AuthMe);
      setCheckingAccess(false);
    }

    checkAccess().catch(async () => {
      if (cancelled) return;
      await signOut();
      router.replace("/login");
    });

    return () => {
      cancelled = true;
    };
  }, [user, loading, router, signOut]);

  if (loading || checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar empresa={session?.empresa ?? null} role={session?.membership.role ?? null} />
      <div className="ml-[220px] flex flex-1 flex-col">
        <Header empresa={session?.empresa ?? null} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
