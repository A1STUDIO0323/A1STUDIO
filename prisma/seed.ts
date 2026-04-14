import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Room 생성 (15평 단독 연습실)
  const room = await prisma.room.upsert({
    where: { slug: "room-a" },
    update: {},
    create: {
      name: "A룸 — 밴드 연습실",
      slug: "room-a",
      description:
        "드럼·베이스·기타 앰프·PA 시스템을 모두 갖춘 15평 풀셋업 밴드 연습실. 2중 방음 구조로 야간에도 마음껏 연습하세요.",
      capacity: 6,
      sizeM2: 49.5,
      amenities: [
        "Pearl Export EXX 드럼 키트",
        "Marshall DSL40CR 기타 앰프",
        "Ampeg BA-115 베이스 앰프",
        "Yamaha DXR12mkII PA 시스템 × 2",
        "Shure SM58 마이크 × 2",
        "마이크 스탠드 × 2",
        "DI 박스",
        "냉난방 (독립 에어컨·히터)",
        "무료 Wi-Fi",
        "주차 1대 무료",
        "화장실 이용 가능",
        "정수기",
      ],
      images: [
        "/images/room-a-1.jpg",
        "/images/room-a-2.jpg",
        "/images/room-a-3.jpg",
      ],
      isActive: true,
    },
  });
  console.log("✅ Room created:", room.name);

  // 2. Pricing Rules
  //    dayOfWeekMask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
  //    평일(월~금) = 2+4+8+16+32 = 62
  //    주말(토+일) = 64+1 = 65

  const WEEKDAY_MASK = 62; // Mon~Fri
  const WEEKEND_MASK = 65; // Sat+Sun
  const ALL_WEEK_MASK = 127;

  await prisma.pricingRule.deleteMany({ where: { roomId: room.id } });

  const pricingRules = await prisma.pricingRule.createMany({
    data: [
      {
        roomId: room.id,
        label: "평일 비피크",
        dayOfWeekMask: WEEKDAY_MASK,
        timeStart: "00:00",
        timeEnd: "18:00",
        pricePerHour: 7000,
        minHours: 1,
        isPackage: false,
        isActive: true,
      },
      {
        roomId: room.id,
        label: "평일 피크타임",
        dayOfWeekMask: WEEKDAY_MASK,
        timeStart: "18:00",
        timeEnd: "00:00",
        pricePerHour: 9000,
        minHours: 1,
        isPackage: false,
        isActive: true,
      },
      {
        roomId: room.id,
        label: "주말/공휴일 비피크",
        dayOfWeekMask: WEEKEND_MASK,
        timeStart: "00:00",
        timeEnd: "13:00",
        pricePerHour: 8000,
        minHours: 1,
        isPackage: false,
        isActive: true,
      },
      {
        roomId: room.id,
        label: "주말/공휴일 피크타임",
        dayOfWeekMask: WEEKEND_MASK,
        timeStart: "13:00",
        timeEnd: "00:00",
        pricePerHour: 10000,
        minHours: 1,
        isPackage: false,
        isActive: true,
      },
      {
        roomId: room.id,
        label: "패키지 10H",
        dayOfWeekMask: ALL_WEEK_MASK,
        timeStart: "09:00",
        timeEnd: "24:00",
        pricePerHour: 13000,
        minHours: 10,
        isPackage: true,
        packageName: "패키지 10H",
        packageHours: 10,
        packagePrice: 130000,
        isActive: true,
      },
      {
        roomId: room.id,
        label: "패키지 20H",
        dayOfWeekMask: ALL_WEEK_MASK,
        timeStart: "09:00",
        timeEnd: "24:00",
        pricePerHour: 12000,
        minHours: 20,
        isPackage: true,
        packageName: "패키지 20H",
        packageHours: 20,
        packagePrice: 240000,
        isActive: true,
      },
    ],
  });
  console.log("✅ Pricing rules created:", pricingRules.count);

  // 3. 공지사항 샘플
  await prisma.notice.createMany({
    data: [
      {
        title: "[공지] 3월 정기 점검 안내 (3/10 09:00–13:00 이용 불가)",
        content:
          "정기 시설 점검으로 인해 2026년 3월 10일 오전 9시부터 오후 1시까지 이용이 불가합니다. 해당 시간대에 예약하신 분들께는 개별 연락 후 전액 환불 처리해 드립니다.",
        isPublished: true,
        isPinned: true,
      },
      {
        title: "[이벤트] 봄맞이 첫 예약 10% 할인 쿠폰 증정",
        content:
          "3월 한 달간 처음 예약하시는 분들께 다음 예약 10% 할인 쿠폰을 드립니다. 예약 완료 후 문자로 쿠폰 코드가 자동 발송됩니다.",
        isPublished: true,
        isPinned: true,
      },
      {
        title: "드럼 킷 교체 완료 안내 (Pearl Export EXX Series)",
        content:
          "Pearl Export EXX Series 드럼 킷으로 교체가 완료되었습니다. 기존 대비 타격감과 음색이 크게 향상되었으니 많이 이용해 주세요.",
        isPublished: true,
        isPinned: false,
      },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Notices created");

  // 4. 이벤트 샘플
  await prisma.event.createMany({
    data: [
      {
        title: "봄맞이 첫 예약 10% 할인",
        content:
          "3월 한 달간, 처음 예약하는 분들께 10% 할인 쿠폰을 드립니다. 결제 완료 후 자동 발송됩니다.",
        startsAt: new Date("2026-03-01"),
        endsAt: new Date("2026-03-31"),
        isPublished: true,
      },
      {
        title: "SNS 후기 공유 이벤트",
        content:
          "인스타그램에 후기를 업로드하고 DM 주시면 다음 예약 30분 무료 혜택을 드립니다.",
        startsAt: new Date("2026-02-01"),
        endsAt: new Date("2026-03-31"),
        isPublished: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Events created");

  // 5. 샘플 리뷰
  // (실제 예약과 연결되어야 하므로 seed에서는 reservation 없이 생략)
  // 필요 시 reservation을 먼저 생성하고 review를 연결할 것

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
