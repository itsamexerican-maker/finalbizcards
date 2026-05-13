// app/api/admin/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Admin client only used for storage deletion
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

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await getSessionClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmails = getAdminEmails();

    if (!user || !adminEmails.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Card ID required." }, { status: 400 });
    }

    // Fetch card to get photo URL before deleting
    // Uses session client so RLS allows the read
    const { data: card, error: fetchError } = await supabase
      .from("cards")
      .select("id, name, profile_photo_url")
      .eq("id", id)
      .single();

    if (fetchError || !card) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    // Delete profile photo from storage if it exists
    if (card.profile_photo_url) {
      try {
        const url       = new URL(card.profile_photo_url);
        const pathParts = url.pathname.split("/profile-photos/");
        if (pathParts.length > 1) {
          await supabaseAdmin.storage
            .from("profile-photos")
            .remove([pathParts[1]]);
        }
      } catch (urlErr) {
        console.error("Could not delete photo (non-fatal):", urlErr);
      }
    }

    // Hard delete using session client so RLS allows it
    const { error: deleteError } = await supabase
      .from("cards")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DB delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${card.name}'s record has been permanently removed.`,
    });

  } catch (err: any) {
    console.error("Delete route error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
