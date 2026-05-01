import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const OFFICIAL_THRESHOLD = 10;

// GET /api/board/categories — 정식 카테고리(게시글 수 threshold 이상인 categoryText)
export async function GET() {
  try {
    const categoryCounts = await prisma.boardPost.groupBy({
      by: ["categoryText"],
      where: {
        categoryText: { not: null },
        isHidden: false,
      },
      _count: { _all: true },
    });

    const sorted = [...categoryCounts].sort(
      (a, b) => b._count._all - a._count._all
    );

    const officialCategories = sorted
      .filter(
        (row) =>
          row.categoryText != null &&
          row.categoryText.trim() !== "" &&
          row._count._all >= OFFICIAL_THRESHOLD
      )
      .map((row) => ({
        name: row.categoryText!.trim(),
        count: row._count._all,
        isOfficial: true,
      }));

    return NextResponse.json({
      success: true,
      categories: officialCategories,
      threshold: OFFICIAL_THRESHOLD,
    });
  } catch (error) {
    console.error("[GET /api/board/categories]", error);
    return NextResponse.json(
      { success: false, error: "카테고리 목록 조회 실패" },
      { status: 500 }
    );
  }
}
