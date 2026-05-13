// app/api/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Server-side only — uses secret key, never exposed to browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

// Parse admin emails from env — comma separated
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

    // Validate required fields
    if (!name)        return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!regiment)    return NextResponse.json({ error: "Regiment is required." }, { status: 400 });
    if (!category_id) return NextResponse.json({ error: "Country is required." }, { status: 400 });

    // Generate session_id UUID for this submission
    const session_id = crypto.randomUUID();

    // Insert card as pending
    const { data: card, error: insertError } = await supabaseAdmin
      .from("cards")
      .insert([{
        name,
        rank,
        regiment,
        years_of_service,
        category_id,
        status:       "pending",
        session_id,
        submitted_at: new Date().toISOString(),
      }])
      .select("id, name, rank, regiment, categories ( name )")
      .single();

    if (insertError || !card) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: insertError?.message ?? "Insert failed." }, { status: 500 });
    }

    // ── Handle optional photo upload ──────────────────────────────────────
    let profile_photo_url: string | null = null;

    if (photoFile && photoFile.size > 0) {
      // Validate file type and size
      const validTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!validTypes.includes(photoFile.type)) {
        return NextResponse.json({ error: "Photo must be PNG or JPG." }, { status: 400 });
      }
      if (photoFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "Photo must be under 2MB." }, { status: 400 });
      }

      const timestamp = Date.now();
      const random    = Math.random().toString(36).substring(2, 8);
      const ext       = photoFile.type === "image/png" ? "png" : "jpg";
      const filePath  = `${card.id}/${timestamp}_${random}.${ext}`;

      const arrayBuffer = await photoFile.arrayBuffer();
      const buffer      = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from("profile-photos")
        .upload(filePath, buffer, {
          contentType: photoFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Photo upload error:", uploadError);
        // Don't fail the whole submission — just skip the photo
      } else {
        const { data: urlData } = supabaseAdmin.storage
          .from("profile-photos")
          .getPublicUrl(filePath);
        profile_photo_url = urlData.publicUrl;

        // Update card with photo URL
        await supabaseAdmin
          .from("cards")
          .update({ profile_photo_url })
          .eq("id", card.id);
      }
    }

    // ── Send admin notification email via Resend ──────────────────────────
    const adminEmails = getAdminEmails();
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const approveUrl  = `${appUrl}/admin/submissions?action=approve&id=${card.id}`;
    const rejectUrl   = `${appUrl}/admin/submissions?action=reject&id=${card.id}`;

    const categoryName = Array.isArray(card.categories)
      ? card.categories[0]?.name
      : (card.categories as any)?.name ?? "Unknown";

    if (adminEmails.length > 0) {
      await resend.emails.send({
        from:    "Grand Army Roster <onboarding@resend.dev>",
        to:      adminEmails,
        subject: `New Officer Submission: ${card.name}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf6e3; border: 2px solid #c9a96e;">
            <h1 style="font-family: Georgia, serif; color: #2c1810; font-size: 22px; border-bottom: 1px solid #c9a96e; padding-bottom: 12px;">
              New Officer Submission
            </h1>
            <p style="color: #3d2b1f; font-size: 15px; margin-top: 16px;">
              A new officer record has been submitted and is awaiting your approval.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
              <tr style="border-bottom: 1px solid #e5d5a8;">
                <td style="padding: 8px 4px; color: #8b6d38; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; width: 140px;">Name</td>
                <td style="padding: 8px 4px; color: #2c1810; font-weight: bold;">${card.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5d5a8;">
                <td style="padding: 8px 4px; color: #8b6d38; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Rank</td>
                <td style="padding: 8px 4px; color: #2c1810;">${card.rank}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5d5a8;">
                <td style="padding: 8px 4px; color: #8b6d38; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Regiment</td>
                <td style="padding: 8px 4px; color: #2c1810;">${card.regiment}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5d5a8;">
                <td style="padding: 8px 4px; color: #8b6d38; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Country</td>
                <td style="padding: 8px 4px; color: #2c1810;">${categoryName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 4px; color: #8b6d38; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Session ID</td>
                <td style="padding: 8px 4px; color: #2c1810; font-size: 12px; font-family: monospace;">${session_id}</td>
              </tr>
            </table>
            ${profile_photo_url ? `<img src="${profile_photo_url}" alt="Profile photo" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid #c9a96e; margin-bottom: 24px;" />` : ""}
            <div style="display: flex; gap: 16px; margin-top: 24px;">
              <a href="${approveUrl}"
                style="display: inline-block; background: #15803d; color: white; padding: 12px 28px; text-decoration: none; font-family: Georgia, serif; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; border-radius: 2px;">
                ✓ Approve Officer
              </a>
              <a href="${rejectUrl}"
                style="display: inline-block; background: #b91c1c; color: white; padding: 12px 28px; text-decoration: none; font-family: Georgia, serif; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; border-radius: 2px;">
                ✕ Reject Submission
              </a>
            </div>
            <p style="margin-top: 24px; color: #8b6d38; font-size: 12px;">
              Or visit the <a href="${appUrl}/admin/submissions" style="color: #8b6d38;">admin dashboard</a> to review all pending submissions.
            </p>
          </div>
        `,
      });
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
