import { model, Schema, Types } from "mongoose";

export type UserType = {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
};

const userSchema = new Schema<UserType>(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
  },
  { timestamps: true },
);

const User = model<UserType>("User", userSchema);
export default User;
