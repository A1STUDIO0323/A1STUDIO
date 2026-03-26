export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getMemberProfileByEmail,
  upsertMemberProfileByEmail,
} from "@/lib/member-profile-db";
import { createClient } from "@/lib/supabase/server";

const schoolStatusSchema = z.enum(["ENROLLED", "GRADUATED"]);

const updateSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  phone: z.string().min(8).optional(),
  middleSchool: z.string().trim().max(100).optional(),
  middleSchoolStatus: schoolStatusSchema.optional(),
  highSchool: z.string().trim().max(100).optional(),
  highSchoolStatus: schoolStatusSchema.optional(),
  university: z.string().trim().max(100).optional(),
  universityStatus: schoolStatusSchema.optional(),
  graduateSchool: z.string().trim().max(100).optional(),
  graduateSchoolStatus: schoolStatusSchema.optional(),
});

function isDbConnectionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: string }).code;
  if (maybeCode === "P1001" || maybeCode === "P1011" || maybeCode === "P2010") return true;
  const maybeMessage = (error as { message?: string }).message;
  if (typeof maybeMessage !== "string") return false;
  return (
    maybeMessage.includes("Can't reach database server") ||
    maybeMessage.includes("self-signed certificate in certificate chain") ||
    maybeMessage.includes("Error opening a TLS connection")
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email?.trim().toLowerCase() ?? "";
    if (!email) {
      return NextResponse.json(
        { success: false, error: "ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??" },
        { status: 401 }
      );
    }

    const profile = await getMemberProfileByEmail(email);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    if (isDbConnectionError(error)) {
      return NextResponse.json({
        success: false,
        error: "?„ë¡œ??ì¡°íšŒë¥??„í•´ ?°ì´?°ë² ?´ìŠ¤ ?°ê²°???„ìš”?©ë‹ˆ??",
      });
    }
    console.error("[GET /api/members/profile]", error);
    return NextResponse.json(
      { success: false, error: "?„ë¡œ??ì¡°íšŒ???¤íŒ¨?ˆìŠµ?ˆë‹¤." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email?.trim().toLowerCase() ?? "";
    if (!email) {
      return NextResponse.json(
        { success: false, error: "ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = updateSchema.parse(body);
    await upsertMemberProfileByEmail({
      email,
      birthDate: data.birthDate,
      phone: data.phone,
      middleSchool: data.middleSchool,
      middleSchoolStatus: data.middleSchoolStatus,
      highSchool: data.highSchool,
      highSchoolStatus: data.highSchoolStatus,
      university: data.university,
      universityStatus: data.universityStatus,
      graduateSchool: data.graduateSchool,
      graduateSchoolStatus: data.graduateSchoolStatus,
    });

    const profile = await getMemberProfileByEmail(email);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "?…ë ¥ê°’ì„ ?•ì¸?´ì£¼?¸ìš”." },
        { status: 400 }
      );
    }
    if (isDbConnectionError(error)) {
      return NextResponse.json({
        success: false,
        error: "?„ë¡œ???€?¥ì„ ?„í•´ ?°ì´?°ë² ?´ìŠ¤ ?°ê²°???„ìš”?©ë‹ˆ??",
      });
    }
    console.error("[POST /api/members/profile]", error);
    return NextResponse.json(
      { success: false, error: "?„ë¡œ???€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤." },
      { status: 500 }
    );
  }
}
