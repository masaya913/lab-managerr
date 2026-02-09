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
import { Plus, Beaker } from "lucide-react";
import { Experiment } from "@/types/database";

const statusLabels: Record<string, string> = {
  active: "進行中",
  completed: "完了",
  archived: "アーカイブ",
};

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  completed: "secondary",
  archived: "outline",
};

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchExperiments() {
      const { data } = await supabase
        .from("experiments")
        .select("*")
        .order("created_at", { ascending: false });
      setExperiments(data || []);
      setLoading(false);
    }
    fetchExperiments();
  }, [supabase]);

  return (
    <div>
      <Header title="Experiments" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            実験プロジェクトを管理します
          </p>
          <Link href="/experiments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規実験
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : experiments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Beaker className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">
                実験がまだありません
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                プロトコルを選んで新しい実験を開始しましょう
              </p>
              <Link href="/experiments/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  新規実験
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {experiments.map((exp) => (
              <Link key={exp.id} href={`/experiments/${exp.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{exp.name}</CardTitle>
                      <Badge variant={statusVariants[exp.status]}>
                        {statusLabels[exp.status]}
                      </Badge>
                    </div>
                    <CardDescription>
                      開始日:{" "}
                      {new Date(exp.start_date).toLocaleDateString("ja-JP")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {exp.notes || "メモなし"}
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
