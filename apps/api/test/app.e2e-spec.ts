import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AMATIS API E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('Health', () => {
    it('should return 200 on health', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
    });
  });

  describe('Auth', () => {
    let token: string;

    it('should reject invalid login', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ mobile: '09120000001', password: 'wrong-password' });
      expect(res.status).toBe(401);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ mobile: '09120000001', password: 'Admin@123456' });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      token = res.body.data.accessToken;
    });

    it('should get me with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.mobile).toBe('09120000001');
    });
  });

  describe('Protected endpoints - role access', () => {
    let adminToken: string;
    let empToken: string;

    beforeAll(async () => {
      const admin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ mobile: '09120000001', password: 'Admin@123456' });
      adminToken = admin.body.data.accessToken;

      const emp = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ mobile: '09120000004', password: 'Employee@123456' });
      empToken = emp.body.data.accessToken;
    }, 30000);

    it('should allow admin to view audit logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?limit=1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('should block employee from audit logs (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?limit=1')
        .set('Authorization', `Bearer ${empToken}`);
      expect(res.status).toBe(403);
    });

    it('should block employee from creating employees (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ firstName: 'x', lastName: 'y', mobile: '09120009999', initialPassword: 'Test@123456' });
      expect(res.status).toBe(403);
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/audit-logs?limit=1');
      expect(res.status).toBe(401);
    });
  });
});
