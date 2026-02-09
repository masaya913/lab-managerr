"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Beaker, Trash2 } from "lucide-react";
import { ProtocolWithSteps } from "@/types/database";

export default function ProtocolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [protocol, setProtocol] = useState<ProtocolWithSteps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProtocol() {
      const { data } = await supabase
        .from("protocols")
        .select("*, protocol_steps(*)")
        .eq("id", params.id as string)
        .single();

      if (data) {
        const sorted = {
          ...data,
          protocol_steps: (data.protocol_steps || []).sort(
            (a: { sort_order: number }, b: { sort_order: number }) =>
              a.sort_order - b.sort_order
          ),
        };
        setProtocol(sorted as ProtocolWithSteps);
      }
      setLoading(false);
    }
    fetchProtocol();
  }, [params.id, supabase]);

  const handleDelete = async () => {
    if (!confirm("このプロトコルを削除しますか？")) return;
    await supabase.from("protocols").delete().eq("id", params.id as string);
    router.push("/protocols");
  };

  if (loading) {
    return (
      <div>
        <Header title="プロトコル詳細" />
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div>
        <Header title="プロトコル詳細" />
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">プロトコルが見つかりません</p>
          <Link href="/protocols" className="mt-4">
            <Button variant="outline">一覧に戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={protocol.name} />
      <div className="mx-auto max-w-3xl p-6">
        <Link
          href="/protocols"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          プロトコル一覧に戻る
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{protocol.name}</CardTitle>
                <CardDescription>
                  {protocol.description || "説明なし"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {protocol.is_public && <Badge variant="secondary">公開</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Link href={`/experiments/new?protocol=${protocol.id}`}>
                <Button>
                  <Beaker className="mr-2 h-4 w-4" />
                  この手順で実験を開始
                </Button>
              </Link>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>実験ステップ ({protocol.protocol_steps.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {protocol.protocol_steps.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                ステップが登録されていません
              </p>
            ) : (
              <div className="space-y-3">
                {protocol.protocol_steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex gap-4 rounded-lg border p-4"
                  >
                    <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-sm font-bold">
                      Day {step.relative_day}
                    </div>
                    <div>
                      <p className="font-medium">{step.title}</p>
                      {step.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
