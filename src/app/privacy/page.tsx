import PrivacyToc from "./PrivacyToc";

export const metadata = {
  title: "개인정보처리방침 | A1 STUDIO",
  description: "A1 STUDIO의 개인정보 수집·이용·보관 방침을 안내합니다. 시행일: 2026년 5월 1일",
};

// 재사용 컴포넌트
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

function InfoTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-[#D8CCBC] rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-[#EFE7DA]">
            {headers.map((header, i) => (
              <th
                key={i}
                className="border border-[#D8CCBC] px-4 py-3 text-left text-sm font-bold text-[#3B342F]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F7F3EB]"}>
              {row.map((cell, j) => (
                <td key={j} className="border border-[#D8CCBC] px-4 py-3 text-sm text-[#3B342F]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-[#B98768] bg-[#B98768]/10 px-4 py-3 rounded-r-lg">
      <p className="text-sm text-[#6f655d]">{children}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B98768] mt-2 shrink-0" />
          <span className="text-[#3B342F]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Badge({ type }: { type: "required" | "optional" }) {
  return (
    <span
      className={`
        inline-block px-2 py-0.5 text-xs font-semibold rounded
        ${type === "required" ? "bg-[#B98768] text-white" : "bg-[#D8CCBC] text-[#6f655d]"}
      `}
    >
      {type === "required" ? "필수" : "선택"}
    </span>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      {/* 히어로 섹션 */}
      <div className="bg-[#EFE7DA] border-b border-[#D8CCBC]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768] mb-2">
            LEGAL DOCUMENT
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-[#3B342F] mb-4" style={{ fontFamily: "var(--font-noto-serif)" }}>
            개인정보처리방침
          </h1>
          <p className="text-[#6f655d]">시행일: 2026년 5월 1일</p>
        </div>
      </div>

      {/* 본문 컨테이너 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-4 lg:gap-12">
          {/* 목차 사이드바 */}
          <div className="lg:col-span-1">
            <PrivacyToc />
          </div>

          {/* 본문 */}
          <div className="lg:col-span-3">
            {/* 요약 박스 */}
            <NoteBox>
              A1 STUDIO(이하 "서비스")는 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 및 관련 법령을 준수합니다.
              본 방침은 서비스가 수집하는 개인정보의 항목, 이용 목적, 보유 기간, 그리고 이용자의 권리에 대해 안내합니다.
            </NoteBox>

            <div className="mt-12 space-y-12">
              {/* 제1조 */}
              <ArticleSection id="article-1" number={1} title="수집하는 개인정보 항목">
                <div>
                  <h3 className="text-lg font-bold text-[#3B342F] mb-4">1. 회원가입 및 로그인</h3>
                  <InfoTable
                    headers={["구분", "수집 항목", "필수/선택"]}
                    rows={[
                      ["이메일 회원가입", "이메일 주소, 비밀번호(암호화 저장)", "필수"],
                      ["Google 소셜 로그인", "이메일 주소, 이름, 프로필 이미지, 로그인 제공자 정보", "필수"],
                      ["Kakao 소셜 로그인", "이름, 출생 연도, 카카오계정(전화번호)", "필수"],
                      ["추가 프로필 입력", "휴대폰 번호", "필수"],
                      ["비밀번호 재설정", "이메일 주소", "필수"],
                      ["휴대폰 인증", "휴대폰 번호, 인증번호", "필수"],
                    ]}
                  />
                  <NoteBox>※ 배송지정보는 현재 서비스에서 수집하지 않습니다.</NoteBox>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#3B342F] mb-4">2. 예약</h3>
                  <InfoTable
                    headers={["구분", "수집 항목", "필수/선택"]}
                    rows={[
                      ["예약 신청", "예약자명, 연락처, 예약일, 시작시간, 종료시간, 이용 인원", "필수"],
                      ["예약 신청", "이메일 주소, 메모", "선택"],
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#3B342F] mb-4">3. 결제 및 포인트</h3>
                  <InfoTable
                    headers={["구분", "수집 항목", "필수/선택"]}
                    rows={[
                      ["결제 처리", "주문번호, 결제금액, 결제상태, 승인시각", "필수"],
                      ["환불 처리", "환불금액, 환불 사유, 환불 처리 일시", "필수"],
                      ["포인트 내역", "충전·사용·환불 금액 및 일시, 잔액", "필수"],
                    ]}
                  />
                  <NoteBox>
                    ※ 카드번호, 계좌번호 등 금융정보 원문은 서비스가 직접 저장하지 않으며, PG사(카카오페이)가 관련 정보를 처리합니다.
                  </NoteBox>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#3B342F] mb-4">4. 문의하기</h3>
                  <InfoTable
                    headers={["구분", "수집 항목", "필수/선택"]}
                    rows={[
                      ["문의 접수", "문의자명, 연락처, 문의 내용", "필수"],
                      ["문의 접수", "이메일 주소", "선택"],
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#3B342F] mb-4">5. 원데이클래스 신청</h3>
                  <InfoTable
                    headers={["구분", "수집 항목", "필수/선택"]}
                    rows={[
                      ["클래스 신청", "신청자명, 연락처, 신청 인원", "필수"],
                      ["클래스 신청", "이메일 주소, 메시지", "선택"],
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#3B342F] mb-4">6. 후기</h3>
                  <InfoTable
                    headers={["구분", "수집 항목", "필수/선택"]}
                    rows={[
                      ["후기 작성", "평점, 후기 내용", "필수"],
                      ["후기 작성", "닉네임", "선택"],
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#3B342F] mb-4">7. 자동 수집 항목</h3>
                  <p className="text-[#3B342F]">
                    서비스 이용 과정에서 접속 IP, 서비스 이용 일시, 브라우저 종류, 쿠키 및 세션 정보가 자동으로 생성·수집될 수 있습니다.
                  </p>
                </div>
              </ArticleSection>

              {/* 제2조 */}
              <ArticleSection id="article-2" number={2} title="개인정보 수집 방법">
                <BulletList
                  items={[
                    "회원가입, 로그인, 예약, 결제, 문의, 클래스 신청 등 서비스 이용 과정에서 이용자가 직접 입력",
                    "Google, Kakao 소셜 로그인 연동을 통한 수집 (이용자의 동의 하에 해당 플랫폼으로부터 제공)",
                    "서비스 이용 과정에서 자동 생성·수집",
                  ]}
                />
              </ArticleSection>

              {/* 제3조 */}
              <ArticleSection id="article-3" number={3} title="개인정보 이용 목적">
                <InfoTable
                  headers={["이용 목적", "해당 정보"]}
                  rows={[
                    ["회원 식별 및 인증, 로그인 상태 유지", "이메일, 소셜 로그인 정보, 휴대폰 번호"],
                    ["성인 인증 (만 19세 이상 확인) - 주류 반입 가능 파티룸 운영", "출생 연도"],
                    ["예약 확인 및 안내 메시지(SMS/알림톡) 발송", "카카오계정(전화번호), 휴대폰 번호"],
                    ["예약 서비스 제공 및 예약 내역 관리", "예약자 정보 전반"],
                    ["결제 처리, 포인트 충전·차감·환불", "결제 및 포인트 관련 정보"],
                    ["문의 접수 및 응대", "문의자 정보"],
                    ["원데이클래스 신청 및 운영", "신청자 정보"],
                    ["후기 게시 및 서비스 개선", "후기 정보"],
                    ["공지사항·이벤트 안내", "이메일, 연락처"],
                    ["부정 이용 방지 및 서비스 보안 유지", "접속 정보, 이용 내역"],
                  ]}
                />
              </ArticleSection>

              {/* 제4조 */}
              <ArticleSection id="article-4" number={4} title="개인정보 보유 및 이용기간">
                <p className="text-[#3B342F]">
                  서비스는 이용자의 개인정보를 회원 탈퇴 또는 수집·이용 목적 달성 시까지 보유합니다.
                  단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보유합니다.
                </p>
                <InfoTable
                  headers={["항목", "보유기간", "근거"]}
                  rows={[
                    ["회원 정보", "탈퇴 시까지", "서비스 제공 목적"],
                    ["예약 및 결제 내역", "5년", "전자상거래 등에서의 소비자보호에 관한 법률"],
                    ["계약 또는 청약철회 기록", "5년", "동상"],
                    ["소비자 불만 또는 분쟁처리 기록", "3년", "동상"],
                    ["문의 내역", "3년", "서비스 내부 방침"],
                    ["접속 로그", "3개월", "통신비밀보호법"],
                  ]}
                />
              </ArticleSection>

              {/* 제5조 */}
              <ArticleSection id="article-5" number={5} title="개인정보 파기 절차 및 방법">
                <p className="text-[#3B342F]">
                  보유기간이 종료되거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.
                </p>
                <BulletList
                  items={[
                    "전자적 파일: 복구 불가능한 방법으로 영구 삭제",
                    "출력물 등 비전자적 기록: 분쇄 또는 소각",
                  ]}
                />
                <p className="text-[#3B342F]">
                  회원 탈퇴 시, 관련 법령에 따른 보존 의무가 있는 정보를 제외한 개인정보는 즉시 파기합니다.
                </p>
              </ArticleSection>

              {/* 제6조 */}
              <ArticleSection id="article-6" number={6} title="개인정보의 제3자 제공">
                <p className="text-[#3B342F]">
                  서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.
                  다만, 아래의 경우는 예외로 합니다.
                </p>
                <BulletList
                  items={[
                    "이용자가 사전에 동의한 경우",
                    "법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관이 요청하는 경우",
                  ]}
                />
              </ArticleSection>

              {/* 제7조 */}
              <ArticleSection id="article-7" number={7} title="개인정보 처리위탁">
                <p className="text-[#3B342F]">
                  서비스는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 외부에 위탁합니다.
                </p>
                <InfoTable
                  headers={["수탁업체", "위탁 업무", "보유 및 이용기간"]}
                  rows={[
                    ["Supabase Inc.", "회원 인증 및 데이터베이스 운영", "위탁 계약 종료 시까지"],
                    ["Kakao Corp.", "카카오 소셜 로그인 처리", "위탁 계약 종료 시까지"],
                    ["Google LLC", "Google 소셜 로그인 처리", "위탁 계약 종료 시까지"],
                    ["카카오페이(주)", "결제 및 포인트 충전 처리", "위탁 계약 종료 시까지"],
                    ["Twilio Inc. (SendGrid)", "이메일 발송", "위탁 계약 종료 시까지"],
                    ["Vercel Inc.", "서비스 호스팅 및 인프라 운영", "위탁 계약 종료 시까지"],
                  ]}
                />
              </ArticleSection>

              {/* 제8조 */}
              <ArticleSection id="article-8" number={8} title="국외 이전">
                <p className="text-[#3B342F]">
                  서비스는 일부 업무 처리를 위해 아래와 같이 개인정보를 국외로 이전할 수 있습니다.
                </p>
                <InfoTable
                  headers={["이전 대상", "이전 국가/지역", "이전 항목", "이전 목적"]}
                  rows={[
                    ["Supabase Inc.", "대한민국 (Seoul 리전)", "회원 정보, 예약·결제 내역 등", "인증 및 DB 운영"],
                    ["Google LLC", "미국", "소셜 로그인 관련 정보", "소셜 로그인 처리"],
                    ["Twilio Inc. (SendGrid)", "미국", "이메일 주소", "이메일 발송"],
                    ["Vercel Inc.", "미국", "서비스 이용 로그 등", "서비스 호스팅"],
                  ]}
                />
                <NoteBox>
                  이용자는 국외 이전에 동의하지 않을 권리가 있으며, 동의하지 않을 경우 일부 서비스 이용이 제한될 수 있습니다.
                </NoteBox>
              </ArticleSection>

              {/* 제9조 */}
              <ArticleSection id="article-9" number={9} title="정보주체의 권리와 행사 방법">
                <p className="text-[#3B342F] mb-4">이용자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
                <BulletList
                  items={[
                    "개인정보 열람 요청",
                    "개인정보 정정·삭제 요청",
                    "개인정보 처리 정지 요청",
                    "동의 철회",
                  ]}
                />
                <p className="text-[#3B342F]">
                  권리 행사는 서비스 내 마이페이지 또는 아래 연락처를 통해 요청하실 수 있으며, 서비스는 요청을 받은 날로부터 10일 이내에 처리합니다.
                </p>
                <p className="text-[#3B342F]">
                  만 14세 미만 아동의 경우, 법정대리인이 권리를 행사할 수 있습니다. 만 14세 미만 이용자가 개인정보를 제공할 경우 법정대리인의 동의를 받아야 합니다. 
                  법정대리인은 해당 아동의 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.
                </p>
              </ArticleSection>

              {/* 제10조 */}
              <ArticleSection id="article-10" number={10} title="쿠키 및 세션 안내">
                <p className="text-[#3B342F] mb-4">
                  서비스는 로그인 상태 유지, 서비스 이용 편의성 제공 등을 위해 쿠키(Cookie) 및 세션을 사용합니다.
                </p>
                <BulletList
                  items={[
                    "쿠키: 브라우저에 저장되는 소규모 텍스트 파일로, 이용자의 브라우저 설정에서 거부하거나 삭제할 수 있습니다.",
                    "세션: 서버 측에서 로그인 상태를 유지하기 위해 사용되며, 브라우저 종료 시 만료됩니다.",
                    "쿠키 거부 시 로그인 유지 및 일부 서비스 이용이 제한될 수 있습니다.",
                  ]}
                />
              </ArticleSection>

              {/* 제11조 */}
              <ArticleSection id="article-11" number={11} title="개인정보의 안전성 확보조치">
                <p className="text-[#3B342F] mb-4">
                  서비스는 개인정보 보호를 위해 다음과 같은 조치를 취하고 있습니다.
                </p>
                <BulletList
                  items={[
                    "비밀번호 암호화 저장 (bcrypt)",
                    "HTTPS를 통한 통신 구간 암호화",
                    "접근 권한 최소화 (관리자 계정 별도 운영)",
                    "결제 정보는 PG사에서 직접 처리하며 카드번호 등 민감 금융정보를 서버에 저장하지 않음",
                  ]}
                />
              </ArticleSection>

              {/* 제12조 */}
              <ArticleSection id="article-12" number={12} title="개인정보 보호책임자">
                <p className="text-[#3B342F] mb-4">
                  서비스의 개인정보 처리에 관한 문의, 불만 처리, 피해 구제 등을 담당하는 책임자는 아래와 같습니다.
                </p>
                <InfoTable
                  headers={["항목", "내용"]}
                  rows={[
                    ["성명", "신지섭"],
                    ["직책", "대표"],
                    ["연락처", "010-2994-0323"],
                    ["이메일", "a1studio0323@gmail.com"],
                  ]}
                />
                <p className="text-[#3B342F] mt-6 mb-4">
                  개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다.
                </p>
                <BulletList
                  items={[
                    "개인정보침해신고센터: privacy.kisa.or.kr / 국번없이 118",
                    "개인정보 분쟁조정위원회: www.kopico.go.kr / 1833-6972",
                    "대검찰청 사이버수사과: www.spo.go.kr / 국번없이 1301",
                    "경찰청 사이버수사국: ecrm.police.go.kr / 국번없이 182",
                  ]}
                />
              </ArticleSection>

              {/* 제13조 */}
              <ArticleSection id="article-13" number={13} title="시행일">
                <p className="text-[#3B342F]">
                  본 개인정보처리방침은 <strong>2026년 5월 1일</strong>부터 시행됩니다.
                </p>
              </ArticleSection>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 정보 박스 */}
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
