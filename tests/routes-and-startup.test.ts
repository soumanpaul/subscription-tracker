import express from 'express';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn((_req, res) => res.status(201).json({ ok: true })),
  signIn: vi.fn((_req, res) => res.status(200).json({ ok: true })),
  signOut: vi.fn((_req, res) => res.status(200).json({ ok: true })),
  authorize: vi.fn((req, _res, next) => {
    req.user = { id: 'u1', _id: 'u1' };
    next();
  }),
  getUserSubscriptions: vi.fn((_req, res) => res.status(200).json({ ok: true })),
  createSubscription: vi.fn((_req, res) => res.status(201).json({ ok: true })),
  getUsers: vi.fn((_req, res) => res.status(200).json({ users: [] })),
  getUser: vi.fn((_req, res) => res.status(200).json({ user: {} })),
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn((_port, cb) => cb && cb()),
}));

vi.mock('../controllers/auth.controller.js', () => ({ signUp: mocks.signUp, signIn: mocks.signIn, signOut: mocks.signOut }));
vi.mock('../middleware/auth.middleware.js', () => ({ default: mocks.authorize }));
vi.mock('../controllers/subscription.controller.js', () => ({ getUserSubscriptions: mocks.getUserSubscriptions, createSubscription: mocks.createSubscription }));
vi.mock('../controllers/user.controller.js', () => ({ getUsers: mocks.getUsers, getUser: mocks.getUser }));
vi.mock('../database/connectToDatabase.ts', () => ({ default: mocks.connectToDatabase }));
vi.mock('../config/env.ts', () => ({ env: { PORT: 3005, NODE_ENV: 'test' } }));
vi.mock('../app.ts', () => ({ app: { listen: mocks.listen } }));

describe('route modules', () => {
  test('auth routes wire expected endpoints', async () => {
    const { default: authRouter } = await import('../routes/auth.routes.ts');
    const app = express();
    app.use(express.json());
    app.use('/auth', authRouter);

    const up = await request(app).post('/auth/sign-up').send({});
    const inRes = await request(app).post('/auth/sign-in').send({});
    const out = await request(app).post('/auth/sign-out').send({});
    const up2 = await request(app).post('/auth/signup').send({});
    const inRes2 = await request(app).post('/auth/login').send({});
    const out2 = await request(app).post('/auth/logout').send({});

    expect(up.status).toBe(201);
    expect(inRes.status).toBe(200);
    expect(out.status).toBe(200);
    expect(up2.status).toBe(201);
    expect(inRes2.status).toBe(200);
    expect(out2.status).toBe(200);
  });

  test('subscription routes wire auth-protected endpoints', async () => {
    const { default: subRouter } = await import('../routes/subscription.routes.ts');
    const app = express();
    app.use(express.json());
    app.use('/sub', subRouter);

    const list = await request(app).get('/sub');
    const byUser = await request(app).get('/sub/user/u1');
    const create = await request(app).post('/sub').send({});
    const update = await request(app).put('/sub/1');
    const del = await request(app).delete('/sub/1');

    expect(list.status).toBe(200);
    expect(byUser.status).toBe(200);
    expect(create.status).toBe(201);
    expect(update.status).toBe(200);
    expect(del.status).toBe(200);
  });

  test('user routes load and respond with mocked controllers', async () => {
    const { default: userRouter } = await import('../routes/user.routes.js');
    const app = express();
    app.use('/users', userRouter);

    const list = await request(app).get('/users');
    const one = await request(app).get('/users/1');
    const create = await request(app).post('/users').send({});
    const update = await request(app).put('/users/1').send({});
    const del = await request(app).delete('/users/1');

    expect(list.status).toBe(200);
    expect(one.status).toBe(200);
    expect(create.status).toBe(200);
    expect(update.status).toBe(200);
    expect(del.status).toBe(200);
  });
});

describe('index startup', () => {
  test('index connects DB and starts server', async () => {
    await import('../index.ts');

    expect(mocks.connectToDatabase).toHaveBeenCalled();
    expect(mocks.listen).toHaveBeenCalled();
  });
});
