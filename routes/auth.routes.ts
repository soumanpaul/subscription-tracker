import { Router } from 'express'
import type { RequestHandler } from 'express';

import { signIn, signUp, signOut } from '../controllers/auth.controller.js';
const router = Router();

router.post('/sign-up', signUp as RequestHandler);
router.post('/sign-in', signIn as RequestHandler);
router.post('/sign-out', signOut as RequestHandler);

export default router;
