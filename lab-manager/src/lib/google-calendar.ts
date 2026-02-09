import { google } from "googleapis";
import { Task } from "@/types/database";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
);

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    prompt: "consent",
  });
}

export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function createCalendarEvent(
  refreshToken: string,
  task: Task,
  experimentName: string
) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = {
    summary: `[${experimentName}] ${task.title}`,
    description: task.description || "",
    start: {
      date: task.actual_date,
    },
    end: {
      date: task.actual_date,
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 60 }],
    },
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return response.data.id;
}

export async function deleteCalendarEvent(
  refreshToken: string,
  eventId: string
) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
}

export async function syncExperimentToCalendar(
  refreshToken: string,
  tasks: Task[],
  experimentName: string
): Promise<Map<string, string>> {
  const eventIdMap = new Map<string, string>();

  for (const task of tasks) {
    // Skip tasks that already have a Google Calendar event
    if (task.google_event_id) {
      eventIdMap.set(task.id, task.google_event_id);
      continue;
    }

    const eventId = await createCalendarEvent(
      refreshToken,
      task,
      experimentName
    );
    if (eventId) {
      eventIdMap.set(task.id, eventId);
    }
  }

  return eventIdMap;
}
