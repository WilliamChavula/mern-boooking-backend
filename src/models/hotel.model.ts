import { model, Schema } from "mongoose";
import { BookingTypeSchema } from "../schemas/hotel.schema";

export type HotelType = {
  _id: string;
  userId: string;
  name: string;
  city: string;
  country: string;
  description: string;
  type: string;
  adultCount: number;
  childCount: number;
  pricePerNight: number;
  starRating: number;
  imageUrls: string[];
  facilities: string[];
  bookings: BookingTypeSchema[];
  createdAt: Date;
  updatedAt: Date;
};

const BookingSchema = new Schema<BookingTypeSchema>(
  {
    userId: {
      type: String,
      ref: "User",
      required: [true, 'User ID is required'],
      index: true,
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
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    adultCount: {
      type: Number,
      required: [true, 'Adult count is required'],
      min: [1, 'At least 1 adult is required'],
      max: [20, 'Maximum 20 adults allowed'],
    },
    childCount: {
      type: Number,
      required: [true, 'Child count is required'],
      min: [0, 'Child count cannot be negative'],
      max: [20, 'Maximum 20 children allowed'],
    },
    totalStayCost: {
      type: Number,
      required: [true, 'Total stay cost is required'],
      min: [0, 'Total cost cannot be negative'],
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
      index: true,
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
      validate: {
        validator: function(this: BookingTypeSchema, value: Date) {
          return value > this.checkIn;
        },
        message: 'Check-out date must be after check-in date',
      },
    },
  },
  { timestamps: true }
);

const HotelSchema = new Schema<HotelType>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
      minlength: [1, 'Hotel name cannot be empty'],
      maxlength: [200, 'Hotel name cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Hotel type is required'],
      trim: true,
      index: true,
    },
    adultCount: {
      type: Number,
      required: [true, 'Adult capacity is required'],
      min: [1, 'Adult capacity must be at least 1'],
      max: [50, 'Adult capacity cannot exceed 50'],
    },
    childCount: {
      type: Number,
      required: [true, 'Child capacity is required'],
      min: [0, 'Child capacity cannot be negative'],
      max: [50, 'Child capacity cannot exceed 50'],
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price cannot be negative'],
      index: true,
    },
    starRating: {
      type: Number,
      required: [true, 'Star rating is required'],
      min: [1, 'Minimum star rating is 1'],
      max: [5, 'Maximum star rating is 5'],
      index: true,
    },
    imageUrls: {
      type: [{ type: String, required: true }],
      validate: {
        validator: function(arr: string[]) {
          return arr.length > 0 && arr.length <= 10;
        },
        message: 'Hotel must have between 1 and 10 images',
      },
    },
    facilities: {
      type: [{ type: String, required: true }],
      validate: {
        validator: function(arr: string[]) {
          return arr.length > 0;
        },
        message: 'Hotel must have at least one facility',
      },
      index: true,
    },
    bookings: [BookingSchema],
  },
  { timestamps: true },
);

// Compound indexes for common query patterns
HotelSchema.index({ city: 1, country: 1 });
HotelSchema.index({ userId: 1, createdAt: -1 });
HotelSchema.index({ starRating: -1, pricePerNight: 1 });
HotelSchema.index({ type: 1, starRating: -1 });
HotelSchema.index({ 'bookings.userId': 1, 'bookings.checkIn': 1 });
HotelSchema.index({ createdAt: -1 });
HotelSchema.index({ updatedAt: -1 });

const Hotel = model<HotelType>("Hotel", HotelSchema);
export default Hotel;
