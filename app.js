import express from 'express';
import { PORT } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import subscriptionRouter from './routes/subscription.routes.js'
import connectToDatabase from './database/mongodb.js';
import errorMiddleware from './middleware/error.middleware.js';
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: false}))
app.use(cookieParser())

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/subscription', subscriptionRouter);

app.use(errorMiddleware);

app.get('/', (req, res) => {
    res.send('Hello World!' );
})
app.listen(PORT, async () => {
    console.log(`Subscription Tracker API is running on http://localhost:${PORT}`);
    await connectToDatabase();
})

export default app;
