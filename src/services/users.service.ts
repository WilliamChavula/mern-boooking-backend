import mongoose from 'mongoose';
import User from '../models/user.model';
import type { UserType } from '../models/user.model';

import authService from '../services/auth.service';
import type { CreateUserSchema } from '../schemas/users.schema';
import { logger } from '../utils/logger';

/**
 * Finds a user by their email address
 * @param email - User's email address
 * @returns User object without password or null if not found
 * @throws Error if database query fails or email is invalid
 */
const findByEmail = async (email: string): Promise<UserType | null> => {
    try {
        logger.debug('Searching for user by email', { email });

        const user = await User.findOne({ email }).lean<UserType>().exec();

        if (!user) {
            logger.debug('No user found with email', {
                email,
            });

            return null;
        }

        logger.debug('User found by email', {
            userId: user._id,
            email,
        });

        return user;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Find user by email failed: Invalid email input', {
                error,
            });

            throw error;
        }

        logger.error('Database error while finding user by email', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to find user by email');
    }
};

/**
 * Finds a user by their ID
 * @param id - User's MongoDB ObjectId
 * @returns User object without password or null if not found
 * @throws Error if database query fails or ID is invalid
 */
const findById = async (id: string): Promise<UserType | null> => {
    try {
        // Validate MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            logger.error('Find user by ID failed: Invalid ObjectId format', {
                id,
            });
            throw new Error('Invalid user ID format');
        }

        logger.debug('Searching for user by ID', { userId: id });

        const user = await User.findById<UserType>(id)
            .select('-password')
            .lean<UserType>()
            .exec();

        if (!user) {
            logger.debug('No user found with ID', { userId: id });
            return null;
        }

        logger.debug('User found by ID', {
            userId: user._id,
            email: user.email,
        });

        return user;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Find user by email failed: Invalid email input', {
                error,
            });

            throw error;
        }

        logger.error('Database error while finding user by ID', {
            userId: id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to find user by ID');
    }
};

/**
 * Creates a new user in the database
 * @param user - User data to create
 * @returns Created user object
 * @throws Error if user creation fails or data is invalid
 */
const createUser = async (user: CreateUserSchema): Promise<string> => {
    try {
        const { email, firstName, lastName } = user;

        // Check if user already exists
        const existingUser = await User.findOne({ email }).lean().exec();

        if (existingUser) {
            const error = new Error('User with this email already exists');
            logger.warn('User creation failed: Email already registered', {
                email,
            });
            throw error;
        }

        logger.debug('Creating new user', {
            email,
            firstName,
            lastName,
        });

        // Create user with normalized email
        const registeredUser = await User.create({
            ...user,
            email,
        });

        if (!registeredUser) {
            logger.error('User creation failed: Database returned null');
            throw new Error('User creation returned null');
        }

        logger.info('User registered successfully', {
            userId: registeredUser._id,
        });

        const token = await authService.createAuthenticationToken({
            userId: registeredUser._id.toString(),
            email,
        });

        return token;
    } catch (error) {
        // Handle duplicate key error (11000)
        if (error instanceof Error && 'code' in error && error.code === 11000) {
            logger.warn('User creation failed: Duplicate email', {
                email: user.email,
            });
            throw new Error('User with this email already exists');
        }

        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('User creation failed: Invalid input data', {
                error,
            });
            throw error;
        }

        if (
            error instanceof Error &&
            error.message.includes('User with this email already exists')
        ) {
            logger.warn('User creation failed: Duplicate email');
            throw error;
        }

        logger.error('Database error while creating user', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to create user');
    }
};

/**
 * Updates a user's information
 * @param id - User's MongoDB ObjectId
 * @param updates - Partial user data to update
 * @returns Updated user object without password
 * @throws Error if update fails or user not found
 */
const updateUser = async (
    id: string,
    updates: Partial<
        Omit<UserType, '_id' | 'password' | 'createdAt' | 'updatedAt'>
    >
): Promise<UserType | null> => {
    try {
        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            logger.error('User update failed: Invalid ObjectId format', { id });
            throw new Error('Invalid user ID format');
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .select('-password')
            .lean<UserType>()
            .exec();

        if (!updatedUser) {
            logger.warn('User update failed: User not found', { userId: id });
            return null;
        }

        logger.info('User updated successfully', {
            userId: updatedUser._id,
        });

        return updatedUser;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('User update failed: Invalid input data', { error });
            throw error;
        }

        logger.error('Database error while updating user', {
            userId: id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to update user');
    }
};

/**
 * Deletes a user from the database
 * @param id - User's MongoDB ObjectId
 * @returns True if user was deleted, false if not found
 * @throws Error if deletion fails
 */
const deleteUser = async (id: string): Promise<boolean> => {
    try {
        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid user ID format');
            logger.error('User deletion failed: Invalid ObjectId format', {
                id,
            });
            throw error;
        }

        logger.info('Deleting user', { userId: id });

        const result = await User.findByIdAndDelete(id).exec();

        if (!result) {
            logger.warn('User deletion failed: User not found', { userId: id });
            return false;
        }

        logger.info('User deleted successfully', {
            userId: result._id,
        });

        return true;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('User deletion failed: Invalid ID input', { id });
            throw error;
        }

        logger.error('Database error while deleting user', {
            userId: id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to delete user');
    }
};

export default {
    findByEmail,
    findById,
    createUser,
    updateUser,
    deleteUser,
};
