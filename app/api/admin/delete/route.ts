// app/api/admin/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

async function getRequestingUserEmail(): Promise<string | null> {
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

export async function DELETE(req: NextRequest) {
  try {
    // Verify admin
    const userEmail   = await getRequestingUserEmail();
    const adminEmails = getAdminEmails();

    if (!userEmail || !adminEmails.includes(userEmail)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Card ID required." }, { status: 400 });
    }

    // Fetch card first to get photo URL before deleting
    const { data: card, error: fetchError } = await supabaseAdmin
      .from("cards")
      .select("id, name, profile_photo_url")
      .eq("id", id)
      .single();

    if (fetchError || !card) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    // Delete profile photo from storage if it exists
    if (card.profile_photo_url) {
      // Extract the file path from the public URL
      // URL format: https://<project>.supabase.co/storage/v1/object/public/profile-photos/<path>
      try {
        const url      = new URL(card.profile_photo_url);
        const pathParts = url.pathname.split("/profile-photos/");
        if (pathParts.length > 1) {
          const filePath = pathParts[1];
          const { error: storageError } = await supabaseAdmin.storage
            .from("profile-photos")
            .remove([filePath]);
          if (storageError) {
            console.error("Storage delete error (non-fatal):", storageError);
          }
        }
      } catch (urlErr) {
        console.error("Could not parse photo URL (non-fatal):", urlErr);
      }
    }

    // Hard delete the card from database
    const { error: deleteError } = await supabaseAdmin
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
