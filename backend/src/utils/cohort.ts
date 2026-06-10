// 학번(student_id) → 입학년도 도출. 학번 앞 4자리가 입학년도.
export function entryYearOf(studentId: string | null | undefined): number | null {
  if (!studentId || !/^\d{4}/.test(studentId)) return null
  return parseInt(studentId.slice(0, 4), 10)
}
