import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken';
import { JWT_EXPIRES_IN } from '../config/env';

// what is a req body ? req.body is an object containing data from the client
export const signUp = async (req, res, next) => {
    const session = await mongoose.startSession(); // mongoose transaction for Atomic Operations
    session.startTransaction(); 

    try{
        // Logic to create a new user
        const {name, email, password } = req.body;
        // check if a user already exists
        const existingUser = await User.findOne({email})

        if(existingUser) {
            const error = new Error("User already exists")
            error.statusCode = 409;
            throw error;
        }

        // hash password
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt)
        const newUsers = await user.create([{ name, email, password: hashPassword}], { session })
        const token = jwt.sign({ userId: newUsers[0]._id}, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN })
        
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
    }
}

export const signIn = async (req, res, next) => {
    // implement signup logic

}

export const signOut = async (req, res, next) => {
    // implement signup logic


}

