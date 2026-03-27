export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

const createSchema = z.object({
  adminPassword: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  isPinned: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

const updateSchema = z.object({
  adminPassword: z.string(),
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

const deleteSchema = z.object({
  adminPassword: z.string(),
  id: z.string(),
});

export async function GET() {
  try {
    const notices = await prisma.notice.findMany({
      where: { isPublished: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(notices);
  } catch {
    return NextResponse.json({ error: " ภท" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    if (data.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: " ภฝ" }, { status: 403 });
    }
    const notice = await prisma.notice.create({
      data: {
        title: data.title,
        content: data.content,
        isPinned: data.isPinned,
        isPublished: data.isPublished,
      },
    });
    return NextResponse.json(notice, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "ิทยฐ ภท", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: " ภท" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    if (data.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: " ภฝ" }, { status: 403 });
    }
    const notice = await prisma.notice.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
    return NextResponse.json(notice);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "ิทยฐ ภท", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: " ภท" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const data = deleteSchema.parse(body);
    if (data.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: " ภฝ" }, { status: 403 });
    }
    await prisma.notice.delete({ where: { id: data.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "ิทยฐ ภท", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: " ภท" }, { status: 500 });
  }
}
