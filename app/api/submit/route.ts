// app/api/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Public client for the card insert — anon RLS policy allows this
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// Storage client for photo uploads only
const supabaseStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const name             = formData.get("name")?.toString().trim() ?? "";
    const rank             = formData.get("rank")?.toString().trim() ?? "Major";
    const regiment         = formData.get("regiment")?.toString().trim() ?? "";
    const category_id      = formData.get("category_id")?.toString().trim() ?? "";
    const years_of_service = parseInt(formData.get("years_of_service")?.toString() ?? "0") || 0;
    const photoFile        = formData.get("photo") as File | null;

    if (!name)        return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!regiment)    return NextResponse.json({ error: "Regiment is required." }, { status: 400 });
    if (!category_id) return NextResponse.json({ error: "Country is required." }, { status: 400 });

    const session_id = crypto.randomUUID();

    // ── Handle photo upload BEFORE insert so we can include URL in one go ──
    let profile_photo_url: string | null = null;

    if (photoFile && photoFile.size > 0) {
      const validTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!validTypes.includes(photoFile.type)) {
        return NextResponse.json({ error: "Photo must be PNG or JPG." }, { status: 400 });
      }
      if (photoFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "Photo must be under 2MB." }, { status: 400 });
      }

      // Use session_id as folder since we don't have card.id yet
      const timestamp = Date.now();
      const random    = Math.random().toString(36).substring(2, 8);
      const ext       = photoFile.type === "image/png" ? "png" : "jpg";
      const filePath  = `submissions/${session_id}/${timestamp}_${random}.${ext}`;
      const buffer    = new Uint8Array(await photoFile.arrayBuffer());

      const { error: uploadError } = await supabaseStorage.storage
        .from("profile-photos")
        .upload(filePath, buffer, { contentType: photoFile.type, upsert: false });

      if (!uploadError) {
        const { data: urlData } = supabaseStorage.storage
          .from("profile-photos")
          .getPublicUrl(filePath);
        profile_photo_url = urlData.publicUrl;
      } else {
        console.error("Photo upload error (non-fatal):", uploadError);
      }
    }

    // ── Insert card with photo URL included in one single operation ────────
    const { data: card, error: insertError } = await supabasePublic
      .from("cards")
      .insert([{
        name,
        rank,
        regiment,
        years_of_service,
        category_id,
        status:            "pending",
        session_id,
        submitted_at:      new Date().toISOString(),
        profile_photo_url, // included here — no separate UPDATE needed
      }])
      .select("id, name, rank, regiment")
      .single();

    if (insertError || !card) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: insertError?.message ?? "Insert failed." },
        { status: 500 }
      );
    }

    // ── Send admin notification email ──────────────────────────────────────
    const adminEmails = getAdminEmails();
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const approveUrl  = `${appUrl}/admin/submissions?action=approve&id=${card.id}`;
    const rejectUrl   = `${appUrl}/admin/submissions?action=reject&id=${card.id}`;

    if (adminEmails.length > 0) {
      try {
        await resend.emails.send({
          from:    "Grand Army Roster <onboarding@resend.dev>",
          to:      adminEmails,
          subject: `New Officer Submission: ${card.name}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf6e3; border: 2px solid #c9a96e;">
              <h1 style="color: #2c1810; font-size: 22px; border-bottom: 1px solid #c9a96e; padding-bottom: 12px;">New Officer Submission</h1>
              <p style="color: #3d2b1f; font-size: 15px; margin-top: 16px;">A new officer record is awaiting your approval.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr style="border-bottom: 1px solid #e5d5a8;"><td style="padding: 8px 4px; color: #8b6d38; font-size: 12px; width: 140px;">NAME</td><td style="padding: 8px 4px; color: #2c1810; font-weight: bold;">${card.name}</td></tr>
                <tr style="border-bottom: 1px solid #e5d5a8;"><td style="padding: 8px 4px; color: #8b6d38; font-size: 12px;">RANK</td><td style="padding: 8px 4px; color: #2c1810;">${card.rank}</td></tr>
                <tr><td style="padding: 8px 4px; color: #8b6d38; font-size: 12px;">REGIMENT</td><td style="padding: 8px 4px; color: #2c1810;">${card.regiment}</td></tr>
              </table>
              ${profile_photo_url ? `<img src="${profile_photo_url}" alt="Photo" style="width:80px;height:80px;border-radius:50%;border:2px solid #c9a96e;margin-bottom:24px;" />` : ""}
              <div style="margin-top: 24px;">
                <a href="${approveUrl}" style="display:inline-block;background:#15803d;color:white;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:bold;border-radius:2px;margin-right:12px;">✓ Approve</a>
                <a href="${rejectUrl}" style="display:inline-block;background:#b91c1c;color:white;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:bold;border-radius:2px;">✕ Reject</a>
              </div>
              <p style="margin-top:24px;color:#8b6d38;font-size:12px;">Or visit the <a href="${appUrl}/admin/submissions" style="color:#8b6d38;">admin dashboard</a>.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Email error (non-fatal):", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Submission received. Awaiting admin approval.",
      id: card.id,
    });

  } catch (err: any) {
    console.error("Submit route error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
