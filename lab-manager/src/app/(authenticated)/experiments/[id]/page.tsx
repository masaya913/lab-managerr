"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  Check,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Experiment, Task } from "@/types/database";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function ExperimentDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: exp } = await supabase
      .from("experiments")
      .select("*")
      .eq("id", params.id as string)
      .single();

    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .eq("experiment_id", params.id as string)
      .order("actual_date")
      .order("relative_day");

    if (exp) setExperiment(exp);
    setTasks(taskData || []);
    setLoading(false);
  }, [params.id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleTaskComplete = async (task: Task) => {
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: !task.is_completed })
      .eq("id", task.id);

    if (!error) {
      setTasks(
        tasks.map((t) =>
          t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
        )
      );
    }
  };

  const updateTaskNotes = async (taskId: string, notes: string) => {
    await supabase.from("tasks").update({ notes }).eq("id", taskId);
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, notes } : t)));
  };

  const handleImageUpload = async (
    taskId: string,
    file: File
  ) => {
    setUploadingTaskId(taskId);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${params.id}/${taskId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("cell-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("画像のアップロードに失敗しました: " + uploadError.message);
      setUploadingTaskId(null);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("cell-images").getPublicUrl(filePath);

    await supabase
      .from("tasks")
      .update({ image_url: publicUrl })
      .eq("id", taskId);

    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, image_url: publicUrl } : t
      )
    );
    setUploadingTaskId(null);
  };

  const syncToGoogleCalendar = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId: params.id,
        }),
      });

      const result = await response.json();
      if (result.error) {
        if (result.needsAuth) {
          window.location.href = result.authUrl;
          return;
        }
        alert("同期に失敗しました: " + result.error);
      } else {
        alert(`${result.synced}件のタスクをGoogleカレンダーに同期しました`);
        fetchData();
      }
    } catch {
      alert("同期中にエラーが発生しました");
    }
    setSyncing(false);
  };

  // Group tasks by date
  const tasksByDate = tasks.reduce(
    (acc, task) => {
      const date = task.actual_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  if (loading) {
    return (
      <div>
        <Header title="実験詳細" />
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div>
        <Header title="実験詳細" />
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">実験が見つかりません</p>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div>
      <Header title={experiment.name} />
      <div className="mx-auto max-w-4xl p-6">
        <Link
          href="/experiments"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          実験一覧に戻る
        </Link>

        {/* Experiment Summary */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{experiment.name}</CardTitle>
                <CardDescription>
                  開始日:{" "}
                  {format(new Date(experiment.start_date), "yyyy年M月d日", {
                    locale: ja,
                  })}
                </CardDescription>
              </div>
              <Badge
                variant={
                  experiment.status === "active" ? "default" : "secondary"
                }
              >
                {experiment.status === "active"
                  ? "進行中"
                  : experiment.status === "completed"
                    ? "完了"
                    : "アーカイブ"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                進捗: {completedCount}/{tasks.length} タスク完了
              </div>
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width:
                      tasks.length > 0
                        ? `${(completedCount / tasks.length) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={syncToGoogleCalendar}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              Googleカレンダーに同期
            </Button>
          </CardContent>
        </Card>

        {/* Tasks grouped by date */}
        <div className="space-y-4">
          {Object.entries(tasksByDate).map(([date, dateTasks]) => {
            const isToday =
              format(new Date(), "yyyy-MM-dd") === date;
            return (
              <Card
                key={date}
                className={isToday ? "border-primary" : ""}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span>
                      {format(new Date(date), "M月d日 (EEEE)", {
                        locale: ja,
                      })}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Day{" "}
                      {dateTasks[0]?.relative_day >= 0 ? "+" : ""}
                      {dateTasks[0]?.relative_day}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="ml-2">
                        今日
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dateTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        task.is_completed
                          ? "bg-muted/50 opacity-75"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskComplete(task)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            task.is_completed
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input hover:border-primary"
                          }`}
                        >
                          {task.is_completed && (
                            <Check className="h-3 w-3" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              task.is_completed ? "line-through" : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {task.description}
                            </p>
                          )}

                          {/* Notes */}
                          <div className="mt-3">
                            <Textarea
                              placeholder="実験メモを記録..."
                              value={task.notes || ""}
                              onChange={(e) =>
                                updateTaskNotes(task.id, e.target.value)
                              }
                              rows={2}
                              className="text-sm"
                            />
                          </div>

                          {/* Image upload */}
                          <div className="mt-3 flex items-center gap-3">
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(task.id, file);
                                }}
                              />
                              <span className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
                                {uploadingTaskId === task.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ImagePlus className="h-3 w-3" />
                                )}
                                細胞画像をアップロード
                              </span>
                            </label>
                            {task.google_event_id && (
                              <span className="text-xs text-muted-foreground">
                                <Calendar className="mr-1 inline h-3 w-3" />
                                カレンダー同期済み
                              </span>
                            )}
                          </div>

                          {/* Uploaded image preview */}
                          {task.image_url && (
                            <div className="mt-3">
                              <img
                                src={task.image_url}
                                alt="細胞画像"
                                className="max-h-48 rounded-lg border object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
