import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl, syncExperimentToCalendar } from "@/lib/google-calendar";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { experimentId } = await request.json();

  // Get user's Google refresh token
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_refresh_token")
    .eq("id", user.id)
    .single();

  if (!profile?.google_refresh_token) {
    // User needs to authenticate with Google
    const authUrl = getAuthUrl();
    return NextResponse.json({
      error: "Google認証が必要です",
      needsAuth: true,
      authUrl: authUrl + `&state=${experimentId}`,
    });
  }

  // Get experiment and tasks
  const { data: experiment } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", experimentId)
    .single();

  if (!experiment) {
    return NextResponse.json(
      { error: "実験が見つかりません" },
      { status: 404 }
    );
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("experiment_id", experimentId)
    .order("actual_date");

  if (!tasks || tasks.length === 0) {
    return NextResponse.json(
      { error: "タスクが見つかりません" },
      { status: 404 }
    );
  }

  try {
    const eventIdMap = await syncExperimentToCalendar(
      profile.google_refresh_token,
      tasks,
      experiment.name
    );

    // Update tasks with Google Calendar event IDs
    let synced = 0;
    for (const [taskId, eventId] of eventIdMap) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && !task.google_event_id) {
        await supabase
          .from("tasks")
          .update({ google_event_id: eventId })
          .eq("id", taskId);
        synced++;
      }
    }

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error("Google Calendar sync error:", error);
    return NextResponse.json(
      { error: "カレンダー同期中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
