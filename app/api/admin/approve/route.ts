// app/api/admin/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side admin client using secret key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

async function getRequestingUserEmail(req: NextRequest): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const userEmail   = await getRequestingUserEmail(req);
    const adminEmails = getAdminEmails();

    if (!userEmail || !adminEmails.includes(userEmail)) {
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

    const { error } = await supabaseAdmin
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

// Also handle GET requests from email approve/reject links
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id     = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id || !["approve", "reject"].includes(action ?? "")) {
    return NextResponse.redirect(
      new URL("/admin/submissions?error=invalid", req.url)
    );
  }

  const updateData =
    action === "approve"
      ? { status: "approved", approved_at: new Date().toISOString() }
      : { status: "rejected" };

  const { error } = await supabaseAdmin
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
}
