// app/api/admin/photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Admin client only for storage operations
const supabaseStorage = createClient(
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

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSessionClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmails = getAdminEmails();

    if (!user || !adminEmails.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const formData = await req.formData();
    const cardId   = formData.get("card_id")?.toString();
    const photo    = formData.get("photo") as File | null;

    if (!cardId) {
      return NextResponse.json({ error: "Card ID required." }, { status: 400 });
    }
    if (!photo || photo.size === 0) {
      return NextResponse.json({ error: "Photo file required." }, { status: 400 });
    }

    // Validate file
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(photo.type)) {
      return NextResponse.json({ error: "Photo must be PNG or JPG." }, { status: 400 });
    }
    if (photo.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo must be under 2MB." }, { status: 400 });
    }

    // Fetch current card to get old photo URL
    // Uses session client so RLS allows the read
    const { data: card } = await supabase
      .from("cards")
      .select("id, profile_photo_url")
      .eq("id", cardId)
      .single();

    // Delete old photo from storage if it exists
    if (card?.profile_photo_url) {
      try {
        const url       = new URL(card.profile_photo_url);
        const pathParts = url.pathname.split("/profile-photos/");
        if (pathParts.length > 1) {
          await supabaseStorage.storage
            .from("profile-photos")
            .remove([pathParts[1]]);
        }
      } catch {
        // Non-fatal
      }
    }

    // Upload new photo using storage client
    const timestamp = Date.now();
    const random    = Math.random().toString(36).substring(2, 8);
    const ext       = photo.type === "image/png" ? "png" : "jpg";
    const filePath  = `${cardId}/${timestamp}_${random}.${ext}`;
    const buffer    = new Uint8Array(await photo.arrayBuffer());

    const { error: uploadError } = await supabaseStorage.storage
      .from("profile-photos")
      .upload(filePath, buffer, { contentType: photo.type, upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Photo upload failed." }, { status: 500 });
    }

    const { data: urlData } = supabaseStorage.storage
      .from("profile-photos")
      .getPublicUrl(filePath);

    const profile_photo_url = urlData.publicUrl;

    // Update card with new photo URL using SESSION client so RLS allows it
    const { error: updateError } = await supabase
      .from("cards")
      .update({ profile_photo_url })
      .eq("id", cardId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile_photo_url });

  } catch (err: any) {
    console.error("Photo route error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
