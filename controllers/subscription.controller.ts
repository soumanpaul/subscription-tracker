import { type NextFunction, type Request, type Response} from 'express';
import Subscription from '../models/subscription.model.js';
import { schedulerSubscriptionReminders } from '../workflows/subscriptionReminder.workflow.js';

export const createSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("ID...", req.user)
        const subscription = await Subscription.create({ ...req.body, user: req.user._id });
        
        // Trigger workflow scheduling
        await schedulerSubscriptionReminders(subscription._id.toString());
        
        res.status(201).json({ success: true, data: subscription})

    } catch(e) {
        next(e);
    }
}

export const getUserSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try{
        if(req.user.id !== req.params.id){
            const error = new Error("you are not the owner of this account");
            error.status = 401;
            throw error;
        }

        const subscriptions = await Subscription.find({ user: req.params.id})
        res.status(200).json({ success: true, data: subscriptions})

    } catch(e) {
        next()
    }
}