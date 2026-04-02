import { Resend } from "resend";
import { escapeHtml } from "@/lib/validation";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? "RentNeighbor <onboarding@resend.dev>";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rentneighbors.com";

function baseTemplate(title: string, body: string, linkUrl?: string) {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const ctaButton = linkUrl
    ? `<a href="${escapeHtml(`${BASE_URL}${linkUrl}`)}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View on RentNeighbor</a>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#16a34a;padding:20px 32px;">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">RentNeighbor</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#111827;">${safeTitle}</h2>
            <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">${safeBody}</p>
            ${ctaButton}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              You're receiving this because you enabled email notifications on RentNeighbor.
              You can turn these off in your <a href="${BASE_URL}/settings" style="color:#16a34a;">notification settings</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendEmail({
  to,
  subject,
  body,
  linkUrl,
}: {
  to: string;
  subject: string;
  body: string;
  linkUrl?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL stub] To: ${to} | Subject: ${subject} | Body: ${body}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${subject} — RentNeighbor`,
    html: baseTemplate(subject, body, linkUrl),
  });
}
