import { describe, it, expect, beforeEach } from 'vitest';
import User from '../../src/models/user.model';
import usersService from '../../src/services/users.service';
import { mockUserData, mockUsers, createMockUser } from '../fixtures/data';

describe('Users Service', () => {
    describe('createUser', () => {
        it('should create a new user successfully', async () => {
            const token = await usersService.createUser(mockUserData);
            const user = await usersService.findByEmail(mockUserData.email);

            expect(token).toBeDefined();
            expect(user).toBeDefined();
            expect(user?.email).toBe(mockUserData.email);
            expect(user?.firstName).toBe(mockUserData.firstName);
            expect(user?.lastName).toBe(mockUserData.lastName);
            expect(user?._id).toBeDefined();
            expect(user?.createdAt).toBeDefined();
        });

        it('should hash the password before saving', async () => {
            await usersService.createUser(mockUserData);

            const user = await usersService.findByEmail(mockUserData.email);
            const dbUser = await User.findById(user?._id);

            expect(dbUser?.password).toBeDefined();
            expect(dbUser?.password).not.toBe(mockUserData.password);
            expect(dbUser?.password.length).toBeGreaterThan(20);
        });

        it('should throw error when creating user with duplicate email', async () => {
            await usersService.createUser(mockUserData);

            await expect(usersService.createUser(mockUserData)).rejects.toThrow(
                'User with this email already exists'
            );
        });
    });

    describe('findByEmail', () => {
        beforeEach(async () => {
            await usersService.createUser(mockUserData);
        });

        it('should find user by email', async () => {
            const user = await usersService.findByEmail(mockUserData.email);

            expect(user).toBeDefined();
            expect(user?.email).toBe(mockUserData.email);
            expect(user?.firstName).toBe(mockUserData.firstName);
        });

        it('should return null for non-existent email', async () => {
            const user = await usersService.findByEmail(
                'nonexistent@example.com'
            );

            expect(user).toBeNull();
        });

        it('should return user with password field', async () => {
            const user = await usersService.findByEmail(mockUserData.email);

            expect(user?.password).toBeDefined();
        });
    });

    describe('findById', () => {
        it('should find user by ID', async () => {
            await usersService.createUser(mockUserData);
            const user = await usersService.findByEmail(mockUserData.email);
            const foundUser = await usersService.findById(user!._id.toString());

            expect(foundUser).toBeDefined();
            expect(foundUser?._id.toString()).toBe(user?._id.toString());
            expect(foundUser?.email).toBe(mockUserData.email);
        });

        it('should return null for non-existent ID', async () => {
            const user = await usersService.findById(
                '507f1f77bcf86cd799439011'
            );

            expect(user).toBeNull();
        });

        it('should throw error for invalid ID format', async () => {
            await expect(usersService.findById('invalid-id')).rejects.toThrow(
                'Invalid user ID format'
            );
        });
    });

    describe('updateUser', () => {
        it('should update user successfully', async () => {
            await usersService.createUser(mockUserData);
            const createdUser = await usersService.findByEmail(
                mockUserData.email
            );

            const updates = {
                firstName: 'Jane',
                lastName: 'Smith',
            };

            const updatedUser = await usersService.updateUser(
                createdUser!._id.toString(),
                updates
            );

            expect(updatedUser).toBeDefined();
            expect(updatedUser?.firstName).toBe('Jane');
            expect(updatedUser?.lastName).toBe('Smith');
            expect(updatedUser?.email).toBe(mockUserData.email);
        });

        it('should not include password in update response', async () => {
            await usersService.createUser(mockUserData);
            const createdUser = await usersService.findByEmail(
                mockUserData.email
            );

            const updatedUser = await usersService.updateUser(
                createdUser!._id.toString(),
                { firstName: 'UpdatedName' }
            );

            expect(updatedUser?.password).toBeUndefined();
        });

        it('should return null for non-existent user', async () => {
            const result = await usersService.updateUser(
                '507f1f77bcf86cd799439011',
                { firstName: 'Test' }
            );

            expect(result).toBeNull();
        });

        it('should throw error for invalid ID format', async () => {
            await expect(
                usersService.updateUser('invalid-id', { firstName: 'Test' })
            ).rejects.toThrow('Invalid user ID format');
        });
    });

    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            await usersService.createUser(mockUserData);
            const createdUser = await usersService.findByEmail(
                mockUserData.email
            );

            const result = await usersService.deleteUser(
                createdUser!._id.toString()
            );

            expect(result).toBe(true);

            const deletedUser = await usersService.findById(
                createdUser!._id.toString()
            );
            expect(deletedUser).toBeNull();
        });

        it('should return false for non-existent user', async () => {
            const result = await usersService.deleteUser(
                '507f1f77bcf86cd799439011'
            );

            expect(result).toBe(false);
        });

        it('should throw error for invalid ID format', async () => {
            await expect(usersService.deleteUser('invalid-id')).rejects.toThrow(
                'Invalid user ID format'
            );
        });
    });
});
