import { Router } from 'express';
import { register, login, getMe, updateProfile, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from './schemas/authSchemas';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    회원가입
 * @access  Public
 */
router.post('/register', validateBody(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    로그인
 * @access  Public
 */
router.post('/login', validateBody(loginSchema), login);

/**
 * @route   GET /api/auth/me
 * @desc    현재 로그인한 사용자 정보 조회
 * @access  Private
 */
router.get('/me', authenticateToken, getMe);

/**
 * @route   PATCH /api/auth/profile
 * @desc    프로필 업데이트
 * @access  Private
 */
router.patch('/profile', authenticateToken, validateBody(updateProfileSchema), updateProfile);

/**
 * @route   POST /api/auth/change-password
 * @desc    비밀번호 변경
 * @access  Private
 */
router.post('/change-password', authenticateToken, validateBody(changePasswordSchema), changePassword);

export default router;
