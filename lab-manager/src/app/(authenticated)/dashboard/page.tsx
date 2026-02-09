"use client";

import { useEffect, useState, useCallback } from "react";
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
  Check,
  ImagePlus,
  Loader2,
  Beaker,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
} from "lucide-react";
import { Task, Experiment } from "@/types/database";
import { format, addDays, subDays, isToday, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";

interface TaskWithExperiment extends Task {
  experiment: Experiment;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayTasks, setTodayTasks] = useState<TaskWithExperiment[]>([]);
  const [activeExperiments, setActiveExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch tasks for selected date with experiment info
    const { data: taskData } = await supabase
      .from("tasks")
      .select("*, experiment:experiments(*)")
      .eq("actual_date", dateStr);

    // Fetch active experiments
    const { data: expData } = await supabase
      .from("experiments")
      .select("*")
      .eq("status", "active")
      .order("start_date", { ascending: false });

    const mapped = (taskData || []).map((t: Record<string, unknown>) => {
      const exp = t.experiment;
      return {
        ...t,
        experiment: Array.isArray(exp) ? exp[0] : exp,
      };
    });
    setTodayTasks(mapped as TaskWithExperiment[]);
    setActiveExperiments(expData || []);
    setLoading(false);
  }, [dateStr, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleTaskComplete = async (task: Task) => {
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: !task.is_completed })
      .eq("id", task.id);

    if (!error) {
      setTodayTasks(
        todayTasks.map((t) =>
          t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
        )
      );
    }
  };

  const updateTaskNotes = async (taskId: string, notes: string) => {
    await supabase.from("tasks").update({ notes }).eq("id", taskId);
    setTodayTasks(
      todayTasks.map((t) => (t.id === taskId ? { ...t, notes } : t))
    );
  };

  const handleImageUpload = async (taskId: string, file: File) => {
    setUploadingTaskId(taskId);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const task = todayTasks.find((t) => t.id === taskId);
    if (!task) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${task.experiment_id}/${taskId}.${fileExt}`;

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

    setTodayTasks(
      todayTasks.map((t) =>
        t.id === taskId ? { ...t, image_url: publicUrl } : t
      )
    );
    setUploadingTaskId(null);
  };

  const completedToday = todayTasks.filter((t) => t.is_completed).length;

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6">
        {/* Stats cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>進行中の実験</CardDescription>
              <CardTitle className="text-3xl">
                {activeExperiments.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href="/experiments"
                className="text-xs text-muted-foreground hover:underline"
              >
                実験一覧を見る
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {isToday(selectedDate) ? "今日" : format(selectedDate, "M/d")}
                のタスク
              </CardDescription>
              <CardTitle className="text-3xl">{todayTasks.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {completedToday}件完了
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>完了率</CardDescription>
              <CardTitle className="text-3xl">
                {todayTasks.length > 0
                  ? Math.round((completedToday / todayTasks.length) * 100)
                  : 0}
                %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width:
                      todayTasks.length > 0
                        ? `${(completedToday / todayTasks.length) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date navigator */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isToday(selectedDate) ? "default" : "outline"}
            onClick={() => setSelectedDate(startOfDay(new Date()))}
          >
            今日
          </Button>
          <h2 className="text-lg font-semibold">
            {format(selectedDate, "yyyy年M月d日 (EEEE)", { locale: ja })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tasks */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : todayTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FlaskConical className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">
                {isToday(selectedDate)
                  ? "今日のタスクはありません"
                  : "この日のタスクはありません"}
              </p>
              <p className="text-sm text-muted-foreground">
                実験を作成するとタスクが表示されます
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskComplete(task)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        task.is_completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:border-primary"
                      }`}
                    >
                      {task.is_completed && <Check className="h-3 w-3" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-medium ${
                            task.is_completed ? "line-through opacity-60" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        <Link href={`/experiments/${task.experiment_id}`}>
                          <Badge variant="outline" className="cursor-pointer text-xs">
                            <Beaker className="mr-1 h-3 w-3" />
                            {task.experiment?.name}
                          </Badge>
                        </Link>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      )}

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
                      </div>

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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
