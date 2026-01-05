/**
 * Phase 1.2: 공용 유틸 타입(아직 프로덕션에서 사용하지 않음)
 */

export type Nullable<T> = T | null;

export type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;


