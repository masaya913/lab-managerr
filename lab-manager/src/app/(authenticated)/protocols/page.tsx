"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FlaskConical } from "lucide-react";
import { Protocol } from "@/types/database";

export default function ProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchProtocols() {
      const { data } = await supabase
        .from("protocols")
        .select("*")
        .order("created_at", { ascending: false });
      setProtocols(data || []);
      setLoading(false);
    }
    fetchProtocols();
  }, [supabase]);

  return (
    <div>
      <Header title="Protocols" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            実験プロトコル（テンプレート）を管理します
          </p>
          <Link href="/protocols/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規プロトコル
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : protocols.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FlaskConical className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">
                プロトコルがまだありません
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                最初のプロトコルを作成して、実験スケジュールのテンプレートを定義しましょう
              </p>
              <Link href="/protocols/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  新規プロトコル
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {protocols.map((protocol) => (
              <Link key={protocol.id} href={`/protocols/${protocol.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {protocol.name}
                      </CardTitle>
                      {protocol.is_public && (
                        <Badge variant="secondary">公開</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {protocol.description || "説明なし"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      作成日:{" "}
                      {new Date(protocol.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
