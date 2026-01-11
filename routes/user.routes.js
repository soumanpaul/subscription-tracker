import { Router } from 'express';
import { getUser, getUsers } from '../controllers/user.controller.js';
import authorize from '../middleware/auth.middleware.js';

const router = Router();

router.get('/' , getUsers);
router.get('/:id', getUser);

router.post('/', (req, res) => {
    res.send({ title: 'User route' });
});
router.put('/:id', (req, res) => {
    res.send({ title: 'User route' });
});
router.delete('/:id', (req, res) => {
    res.send({ title: 'User route' });
});

export default router;
