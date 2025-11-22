import bcrypt from 'bcryptjs';

import { model, Schema, Types } from 'mongoose';
import type { RoleType } from './role.model';

export type UserType = {
    _id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Types.ObjectId | RoleType;
    createdAt: string;
    updatedAt: string;
};

const userSchema = new Schema<UserType>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
            index: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters long'],
        },
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            minlength: [1, 'First name cannot be empty'],
            maxlength: [50, 'First name cannot exceed 50 characters'],
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            minlength: [1, 'Last name cannot be empty'],
            maxlength: [50, 'Last name cannot exceed 50 characters'],
        },
        role: {
            type: Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, 'User role is required'],
            index: true,
        },
    },
    { timestamps: true }
);

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = model<UserType>('User', userSchema);
export default User;
