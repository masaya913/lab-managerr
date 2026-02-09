"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Protocol, ProtocolStep } from "@/types/database";
import { addDays, format } from "date-fns";

export default function NewExperimentPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><p className="text-muted-foreground">読み込み中...</p></div>}>
      <NewExperimentPage />
    </Suspense>
  );
}

function NewExperimentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProtocol = searchParams.get("protocol");
  const supabase = createClient();

  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState(
    preselectedProtocol || ""
  );
  const [steps, setSteps] = useState<ProtocolStep[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch protocols
  useEffect(() => {
    async function fetchProtocols() {
      const { data } = await supabase
        .from("protocols")
        .select("*")
        .order("name");
      setProtocols(data || []);
    }
    fetchProtocols();
  }, [supabase]);

  // Fetch steps when protocol is selected
  useEffect(() => {
    async function fetchSteps() {
      if (!selectedProtocolId) {
        setSteps([]);
        return;
      }
      const { data } = await supabase
        .from("protocol_steps")
        .select("*")
        .eq("protocol_id", selectedProtocolId)
        .order("sort_order");
      setSteps(data || []);

      // Auto-fill name from protocol
      const protocol = protocols.find((p) => p.id === selectedProtocolId);
      if (protocol && !name) {
        setName(`${protocol.name} - ${format(new Date(), "yyyy/MM/dd")}`);
      }
    }
    fetchSteps();
  }, [selectedProtocolId, supabase, protocols, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Create experiment
    const { data: experiment, error: expError } = await supabase
      .from("experiments")
      .insert({
        user_id: user.id,
        protocol_id: selectedProtocolId || null,
        name,
        start_date: startDate,
        status: "active" as const,
        notes: notes || null,
      })
      .select()
      .single();

    if (expError || !experiment) {
      alert("実験の作成に失敗しました: " + expError?.message);
      setLoading(false);
      return;
    }

    // Create tasks from protocol steps
    if (steps.length > 0) {
      const tasksToInsert = steps.map((step) => {
        const actualDate = addDays(new Date(startDate), step.relative_day);
        return {
          experiment_id: experiment.id,
          step_id: step.id,
          title: step.title,
          description: step.description,
          relative_day: step.relative_day,
          actual_date: format(actualDate, "yyyy-MM-dd"),
          is_completed: false,
        };
      });

      const { error: tasksError } = await supabase
        .from("tasks")
        .insert(tasksToInsert);

      if (tasksError) {
        alert("タスクの作成に失敗しました: " + tasksError.message);
        setLoading(false);
        return;
      }
    }

    router.push(`/experiments/${experiment.id}`);
  };

  return (
    <div>
      <Header title="新規実験" />
      <div className="mx-auto max-w-3xl p-6">
        <Link
          href="/experiments"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          実験一覧に戻る
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>プロトコル選択</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="protocol">プロトコル</Label>
                <select
                  id="protocol"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={selectedProtocolId}
                  onChange={(e) => setSelectedProtocolId(e.target.value)}
                >
                  <option value="">プロトコルを選択してください</option>
                  {protocols.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {steps.length > 0 && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="mb-2 text-sm font-medium">
                    ステップ一覧 ({steps.length}件)
                  </p>
                  <div className="space-y-1">
                    {steps.map((step) => (
                      <div key={step.id} className="flex gap-2 text-sm">
                        <span className="font-mono text-muted-foreground">
                          Day {step.relative_day}
                        </span>
                        <span>{step.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>実験情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">実験名 *</Label>
                <Input
                  id="name"
                  placeholder="例: iPS心筋分化 Batch-001"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">開始日 (Day 0) *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">メモ</Label>
                <Textarea
                  id="notes"
                  placeholder="実験に関するメモ..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {steps.length > 0 && startDate && (
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-medium">
                    スケジュールプレビュー
                  </p>
                  <div className="space-y-1">
                    {steps.map((step) => {
                      const actualDate = addDays(
                        new Date(startDate),
                        step.relative_day
                      );
                      return (
                        <div key={step.id} className="flex gap-3 text-sm">
                          <span className="w-24 text-muted-foreground">
                            {format(actualDate, "MM/dd (EEE)")}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            Day {step.relative_day}
                          </span>
                          <span>{step.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/experiments">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "作成中..." : "実験を開始"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
