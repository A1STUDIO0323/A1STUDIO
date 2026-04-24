export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma as db } from "@/lib/db";
import { validateUserExists, USER_NOT_FOUND_ERROR } from "@/lib/user-validation";
import { z } from "zod";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

const adminCreateSchema = z.object({
  adminPassword: z.string(),
  title: z.string().min(1),
  teacherName: z.string().min(1),
  teacherProfile: z.string().min(1),
  classType: z.enum(["VOCAL", "DANCE", "ACT", "MUSICAL"]),
  description: z.string().min(1),
  desiredDate: z.string(),
  durationMinutes: z.number().int().min(30).default(120),
  minHeadcount: z.number().int().min(1).default(8),
  maxHeadcount: z.number().int().min(1).default(15),
  pricePerPerson: z.number().int().min(0),
});

const adminDeleteSchema = z.object({
  adminPassword: z.string(),
  id: z.string(),
});

const applySchema = z.object({
  classId: z.string(),
  guestName: z.string().min(1),
  guestPhone: z.string().min(10),
  guestEmail: z.string().email().optional().or(z.literal("")),
  headcount: z.number().int().min(1).max(4).default(1),
  message: z.string().max(300).optional(),
});

export async function GET() {
  try {
    const classes = await db.oneDayClass.findMany({
      where: { isPublished: true },
      include: {
        _count: {
          select: {
            applications: { where: { isCancelled: false } },
          },
        },
      },
      orderBy: { desiredDate: "asc" },
    });

    const result = classes.map((c: typeof classes[number]) => ({
      ...c,
      currentHeadcount: c._count.applications,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const data = adminDeleteSchema.parse(body);
    if (data.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }
    await db.oneDayClass.delete({ where: { id: data.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값 오류", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.adminPassword !== undefined) {
    try {
      const data = adminCreateSchema.parse(body);
      if (data.adminPassword !== ADMIN_PASSWORD) {
        return NextResponse.json({ error: "권한 없음" }, { status: 403 });
      }
      const created = await db.oneDayClass.create({
        data: {
          title: data.title,
          teacherName: data.teacherName,
          teacherProfile: data.teacherProfile,
          classType: data.classType,
          description: data.description,
          desiredDate: new Date(data.desiredDate),
          durationMinutes: data.durationMinutes,
          minHeadcount: data.minHeadcount,
          maxHeadcount: data.maxHeadcount,
          pricePerPerson: data.pricePerPerson,
        },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: "입력값 오류", details: err.issues }, { status: 400 });
      }
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
  }

  try {
    const data = applySchema.parse(body);

    const oneDayClass = await db.oneDayClass.findUnique({
      where: { id: data.classId },
      include: {
        _count: {
          select: { applications: { where: { isCancelled: false } } },
        },
      },
    });

    if (!oneDayClass) {
      return NextResponse.json({ error: "클래스를 찾을 수 없습니다." }, { status: 404 });
    }

    if (oneDayClass.status !== "OPEN") {
      return NextResponse.json({ error: "신청 불가능한 클래스입니다." }, { status: 400 });
    }

    if (oneDayClass._count.applications >= oneDayClass.maxHeadcount) {
      return NextResponse.json({ error: "정원이 초과되었습니다." }, { status: 400 });
    }

    const existing = await db.oneDayClassApplication.findFirst({
      where: {
        classId: data.classId,
        guestPhone: data.guestPhone,
        isCancelled: false,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "이미 신청하셨습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // ✅ 사용자 검증 (2층 안전망)
    if (!(await validateUserExists(userId))) {
      return NextResponse.json(USER_NOT_FOUND_ERROR, { status: 400 });
    }

    const application = await db.oneDayClassApplication.create({
      data: {
        classId: data.classId,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail || null,
        headcount: data.headcount,
        message: data.message || null,
      },
    });

    const updatedCount = await db.oneDayClassApplication.count({
      where: { classId: data.classId, isCancelled: false },
    });

    if (updatedCount >= oneDayClass.minHeadcount) {
      await db.oneDayClass.update({
        where: { id: data.classId },
        data: { status: "CONFIRMED" },
      });
    }

    return NextResponse.json({ success: true, applicationId: application.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "입력 정보를 확인해주세요.", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
