# A1STUDIO Supabase RLS Migration Guide

> Supabase가 보낸 보안 경고(2026-05-17) 대응. public 스키마의 모든 테이블에 RLS(Row-Level Security)를 적용해 anon key로의 무제한 데이터 노출을 차단합니다.

## 적용 순서 (반드시 단계별)

```
Phase 1  →  Phase 2  →  Phase 3
(안전)      (중간)       (주의)
```

각 단계 적용 후 **스모크 테스트 통과를 확인하고 다음 단계로**.

---

## Phase 1: 토큰/세션 차단 (앱 영향 0)

**파일:** `01_phase_legacy_tokens_deny_all.sql`

**대상:** `accounts`, `sessions`, `verification_tokens`, `password_reset_tokens`, `email_auth_users`, `_prisma_migrations`

**무엇:** 모든 정책 없이 RLS만 켬 → anon/authenticated 전체 차단. service_role만 통과.

**왜 안전한가:** grep 결과 위 5개 토큰 테이블은 현재 코드베이스 어디서도 query되지 않음 (NextAuth → Supabase Auth 마이그레이션 잔재).

**적용:**
1. Supabase Dashboard → SQL Editor 열기
2. `01_phase_legacy_tokens_deny_all.sql` 전체 복붙
3. Run

**검증:** 파일 하단 검증 쿼리 실행 → 6개 모두 `rowsecurity=true` 확인.

**보안 효과 (즉시):**
- ✅ OAuth `access_token`, `refresh_token` 노출 차단
- ✅ `session_token` 노출 차단 (세션 하이재킹 방지)
- ✅ 비밀번호 재설정 토큰 노출 차단
- ✅ Supabase 경고 메일의 `sensitive_columns_exposed` 4건 중 3건 해결

---

## Phase 2: 사용자 데이터 보호 (중요 — 테스트 필수)

**파일:** `02_phase_user_owned_data.sql`

**대상:** `users`, `user_points`, `point_transactions`, `reservations`, `party_reservations`, `reviews`, `message_logs`, `payment_locks`

**핵심:**
- `public.is_admin()` 헬퍼 함수 생성 (이후 단계에서 재사용)
- 기존의 위험한 `"Allow select for all"` 정책 DROP
- `auth.uid() = user_id` 기반 본인-only 정책 작성
- ADMIN(`public.users.role='ADMIN'`)은 전체 접근 가능

**적용 전 확인:**
- [ ] Phase 1 완료
- [ ] 한가한 시간대 (예약 트래픽 적은 시간)
- [ ] Supabase 백업 또는 Point-in-Time Recovery 가능 시점 확인

**적용:** SQL Editor에 `02_phase_user_owned_data.sql` 붙여넣고 Run.

**필수 스모크 테스트** (실패 시 즉시 롤백):

| 시나리오 | 기대 |
|---|---|
| 로그인 후 /mypage | 본인 포인트·거래·예약 표시 |
| 로그인 후 /booking | 포인트 잔액 표시 |
| 로그인 후 /booking/complete?id=본인예약 | 정상 표시 |
| 로그인 후 /booking/complete?id=타인예약 | 표시 안 됨 (이전 보안 버그 수정) |
| 비로그인 anon API 호출 | `supabase.from('users').select('*')` → 0 rows |
| /admin (ADMIN 계정) | 전체 예약·회원 조회 정상 |
| 예약 → 카카오페이 결제 | 결제 승인 정상 동작 |
| 본인 예약 취소 | 정상 동작, 포인트 환불 정상 |

**롤백:** `02_phase_user_owned_data.sql` 하단 롤백 섹션 실행.

---

## Phase 3: 공개/관리자/시스템 (주의)

**파일:** `03_phase_public_and_admin.sql`

**대상:** `rooms`, `pricing_rules`, `blocked_slots`, `events`, `notices`, `one_day_classes`, `one_day_class_applications`, `payments`, `refunds`, `reservation_holds`, `banned_members`, `member_roles`, `intake_submissions`

**핵심:**
- 공개 콘텐츠: `is_published=true` / `is_active=true` 필터로 anon SELECT 허용
- 결제/시스템: ADMIN-only (service_role bypass)
- 의뢰 폼(`intake_submissions`): 일단 ADMIN-only → /intake 동작 안 하면 anon INSERT 정책 추가

**⚠️ 주의 사항 (적용 전 사용자 확인 필수):**

1. **카카오페이 결제 승인 흐름**과 연관:
   - `api/party-room/payments/kakao/approve` 가 `blocked_slots` INSERT 시도
   - 현재 anon+세션 쿠키로 동작 → RLS의 ADMIN-only에 막힘
   - **해결책 A**: 결제 승인 라우트를 service_role 클라이언트로 전환 (권장)
   - **해결책 B**: blocked_slots INSERT 정책에 결제 승인된 user 조건 추가
   - **본 단계 적용 전 반드시 결제 흐름 안정성 사용자 확인**

2. **`/intake` 의뢰 폼**:
   - 비로그인 사용자가 의뢰 가능해야 함
   - admin-only 정책으로 두면 INSERT 실패
   - 동작 안 하면: 
     ```sql
     CREATE POLICY intake_anon_insert ON public.intake_submissions
       FOR INSERT TO anon WITH CHECK (true);
     ```

---

## SECURITY DEFINER 함수 보안 (Phase 후속)

린터 WARN 9건:
- `function_search_path_mutable` (9개): search_path 고정
- `anon_security_definer_function_executable`: 일부 함수는 anon 호출 차단 필요

핵심 함수 보안 강화 SQL (Phase 3 적용 후 추가 권장):

```sql
-- search_path 고정 (권한 상승 공격 방지)
ALTER FUNCTION public.charge_points(uuid, integer, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.use_points(uuid, integer, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.refund_points(uuid, integer, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.refund_party_room_points(uuid, integer, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_onboarding_complete(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_expired_payment_locks() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_lost_items_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_text_uuid() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_user_exists() SET search_path = public, pg_temp;

-- charge_points, use_points 는 인증된 사용자만 호출 가능하게
-- (현재 anon 도 호출 가능 — RPC 직접 호출로 본인 포인트 조작 시도 가능)
REVOKE EXECUTE ON FUNCTION public.charge_points FROM anon;
REVOKE EXECUTE ON FUNCTION public.use_points FROM anon;
REVOKE EXECUTE ON FUNCTION public.refund_points FROM anon;
REVOKE EXECUTE ON FUNCTION public.refund_party_room_points FROM anon;
```

> **주의:** `charge_points`/`use_points`는 authenticated에도 노출되어 있어 **로그인한 사용자가 자기 user_id로 RPC 호출하면 포인트 임의 충전 가능**. 함수 내부에 호출자 검증 추가 또는 EXECUTE 권한을 service_role로만 제한 필요. 별도 작업 권장.

---

## Storage Bucket 정책 (Phase 후속)

린터 WARN: `public_bucket_allows_listing` (3건)
- `lost-item-images`, `review-images`, `review-videos`

공개 버킷은 객체 URL 직접 접근만 필요하지 listing은 불필요. 다음 SQL로 listing 정책만 제거:

```sql
DROP POLICY IF EXISTS "lost_item_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Public read review images"   ON storage.objects;
DROP POLICY IF EXISTS "Public read review videos"   ON storage.objects;
-- 객체 URL 직접 접근은 버킷이 public 이면 정책 없어도 자동 허용
```

---

## Authentication 강화 (대시보드 작업)

린터 WARN: `auth_leaked_password_protection`

Supabase Dashboard → Authentication → Policies → "Leaked password protection" 활성화. HaveIBeenPwned.org와 대조해 유출된 비밀번호 차단.

---

## 최종 검증 (모든 Phase 완료 후)

Supabase Dashboard → Advisors → Security 에서 ERROR 0건 확인.

기대 결과:
- ✅ `rls_disabled_in_public`: 0
- ✅ `policy_exists_rls_disabled`: 0
- ✅ `sensitive_columns_exposed`: 0
- ⚠️ WARN은 일부 남을 수 있음 (function search_path, bucket listing 등 — 후속 작업)

---

## 적용 후 코드 수정 권장 사항

RLS 적용 후 안정성을 위해 다음 코드 수정 고려:

1. **결제 승인 라우트 → service_role 클라이언트로 전환**
   - `src/app/api/reservations/payments/kakao/approve/route.ts`
   - `src/app/api/party-room/payments/kakao/approve/route.ts`
   - `src/app/api/charge/approve/route.ts`
   - 이유: blocked_slots, payments, user_points 등 다중 테이블 mutation을 안전하게 처리

2. **시스템 INSERT 라우트 → service_role 전환**
   - `src/lib/sms.ts` (message_logs INSERT)
   - `src/lib/payment-lock.ts` (만료 정리)

3. **booking/complete 페이지 — 비회원 예약 조회**
   - 현재 reservationId만으로 조회. RLS 적용 후 비회원(user_id IS NULL)은 anon으로도 조회 안 됨.
   - 서버 API(`/api/reservations/[id]?phone=...`)로 phone 검증 후 응답하는 방식으로 전환 권장
