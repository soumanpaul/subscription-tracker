import { Router} from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.send({ title: 'GET all subscription' });
});

router.get('/:id', (req, res) => {
    res.send({ title: 'GET a subscription by ID' });
});

router.post('/', (req, res) => {
    res.send({ title: 'Create a new subscription' });
});

router.put('/:id', (req, res) => {
    res.send({ title: 'Update a subscription by ID' });
});

router.delete('/:id', (req, res) => {
    res.send({ title: 'Delete a subscription by ID' });
});

export default router;
