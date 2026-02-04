import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * User interface
 */
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User schema
 */
const userSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, "User Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "User Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Please fill a valid email address"],
    },
    password: {
      type: String,
      required: [true, "User Password is required"],
      minlength: 6,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * User model
 */
const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default UserModel;
