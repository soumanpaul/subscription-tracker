import mongoose from "mongoose";
import { env } from "../config/env.ts";

export const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(env.DB_URI);
    console.log(`Connected to MongoDB successfully in ${env.NODE_ENV} mode`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("MongoDB connection failed:", error.message);
    } else {
      console.error("MongoDB connection failed:", error);
    }
    process.exit(1);
  }
};

export default connectToDatabase;
