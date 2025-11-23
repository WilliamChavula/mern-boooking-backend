import { model, Schema, Types } from 'mongoose';
import { PermissionType } from './permission.model';

/**
 * Role names enum for type safety
 */
export enum RoleName {
    USER = 'user',
    ANONYMOUS = 'anonymous',
    HOTEL_STAFF = 'hotel_staff',
    HOTEL_ADMIN = 'hotel_admin',
    SUPER_ADMIN = 'super_admin',
}

/**
 * Role document type
 */
export type RoleType = {
    _id: string;
    name: RoleName;
    description: string;
    permissions: Types.ObjectId[] | PermissionType[];
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Role schema for MongoDB
 */
const roleSchema = new Schema<RoleType>(
    {
        name: {
            type: String,
            required: [true, 'Role name is required'],
            unique: true,
            enum: Object.values(RoleName),
            index: true,
        },
        description: {
            type: String,
            required: [true, 'Role description is required'],
            trim: true,
        },
        permissions: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Permission',
            },
        ],
    },
    { timestamps: true }
);

export const Role = model<RoleType>('Role', roleSchema);
