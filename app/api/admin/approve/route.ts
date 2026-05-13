// app/api/admin/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

// Creates a Supabase client using the authenticated user's session
// This means the update runs AS the logged-in user, so RLS allows it
async function getSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSessionClient();

    // Verify the requesting user is an admin
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmails = getAdminEmails();

    if (!user || !adminEmails.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { id, action } = await req.json();

    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const updateData =
      action === "approve"
        ? { status: "approved", approved_at: new Date().toISOString() }
        : { status: "rejected" };

    // Update runs using the authenticated user's session — RLS allows this
    const { error } = await supabase
      .from("cards")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Approve/reject error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Officer approved." : "Submission rejected.",
    });

  } catch (err: any) {
    console.error("Approve route error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// GET handler for email approve/reject links
// These come from clicking links in the notification email
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id     = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id || !["approve", "reject"].includes(action ?? "")) {
    return NextResponse.redirect(
      new URL("/admin/submissions?error=invalid", req.url)
    );
  }

  try {
    const supabase = await getSessionClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmails = getAdminEmails();

    if (!user || !adminEmails.includes(user.email ?? "")) {
      return NextResponse.redirect(
        new URL("/admin/submissions?error=unauthorized", req.url)
      );
    }

    const updateData =
      action === "approve"
        ? { status: "approved", approved_at: new Date().toISOString() }
        : { status: "rejected" };

    const { error } = await supabase
      .from("cards")
      .update(updateData)
      .eq("id", id!);

    if (error) {
      return NextResponse.redirect(
        new URL(`/admin/submissions?error=${encodeURIComponent(error.message)}`, req.url)
      );
    }

    return NextResponse.redirect(
      new URL(`/admin/submissions?success=${action}`, req.url)
    );

  } catch {
    return NextResponse.redirect(
      new URL("/admin/submissions?error=server", req.url)
    );
  }
}
