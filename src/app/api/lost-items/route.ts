export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

const createSchema = z.object({
  adminPassword: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  images: z.array(z.string().url()).default([]),
  isPublished: z.boolean().default(true),
});

const updateSchema = z.object({
  adminPassword: z.string(),
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  images: z.array(z.string().url()).optional(),
  isPublished: z.boolean().optional(),
});

const deleteSchema = z.object({
  adminPassword: z.string(),
  id: z.string(),
});

export async function GET() {
  try {
    const items = await prisma.lostItem.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    if (data.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }
    const item = await prisma.lostItem.create({
      data: {
        title: data.title,
        content: data.content,
        images: data.images,
        isPublished: data.isPublished,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력값 오류", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    if (data.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }
    const item = await prisma.lostItem.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력값 오류", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const data = deleteSchema.parse(body);
    if (data.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }
    await prisma.lostItem.delete({ where: { id: data.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력값 오류", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
