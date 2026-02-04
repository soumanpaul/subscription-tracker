import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import UserModel from "../models/user.model";

interface JwtPayload {
  userId: string;
}

const authorize = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const decoded = jwt.verify(
      token,
      env.JWT_SECRET
    ) as JwtPayload;

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized",
      error: error instanceof Error ? error.message : "Invalid token",
    });
  }
};

export default authorize;
