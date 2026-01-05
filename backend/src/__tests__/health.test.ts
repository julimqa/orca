import request from 'supertest';
import app from '../app';

describe('Backend basic endpoints', () => {
  it('GET /health returns expected shape', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('TMS Backend Server is running');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('unknown route returns 404 with expected body', async () => {
    const res = await request(app).get('/__does_not_exist__');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: '요청한 리소스를 찾을 수 없습니다.',
    });
  });
});
