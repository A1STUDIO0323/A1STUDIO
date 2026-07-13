# A1 STUDIO 예약 동기화 에이전트 (sync-agent)

24시간 켜둔 PC에서 상주하며 **스페이스클라우드 ↔ 네이버 스마트플레이스 ↔ 홈페이지** 예약을 동기화하는 프로그램입니다.

두 플랫폼 모두 공식 API가 없기 때문에, Playwright 브라우저 자동화로 각 관리자 페이지를 5분 간격으로 확인합니다.

## 하는 일

1. **이용안내 SMS**: 스페이스클라우드/네이버에서 새 예약을 발견하면 예약자명·전화번호·시간을 홈페이지로 전송 → 홈페이지가 기존 SOLAPI로 이용안내 문자를 자동 발송 (중복 발송 없음)
2. **양방향 예약 차단**: 한 플랫폼에 예약이 들어오면 상대 플랫폼의 같은 시간대를 자동 차단, 취소되면 해제
3. **홈페이지 예약 반영**: 홈페이지 자체 예약도 두 플랫폼에 차단 반영 (3채널 동기화)
4. **장애 알림**: 로그인 세션 만료 등으로 3사이클 연속 실패하면 관리자 번호(`SYNC_ALERT_PHONE`)로 SMS 알림

외부 예약은 홈페이지 관리자 캘린더에도 자동 표시되고, 홈페이지 예약가능 시간에서도 제외됩니다.

## 최초 설정 (24시간 PC에서)

1. [Node.js](https://nodejs.org) LTS 설치
2. 이 폴더(`sync-agent/`)를 PC에 복사 후:
   ```
   npm install
   npx playwright install chromium
   ```
3. `.env.example`을 `.env`로 복사하고 값 입력:
   - `HOMEPAGE_URL`: 배포된 홈페이지 주소
   - `SYNC_AGENT_API_KEY`: 홈페이지(Vercel) 환경변수 `SYNC_AGENT_API_KEY`와 같은 값 (긴 무작위 문자열)
4. 홈페이지(Vercel) 환경변수에 추가: `SYNC_AGENT_API_KEY`, `SYNC_ALERT_PHONE`(관리자 휴대폰)
5. Supabase SQL Editor에서 `prisma/migrations/add_external_sync.sql` 실행
6. 최초 로그인 (세션 저장):
   ```
   npm run login
   ```
   브라우저가 뜨면 스페이스클라우드 파트너센터와 네이버에 각각 로그인 후 창 닫기
7. 실행:
   ```
   npm start
   ```

## 상시 실행 (권장: pm2)

```
npm install -g pm2
pm2 start "npm start" --name a1-sync
pm2 save
pm2 startup   # 안내에 따라 부팅 시 자동 시작 등록
```

## ⚠️ 셀렉터 확인 필요 (최초 1회)

플랫폼 관리자 화면은 로그인해야 볼 수 있어, 스크랩/차단에 쓰는 화면 요소 위치(셀렉터)는 실제 계정으로 접속해 맞춰야 합니다:

- `src/platforms/spacecloud.ts` — 예약 목록 파싱, `blockSlot`(예약마감) 구현
- `src/platforms/naver.ts` — 예약 목록 파싱, `blockSlot`(스케줄 차단) 구현

`HEADED=true npm run once` 로 브라우저를 보면서 한 사이클씩 확인하며 조정하면 됩니다.
`blockSlot`이 구현되기 전까지는 차단 시도가 실패로 기록되고 관리자 알림이 갑니다 (SMS 발송·예약 수집은 정상 동작).

## 한계

- 폴링 간격(기본 5분) 사이에 양쪽에서 동시에 예약이 들어오는 더블부킹은 100% 막을 수 없습니다 (사후 차단 방식).
- 네이버 로그인은 보안 정책상 주기적으로 만료될 수 있으며, 이때 `npm run login`으로 재로그인해야 합니다 (만료 시 관리자 SMS 알림).
- 플랫폼 화면이 개편되면 셀렉터를 다시 맞춰야 합니다.
