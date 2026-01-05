import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/** 비밀번호를 bcrypt로 해시 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/** 평문 비밀번호와 해시된 비밀번호 비교 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}
