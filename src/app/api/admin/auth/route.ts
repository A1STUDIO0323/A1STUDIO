import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const plain = process.env.ADMIN_PASSWORD;

  if (!hash && !plain) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (hash) {
    const ok = await bcrypt.compare(String(password ?? ""), hash);
    if (ok) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  console.warn("[admin/auth] using plaintext fallback — set ADMIN_PASSWORD_HASH");
  if (password === plain) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
