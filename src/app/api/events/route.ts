import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

const createSchema = z.object({
  adminPassword: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isPublished: z.boolean().default(true),
});

const deleteSchema = z.object({
  adminPassword: z.string(),
  id: z.string(),
});

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(events);
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
    const event = await prisma.event.create({
      data: {
        title: data.title,
        content: data.content,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isPublished: data.isPublished,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값 오류", details: err.issues }, { status: 400 });
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
    await prisma.event.delete({ where: { id: data.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값 오류", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
