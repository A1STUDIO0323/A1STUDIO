import Link from "next/link";

export const metadata = {
  title: "서비스 이용약관 | A1 STUDIO",
  description: "A1 STUDIO 서비스 이용약관. 시행일: 2026년 5월 1일",
};

function ArticleSection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 pb-8 mb-8 border-b border-[#D8CCBC] last:border-b-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#B98768] text-white font-bold text-sm">
          {number}
        </div>
        <h2 className="text-2xl font-bold text-[#3B342F]">제{number}조 {title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      <div className="bg-[#EFE7DA] border-b border-[#D8CCBC]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768] mb-2">
            LEGAL DOCUMENT
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold text-[#3B342F] mb-4"
            style={{ fontFamily: "var(--font-noto-serif)" }}
          >
            서비스 이용약관
          </h1>
          <p className="text-[#6f655d]">시행일: 2026년 5월 1일</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl">
          <p className="text-xl font-bold text-[#3B342F] mb-8" style={{ fontFamily: "var(--font-noto-serif)" }}>
            A1 STUDIO 서비스 이용약관
          </p>
          <p className="text-[#3B342F] mb-12">
            <strong>시행일: 2026년 5월 1일</strong>
          </p>

          <div className="space-y-12">
            <ArticleSection id="article-1" number={1} title="목적">
              <p className="text-[#3B342F]">
                본 약관은 A1 STUDIO(이하 &quot;서비스&quot;)가 제공하는 보컬·댄스·연기·뮤지컬 연습실 예약 및 파티룸 대관 서비스의 이용과 관련하여 서비스와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </ArticleSection>

            <ArticleSection id="article-2" number={2} title="정의">
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>
                  &quot;서비스&quot;란 A1 STUDIO가 운영하는 연습실 예약 플랫폼 및 관련 서비스를 의미합니다.
                </li>
                <li>
                  &quot;회원&quot;이란 본 약관에 동의하고 서비스에 가입하여 서비스를 이용하는 자를 의미합니다.
                </li>
                <li>
                  &quot;포인트&quot;란 서비스 내에서 연습실 예약 시 사용할 수 있는 선불 결제 수단을 의미합니다.
                </li>
                <li>
                  &quot;연습실&quot;이란 A1 STUDIO가 제공하는 보컬·댄스·연기·뮤지컬 연습 공간을 의미합니다.
                </li>
                <li>
                  &quot;파티룸&quot;이란 A1 STUDIO가 제공하는 파티 및 모임 대관 공간을 의미합니다.
                </li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-3" number={3} title="약관의 게시 및 개정">
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>본 약관은 서비스 홈페이지(https://a1-studio.vercel.app)에 게시함으로써 효력이 발생합니다.</li>
                <li>서비스는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있습니다.</li>
                <li>약관이 개정되는 경우 서비스는 개정 내용과 적용 일자를 명시하여 최소 7일 전에 공지합니다.</li>
                <li>회원이 개정 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-4" number={4} title="회원가입">
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>회원가입은 Google 또는 Kakao 소셜 로그인을 통해 진행됩니다.</li>
                <li>회원가입 시 이름, 출생연도, 전화번호 정보를 제공해야 합니다.</li>
                <li>만 14세 미만 아동은 법정대리인의 동의 없이 회원가입을 할 수 없습니다.</li>
                <li>파티룸 예약 서비스는 만 19세 이상 성인만 이용할 수 있습니다.</li>
                <li>회원은 정확한 정보를 제공해야 하며, 허위 정보 제공 시 서비스 이용이 제한될 수 있습니다.</li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-5" number={5} title="서비스 이용">
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>연습실 예약은 포인트를 사용하여 이루어지며, 예약 확정 즉시 포인트가 차감됩니다.</li>
                <li>파티룸 예약은 카카오페이를 통한 직접 결제로 이루어집니다.</li>
                <li>회원은 예약 시작 시간 2시간 전까지 예약을 취소할 수 있으며, 이 경우 포인트가 전액 환불됩니다.</li>
                <li>예약 시작 시간 2시간 이내 취소 시 환불이 불가능합니다.</li>
                <li>회원은 예약 시간을 준수해야 하며, 무단 불참 시 향후 서비스 이용이 제한될 수 있습니다.</li>
                <li>연습실 내 시설 및 비품을 파손한 경우 회원은 이에 대한 배상 책임을 집니다.</li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-6" number={6} title="포인트">
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>포인트는 카카오페이를 통해 충전할 수 있으며, 충전 시 보너스 포인트가 제공될 수 있습니다.</li>
                <li>포인트는 연습실 예약에만 사용할 수 있으며, 현금으로 환불되지 않습니다.</li>
                <li>예약 취소 시 환불되는 포인트는 서비스 내에서만 사용 가능합니다.</li>
                <li>포인트는 충전일로부터 5년간 유효하며, 유효기간이 지난 포인트는 자동 소멸됩니다.</li>
                <li>부정한 방법으로 포인트를 획득하거나 사용한 경우 회원 자격이 정지되고 법적 책임을 물을 수 있습니다.</li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-7" number={7} title="서비스 이용 제한">
              <p className="text-[#3B342F]">
                서비스는 다음 각 호의 경우 회원의 서비스 이용을 제한하거나 정지할 수 있습니다:
              </p>
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>타인의 명의를 도용하여 가입한 경우</li>
                <li>허위 정보를 제공한 경우</li>
                <li>연습실 내 시설을 고의로 파손한 경우</li>
                <li>다른 회원의 서비스 이용을 방해하거나 정보를 도용한 경우</li>
                <li>서비스를 상업적 목적으로 무단 이용한 경우</li>
                <li>예약 후 무단 불참이 3회 이상 누적된 경우</li>
                <li>법령 또는 본 약관을 위반한 경우</li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-8" number={8} title="서비스의 중단">
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>
                  서비스는 다음 각 호의 경우 서비스 제공을 일시적으로 중단할 수 있습니다:
                  <ul className="mt-3 ml-4 list-disc space-y-2 text-[#3B342F]">
                    <li>시스템 정기점검, 서버 증설 및 교체</li>
                    <li>천재지변, 국가비상사태 등 불가항력적 사유</li>
                    <li>설비의 장애 또는 서비스 이용 폭주</li>
                  </ul>
                </li>
                <li>서비스 중단 시 사전에 공지하며, 부득이한 사유로 사전 공지가 불가능한 경우 사후에 공지합니다.</li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-9" number={9} title="면책조항">
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>서비스는 천재지변 또는 이에 준하는 불가항력으로 인해 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
                <li>서비스는 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.</li>
                <li>서비스는 회원이 연습실 내에서 발생한 분실, 도난, 상해 등에 대해 책임을 지지 않습니다.</li>
                <li>회원 간 또는 회원과 제3자 간 발생한 분쟁에 대해 서비스는 개입 의무가 없으며 이로 인한 손해를 배상할 책임이 없습니다.</li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-10" number={10} title="손해배상">
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>서비스의 고의 또는 과실로 회원에게 손해가 발생한 경우 서비스는 관련 법령에 따라 배상합니다.</li>
                <li>회원이 본 약관을 위반하여 서비스에 손해를 입힌 경우 회원은 그 손해를 배상해야 합니다.</li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-11" number={11} title="분쟁 해결">
              <ol className="list-decimal list-inside space-y-3 text-[#3B342F]">
                <li>서비스와 회원 간 발생한 분쟁은 상호 협의를 통해 해결합니다.</li>
                <li>협의가 이루어지지 않을 경우 서비스 소재지 관할 법원을 전속 관할 법원으로 합니다.</li>
              </ol>
            </ArticleSection>

            <ArticleSection id="article-12" number={12} title="개인정보 보호">
              <p className="text-[#3B342F]">
                회원의 개인정보는 별도의 개인정보처리방침에 따라 보호되며, 자세한 내용은 개인정보처리방침(
                <Link href="/privacy" className="text-[#B98768] underline underline-offset-2 hover:opacity-80">
                  https://a1-studio.vercel.app/privacy
                </Link>
                )에서 확인할 수 있습니다.
              </p>
            </ArticleSection>

            <ArticleSection id="article-13" number={13} title="시행일">
              <p className="text-[#3B342F]">
                본 약관은 <strong>2026년 5월 1일</strong>부터 시행됩니다.
              </p>
            </ArticleSection>
          </div>

          <hr className="my-12 border-[#D8CCBC]" />

          <div className="space-y-2 text-sm text-[#3B342F]">
            <p>
              <strong>A1 STUDIO</strong>
            </p>
            <p>서울시 송파구 문정동 70-13 B1</p>
            <p>대표: 신지섭</p>
            <p>사업자등록번호: 332-32-01611</p>
            <p>전화: 010-2994-0323</p>
            <p>이메일: a1studio0323@gmail.com</p>
          </div>
        </div>
      </div>

      <div className="bg-[#EFE7DA] border-t border-[#D8CCBC] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-[#6f655d] space-y-1">
            <p>A1 STUDIO | 서울시 송파구 문정동 70-13 B1</p>
            <p>대표: 신지섭 | 사업자등록번호: 332-32-01611</p>
            <p>010-2994-0323 | a1studio0323@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
