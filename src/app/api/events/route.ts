export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

const LOG_PREFIX = "[api/events]";

// 관리자 인증을 Supabase 세션 + users.role='ADMIN' 으로 통일 (admin-auth.ts).
// 기존 adminPassword 헤더 방식은 deprecated 되어 항상 인증 실패하던 상태.

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isPublished: z.boolean().default(true),
});

const deleteSchema = z.object({
  id: z.string(),
});

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(events);
  } catch (err) {
    console.error(`${LOG_PREFIX} GET 실패`, err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    console.log(`${LOG_PREFIX} POST start userId=${auth.userId} title=${data.title}`);

    const event = await prisma.event.create({
      data: {
        title: data.title,
        content: data.content,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isPublished: data.isPublished,
      },
    });

    console.log(`${LOG_PREFIX} POST success id=${event.id}`);
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn(`${LOG_PREFIX} POST 입력값 오류`, err.issues);
      return NextResponse.json({ error: "입력값 오류", details: err.issues }, { status: 400 });
    }
    console.error(`${LOG_PREFIX} POST 실패`, err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const data = deleteSchema.parse(body);
    console.log(`${LOG_PREFIX} DELETE start userId=${auth.userId} id=${data.id}`);

    await prisma.event.delete({ where: { id: data.id } });

    console.log(`${LOG_PREFIX} DELETE success id=${data.id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn(`${LOG_PREFIX} DELETE 입력값 오류`, err.issues);
      return NextResponse.json({ error: "입력값 오류", details: err.issues }, { status: 400 });
    }
    console.error(`${LOG_PREFIX} DELETE 실패`, err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
