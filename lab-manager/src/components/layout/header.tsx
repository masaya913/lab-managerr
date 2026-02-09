"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Header({ title }: { title: string }) {
  const [displayName, setDisplayName] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        setDisplayName(data?.display_name || user.email || "");
      }
    }
    getProfile();
  }, [supabase]);

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="text-sm text-muted-foreground">{displayName}</div>
    </header>
  );
}
