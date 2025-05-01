import { Types } from "mongoose";
export type UserType = {
    _id: Types.ObjectId;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    updatedAt: string;
};
declare const User: import("mongoose").Model<UserType, {}, {}, {}, import("mongoose").Document<unknown, {}, UserType, {}> & UserType & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default User;
