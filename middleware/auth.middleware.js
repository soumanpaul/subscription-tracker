import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";
import UserModel from "../models/user.model.js";

const authorize = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization; 

    if (authHeader && authHeader.startsWith("Bearer ")) { 
      token = authHeader.split(" ")[1];
    }

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await UserModel.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized", error: error.message });
  }
};

export default authorize;
