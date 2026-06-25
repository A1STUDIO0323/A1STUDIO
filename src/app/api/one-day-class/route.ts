export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma as db } from "@/lib/db";
import { validateUserExists, USER_NOT_FOUND_ERROR } from "@/lib/user-validation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

const LOG_PREFIX = "[api/one-day-class]";

// 관리자 인증을 Supabase 세션 + users.role='ADMIN' 으로 통일 (admin-auth.ts).
// POST 는 두 모드 동시 처리: classId 가 있으면 일반 신청(비회원도 가능),
// 없으면 관리자 클래스 생성으로 분기. 기존 adminPassword 헤더는 제거.

const adminCreateSchema = z.object({
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
  } catch (err) {
    console.error(`${LOG_PREFIX} GET 실패`, err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const data = adminDeleteSchema.parse(body);
    console.log(`${LOG_PREFIX} DELETE start userId=${auth.userId} id=${data.id}`);

    await db.oneDayClass.delete({ where: { id: data.id } });

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

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 분기: classId 존재 → 일반 사용자 신청, 없음 → 관리자 클래스 생성
  if (typeof body?.classId !== "string") {
    // 관리자 클래스 생성 분기
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    try {
      const data = adminCreateSchema.parse(body);
      console.log(`${LOG_PREFIX} POST(admin create) start userId=${auth.userId} title=${data.title}`);

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

      console.log(`${LOG_PREFIX} POST(admin create) success id=${created.id}`);
      return NextResponse.json(created, { status: 201 });
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.warn(`${LOG_PREFIX} POST(admin create) 입력값 오류`, err.issues);
        return NextResponse.json({ error: "입력값 오류", details: err.issues }, { status: 400 });
      }
      console.error(`${LOG_PREFIX} POST(admin create) 실패`, err);
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
  }

  // 일반 사용자 신청 분기 — 인증 불필요(비회원 신청 허용), 단 로그인 시 user_id 검증
  try {
    const data = applySchema.parse(body);
    console.log(`${LOG_PREFIX} POST(apply) start classId=${data.classId} phone=${data.guestPhone}`);

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

    // ✅ 사용자 검증 (2층 안전망) — 로그인 사용자라면 public.users 존재 확인
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

    console.log(`${LOG_PREFIX} POST(apply) success applicationId=${application.id}`);
    return NextResponse.json({ success: true, applicationId: application.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn(`${LOG_PREFIX} POST(apply) 입력값 오류`, err.issues);
      return NextResponse.json({ error: "입력 정보를 확인해주세요.", details: err.issues }, { status: 400 });
    }
    console.error(`${LOG_PREFIX} POST(apply) 실패`, err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
