import request from 'supertest';
import app from '../app';

describe('Auth endpoints (seed accounts)', () => {
  it('POST /api/auth/login logs in seeded admin', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@tms.com', password: 'admin123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('admin@tms.com');
    expect(res.body.user.role).toBe('ADMIN');
  });
});
