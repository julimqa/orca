/**
 * Phase 1.2: 안전한 원시 타입 별칭(아직 프로덕션에서 사용하지 않음)
 * - Phase 2에서 실제 API/엔티티 타입을 "현 상태 그대로" 미러링할 예정
 */

/** ISO 8601 날짜/시간 문자열을 의미하는 브랜드(런타임 검증 없음) */
export type IsoDateTimeString = string;

/** UUID/기타 ID를 의미하는 브랜드(런타임 검증 없음) */
export type IdString = string;


