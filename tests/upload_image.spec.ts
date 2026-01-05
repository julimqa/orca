import { test, expect } from '@playwright/test';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/erw2sQAAAAASUVORK5CYII=';

test.describe('Upload Image API', () => {
  test('미인증 업로드는 401이어야 한다', async ({ request }) => {
    const png = Buffer.from(TINY_PNG_BASE64, 'base64');
    const res = await request.post('http://localhost:3001/api/upload/image', {
      multipart: {
        image: {
          name: 'tiny.png',
          mimeType: 'image/png',
          buffer: png,
        },
      },
    });

    expect(res.status()).toBe(401);
  });

  test('인증 업로드는 URL을 반환하고, 반환된 URL은 접근 가능해야 한다', async ({ request }) => {
    const login = await request.post('http://localhost:3001/api/auth/login', {
      data: { email: 'admin@tms.com', password: 'admin123!' },
    });
    expect(login.ok()).toBeTruthy();
    const loginJson = await login.json();
    const token = loginJson?.accessToken as string | undefined;
    expect(typeof token).toBe('string');

    const png = Buffer.from(TINY_PNG_BASE64, 'base64');
    const upload = await request.post('http://localhost:3001/api/upload/image', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        image: {
          name: 'tiny.png',
          mimeType: 'image/png',
          buffer: png,
        },
      },
    });
    expect(upload.ok()).toBeTruthy();

    const uploadJson = await upload.json();
    const url = uploadJson?.data?.url as string | undefined;
    expect(typeof url).toBe('string');
    expect(url).toMatch(/^\/uploads\/images\//);

    const served = await request.get(`http://localhost:3001${url}`);
    expect(served.ok()).toBeTruthy();
    expect(served.headers()['content-type']).toMatch(/^image\//);
  });
});


