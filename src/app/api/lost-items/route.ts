export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

const LOG_PREFIX = "[api/lost-items]";

// 관리자 인증을 Supabase 세션 + users.role='ADMIN' 으로 통일 (admin-auth.ts).
// 기존 adminPassword 헤더 방식은 deprecated 되었고 클라이언트에서도 빈 문자열만 보내고 있어
// 인증이 항상 실패하던 상태. 본 갱신으로 ADMIN 세션이면 자동 통과.

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  images: z.array(z.string().url()).default([]),
  isPublished: z.boolean().default(true),
});

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  images: z.array(z.string().url()).optional(),
  isPublished: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string(),
});

export async function GET() {
  try {
    const items = await prisma.lostItem.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
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

    const item = await prisma.lostItem.create({
      data: {
        title: data.title,
        content: data.content,
        images: data.images,
        isPublished: data.isPublished,
      },
    });

    console.log(`${LOG_PREFIX} POST success id=${item.id}`);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn(`${LOG_PREFIX} POST 입력값 오류`, err.issues);
      return NextResponse.json(
        { error: "입력값 오류", details: err.issues },
        { status: 400 }
      );
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

    const item = await prisma.lostItem.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });

    console.log(`${LOG_PREFIX} PATCH success id=${item.id}`);
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn(`${LOG_PREFIX} PATCH 입력값 오류`, err.issues);
      return NextResponse.json(
        { error: "입력값 오류", details: err.issues },
        { status: 400 }
      );
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

    await prisma.lostItem.delete({ where: { id: data.id } });

    console.log(`${LOG_PREFIX} DELETE success id=${data.id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn(`${LOG_PREFIX} DELETE 입력값 오류`, err.issues);
      return NextResponse.json(
        { error: "입력값 오류", details: err.issues },
        { status: 400 }
      );
    }
    console.error(`${LOG_PREFIX} DELETE 실패`, err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
