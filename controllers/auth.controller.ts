import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from "express";
import { env } from '../config/env.js';
import UserModel from '../models/user.model.js';
import { HttpError } from '../errors/http-error.js'

export const signUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await mongoose.startSession(); 
    session.startTransaction(); 

    try{
        const {name, email, password } = req.body;
        const existingUser = await UserModel.findOne({email})
        if(existingUser) {
            const error = new HttpError("User already exists", 403)
            error.statusCode = 409;
            throw error;
        }
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt)
        const newUsers = await UserModel.create([{ name, email, password: hashPassword}], { session })
        const token = jwt.sign({ userId: newUsers[0]._id}, env.JWT_SECRET)
        // {expiresIn: env.JWT_EXPIRES_IN }
        
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                token,
                user: newUsers[0]
            }
        })
    } catch(error) {
        await session.abortTransaction()
        session.endSession()
        next(error)
    }
}

export const signIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try{
        const { email, password} = req.body;

        const user = await UserModel.findOne({email})

        if(!user) {
            const error =  new HttpError("User not found", 404);
            error.statusCode = 404;
            throw error;
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid) {
            const error = new HttpError("Invalid password", 401)
            error.statusCode = 401;
            throw error;
        }
        const token = jwt.sign({ userId: user._id}, env.JWT_SECRET)
        //  { expiresIn: env.JWT_EXPIRES_IN}

        res.status(200).json({
            success: true,
            message: "User signed in successfully",
            data: {
                token,
                user
            }
        })
    }catch (error) {
        next(error)
    }

}

export const signOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

}

