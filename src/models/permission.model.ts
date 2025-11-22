import { model, Schema } from 'mongoose';

/**
 * Permission names enum for type safety
 */
export enum PermissionName {
    HOTELS_READ = 'hotels:read',
    HOTELS_CREATE = 'hotels:create',
    HOTELS_EDIT = 'hotels:edit',
    HOTELS_DELETE = 'hotels:delete',
    HOTELS_BOOK = 'hotels:book',
}

/**
 * Permission document type
 */
export type PermissionType = {
    _id: string;
    name: PermissionName;
    description: string;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Permission schema for MongoDB
 */
const permissionSchema = new Schema<PermissionType>(
    {
        name: {
            type: String,
            required: [true, 'Permission name is required'],
            unique: true,
            enum: Object.values(PermissionName),
            index: true,
        },
        description: {
            type: String,
            required: [true, 'Permission description is required'],
            trim: true,
        },
    },
    { timestamps: true }
);

export const Permission = model<PermissionType>('Permission', permissionSchema);
