export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

const LOG_PREFIX = "[api/notices]";

// 관리자 인증을 Supabase 세션 + users.role='ADMIN' 으로 통일 (admin-auth.ts).
// 기존 adminPassword 헤더 방식은 deprecated 되어 항상 인증 실패하던 상태.

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  isPinned: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string(),
});

export async function GET() {
  try {
    const notices = await prisma.notice.findMany({
      where: { isPublished: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(notices);
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

    const notice = await prisma.notice.create({
      data: {
        title: data.title,
        content: data.content,
        isPinned: data.isPinned,
        isPublished: data.isPublished,
      },
    });

    console.log(`${LOG_PREFIX} POST success id=${notice.id}`);
    return NextResponse.json(notice, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn(`${LOG_PREFIX} POST 입력값 오류`, err.issues);
      return NextResponse.json({ error: "입력값 오류", details: err.issues }, { status: 400 });
    }
    console.error(`${LOG_PREFIX} POST 실패`, err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    console.log(`${LOG_PREFIX} PATCH start userId=${auth.userId} id=${data.id}`);

    const notice = await prisma.notice.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });

    console.log(`${LOG_PREFIX} PATCH success id=${notice.id}`);
    return NextResponse.json(notice);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn(`${LOG_PREFIX} PATCH 입력값 오류`, err.issues);
      return NextResponse.json({ error: "입력값 오류", details: err.issues }, { status: 400 });
    }
    console.error(`${LOG_PREFIX} PATCH 실패`, err);
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

    await prisma.notice.delete({ where: { id: data.id } });

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
