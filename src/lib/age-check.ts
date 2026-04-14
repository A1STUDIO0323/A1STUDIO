/**
 * 생년월일 기준 만 19세 이상 여부 반환
 * @param birthdate "YYYY-MM-DD" 형식 또는 Date 객체
 */
export function isAdult(birthdate: string | Date): boolean {
  const birth = typeof birthdate === 'string' ? new Date(birthdate) : birthdate;
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const isBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  return age - (isBirthdayPassed ? 0 : 1) >= 19;
}
