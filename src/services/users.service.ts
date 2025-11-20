import User from '../models/user.model';

import type { UserType } from '../models/user.model';
import type { CreateUserSchema } from '../schemas/users.schema';
import { logger } from '../utils/logger';

const findByEmail = async (email: string): Promise<UserType | null> => {
    return User.findOne({ email }).lean();
};

const findById = async (id: string): Promise<UserType | null> => {
    return User.findById<UserType>(id).select('-password').lean();
};

const createUser = async (user: CreateUserSchema): Promise<UserType | null> => {
    const registeredUser = await User.create(user);

    logger.info('User registered', {
        userId: registeredUser._id,
        email: registeredUser.email,
    });
    return registeredUser;
};

export default { findByEmail, findById, createUser };
