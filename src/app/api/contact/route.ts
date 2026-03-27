export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

export async function POST(req: NextRequest) {
  const { name, phone, subject, message } = await req.json();

  if (!name || !phone || !subject || !message) {
    return NextResponse.json({ error: "Ê¼ ×¸À»  Ô·Ö¼." }, { status: 400 });
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !toEmail || !fromEmail) {
    return NextResponse.json({ error: " Á¤ Ï· Ê¾Ò½À´Ï´." }, { status: 500 });
  }

  sgMail.setApiKey(apiKey);

  try {
    await sgMail.send({
      to: toEmail,
      from: fromEmail,
      subject: `[A1 STUDIO ] ${subject} - ${name}`,
      text: `Ì¸: ${name}\nÃ³: ${phone}\n À¯: ${subject}\n\n${message}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b">
          <h2 style="background:#7c3aed;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;margin:0">
            A1 STUDIO 
          </h2>
          <div style="border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;padding:24px">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:8px 0;color:#71717a;width:100px;font-size:14px">Ì¸</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px">${name}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#71717a;font-size:14px">Ã³</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px">${phone}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#71717a;font-size:14px"> À¯</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px">${subject}</td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0"/>
            <p style="color:#71717a;font-size:13px;margin:0 0 8px"> </p>
            <p style="white-space:pre-line;font-size:14px;line-height:1.7;margin:0">${message}</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SendGrid error:", err);
    return NextResponse.json({ error: " Û¿ ß½À´Ï´.   Ù½ ÃµÖ¼." }, { status: 500 });
  }
}
