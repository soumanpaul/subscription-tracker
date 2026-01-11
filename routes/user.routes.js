import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.send({ title: 'User route' });
});
router.get('/:id', (req, res) => {
    res.send({ title: 'User route' });
});
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
