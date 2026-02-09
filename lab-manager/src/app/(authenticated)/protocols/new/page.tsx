"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface StepForm {
  relative_day: number;
  title: string;
  description: string;
}

export default function NewProtocolPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepForm[]>([
    { relative_day: 0, title: "", description: "" },
  ]);

  const addStep = () => {
    const lastDay =
      steps.length > 0 ? steps[steps.length - 1].relative_day + 1 : 0;
    setSteps([...steps, { relative_day: lastDay, title: "", description: "" }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (
    index: number,
    field: keyof StepForm,
    value: string | number
  ) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Create protocol
    const { data: protocol, error: protocolError } = await supabase
      .from("protocols")
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        is_public: false,
      })
      .select()
      .single();

    if (protocolError || !protocol) {
      alert("プロトコルの作成に失敗しました: " + protocolError?.message);
      setLoading(false);
      return;
    }

    // Create steps
    const stepsToInsert = steps
      .filter((s) => s.title.trim() !== "")
      .map((s, index) => ({
        protocol_id: protocol.id,
        relative_day: s.relative_day,
        title: s.title,
        description: s.description || null,
        sort_order: index,
      }));

    if (stepsToInsert.length > 0) {
      const { error: stepsError } = await supabase
        .from("protocol_steps")
        .insert(stepsToInsert);

      if (stepsError) {
        alert("ステップの作成に失敗しました: " + stepsError.message);
        setLoading(false);
        return;
      }
    }

    router.push(`/protocols/${protocol.id}`);
  };

  return (
    <div>
      <Header title="新規プロトコル作成" />
      <div className="mx-auto max-w-3xl p-6">
        <Link
          href="/protocols"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          プロトコル一覧に戻る
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">プロトコル名 *</Label>
                <Input
                  id="name"
                  placeholder="例: iPS細胞 心筋分化誘導プロトコル"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  placeholder="プロトコルの概要を入力..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>実験ステップ</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1 h-4 w-4" />
                  ステップ追加
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-lg border p-4"
                >
                  <div className="w-24 shrink-0">
                    <Label className="text-xs">Day</Label>
                    <Input
                      type="number"
                      value={step.relative_day}
                      onChange={(e) =>
                        updateStep(index, "relative_day", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label className="text-xs">タイトル *</Label>
                      <Input
                        placeholder="例: 培地交換、継代、サンプリング"
                        value={step.title}
                        onChange={(e) =>
                          updateStep(index, "title", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">詳細</Label>
                      <Textarea
                        placeholder="手順の詳細..."
                        value={step.description}
                        onChange={(e) =>
                          updateStep(index, "description", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(index)}
                    className="shrink-0 self-start text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {steps.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  ステップを追加してください
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/protocols">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "作成中..." : "プロトコルを作成"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
