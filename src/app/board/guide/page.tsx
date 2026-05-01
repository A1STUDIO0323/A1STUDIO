import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BoardGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 pt-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/board"
          className="mb-8 inline-flex items-center gap-2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          게시판으로 돌아가기
        </Link>

        <div className="rounded-2xl bg-[var(--color-surface)] p-8">
          <h1 className="mb-8 text-3xl font-bold text-[var(--color-text)] md:text-4xl">
            자유게시판 이용 안내
          </h1>

          <div className="max-w-none space-y-10 text-base leading-relaxed">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-[var(--color-text)]">
                카테고리 시스템
              </h2>
              <p className="mb-4 text-[var(--color-text-muted)]">
                A1 STUDIO 자유게시판은 회원 여러분이 직접 만들어가는 공간입니다.
              </p>

              <div className="space-y-4">
                <div className="rounded-xl bg-[var(--color-bg)] p-6">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
                    1. 글 작성 시 카테고리 입력 (선택)
                  </h3>
                  <ul className="ml-4 list-inside list-disc space-y-2 text-[var(--color-text-muted)]">
                    <li>
                      원하는 카테고리를{" "}
                      <strong className="text-[var(--color-text)]">
                        자유롭게 텍스트로 입력
                      </strong>
                      하세요
                    </li>
                    <li>
                      예: 보컬 팁, 댄스 후기, 연습실 꿀팁, 공연 정보 등
                    </li>
                    <li>카테고리는 선택사항입니다</li>
                    <li>최대 20자까지 입력 가능</li>
                  </ul>
                </div>

                <div className="rounded-xl bg-[var(--color-bg)] p-6">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
                    2. 정식 카테고리 승격
                  </h3>
                  <ul className="ml-4 list-inside list-disc space-y-2 text-[var(--color-text-muted)]">
                    <li>
                      같은 문자열로 달린 게시글이{" "}
                      <strong className="text-[var(--color-accent)]">
                        10개 이상
                      </strong>{" "}
                      모이면
                    </li>
                    <li>
                      <strong className="text-[var(--color-accent)]">
                        정식 카테고리
                      </strong>
                      로 목록 상단에서 필터링할 수 있습니다
                    </li>
                    <li>카테고리별 게시글 수가 표시됩니다</li>
                  </ul>
                </div>

                <div className="rounded-xl bg-[var(--color-bg)] p-6">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
                    3. 카테고리 예시
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-emerald-600">좋음</span>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">
                          좋은 예
                        </p>
                        <p className="text-[var(--color-text-muted)]">
                          보컬 연습 팁, 댄스 영상 공유, 뮤지컬 추천, 연기 고민
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-red-600">피함</span>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">
                          나쁜 예
                        </p>
                        <p className="text-[var(--color-text-muted)]">
                          ㅋㅋㅋ, 123, 테스트처럼 의미 없는 짧은 문자만 사용
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-[var(--color-text)]">
                주의사항
              </h2>
              <div className="rounded-r-xl border-l-4 border-yellow-500 bg-yellow-50 p-6">
                <ul className="ml-4 list-inside list-disc space-y-2 text-[var(--color-text-muted)]">
                  <li>
                    부적절한 이름·비방·광고 목적 카테고리는 운영 정책에 따라 조치될 수
                    있습니다
                  </li>
                  <li>비슷한 주제는 같은 표기로 맞춰 주시면 승격이 빨라집니다</li>
                  <li className="pl-4">
                    예: 보컬팁 / 보컬 팁처럼 띄어쓰기만 다른 경우 각각 다른
                    카테고리로 집계될 수 있습니다
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-[var(--color-text)]">
                활용 팁
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-[var(--color-bg)] p-6">
                  <p className="mb-2 font-bold text-[var(--color-accent)]">
                    Tip 1
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    정식 카테고리 칩을 보고 자주 쓰는 표기를 함께 맞춰 보세요
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--color-bg)] p-6">
                  <p className="mb-2 font-bold text-[var(--color-accent)]">
                    Tip 2
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    새 주제는 글쓰기에서 카테고리 칸에 바로 입력해 시작할 수
                    있습니다
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--color-bg)] p-6">
                  <p className="mb-2 font-bold text-[var(--color-accent)]">
                    Tip 3
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    정식 카테고리가 되면 상단에서 빠르게 모아볼 수 있어요
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-[var(--color-text)]">
                공지사항은 어디에?
              </h2>
              <p className="mb-4 text-[var(--color-text-muted)]">
                스튜디오 공식 공지는 별도 페이지에서 확인하세요.
              </p>
              <Link
                href="/notices"
                className="inline-block rounded-xl bg-[var(--color-accent)] px-6 py-3 text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                공지사항 보러가기
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
