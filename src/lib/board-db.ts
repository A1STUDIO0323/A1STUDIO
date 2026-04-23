import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type BoardPostWithAuthor = {
  id: string;
  title: string;
  content: string;
  viewCount: number;
  createdAt: Date;
  author: { name: string | null; email: string | null };
};

type RowWithAuthorCols = {
  id: string;
  title: string;
  content: string;
  viewCount: number;
  createdAt: Date;
  authorName: string | null;
  authorEmail: string | null;
};

function mapRow(r: RowWithAuthorCols): BoardPostWithAuthor {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    viewCount: r.viewCount,
    createdAt: r.createdAt,
    author: { name: r.authorName, email: r.authorEmail },
  };
}

export async function listBoardPosts(): Promise<BoardPostWithAuthor[]> {
  const rows = await prisma.$queryRaw<RowWithAuthorCols[]>(Prisma.sql`
    SELECT
      p.id,
      p.title,
      p.content,
      p.view_count AS "viewCount",
      p.created_at AS "createdAt",
      pr.name AS "authorName",
      pr.email AS "authorEmail"
    FROM public.board_posts p
    LEFT JOIN public.profiles pr ON pr.id = p.author_id
    ORDER BY p.created_at DESC
  `);
  return rows.map(mapRow);
}

export async function getBoardPostMeta(
  id: string
): Promise<{ title: string; content: string } | null> {
  const rows = await prisma.$queryRaw<{ title: string; content: string }[]>(
    Prisma.sql`
      SELECT title, content
      FROM public.board_posts
      WHERE id = ${id}
      LIMIT 1
    `
  );
  return rows[0] ?? null;
}

export async function getBoardPostDetail(
  id: string
): Promise<BoardPostWithAuthor | null> {
  const rows = await prisma.$queryRaw<RowWithAuthorCols[]>(Prisma.sql`
    SELECT
      p.id,
      p.title,
      p.content,
      p.view_count AS "viewCount",
      p.created_at AS "createdAt",
      pr.name AS "authorName",
      pr.email AS "authorEmail"
    FROM public.board_posts p
    LEFT JOIN public.profiles pr ON pr.id = p.author_id
    WHERE p.id = ${id}
    LIMIT 1
  `);
  const r = rows[0];
  return r ? mapRow(r) : null;
}

/** 조회수 +1 후 글 상세(없으면 null) */
export async function getBoardPostDetailWithViewIncrement(
  id: string
): Promise<BoardPostWithAuthor | null> {
  const updated = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE public.board_posts
    SET view_count = view_count + 1
    WHERE id = ${id}
    RETURNING id
  `);
  if (!updated[0]) return null;
  return getBoardPostDetail(id);
}

export async function createBoardPost(params: {
  title: string;
  content: string;
  authorId: string;
}): Promise<BoardPostWithAuthor> {
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO public.board_posts (id, title, content, author_id, view_count, created_at, updated_at)
    VALUES (
      ${id},
      ${params.title},
      ${params.content},
      ${params.authorId}::uuid,
      0,
      NOW(),
      NOW()
    )
  `);
  const post = await getBoardPostDetail(id);
  if (!post) throw new Error("board post insert succeeded but row not found");
  return post;
}
