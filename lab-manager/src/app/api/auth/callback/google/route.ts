import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTokensFromCode } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // experiment ID to redirect back to

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  try {
    const tokens = await getTokensFromCode(code);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && tokens.refresh_token) {
      await supabase
        .from("profiles")
        .update({ google_refresh_token: tokens.refresh_token })
        .eq("id", user.id);
    }

    const redirectTo = state
      ? `${origin}/experiments/${state}`
      : `${origin}/dashboard`;
    return NextResponse.redirect(redirectTo);
  } catch {
    return NextResponse.redirect(`${origin}/dashboard`);
  }
}
