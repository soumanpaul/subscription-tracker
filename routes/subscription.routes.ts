import { Router} from 'express';
import authorize from '../middleware/auth.middleware.js';
import { createSubscription, getUserSubscriptions } from '../controllers/subscription.controller.js';

const router = Router();

router.get('/', (req, res) => {
    res.send({ title: 'GET all subscription' });
});

router.get('/user/:id', authorize, getUserSubscriptions);

router.post('/', authorize, createSubscription);

router.put('/:id', (req, res) => {
    res.send({ title: 'Update a subscription by ID' });
});

router.delete('/:id', (req, res) => {
    res.send({ title: 'Delete a subscription by ID' });
});

export default router;
