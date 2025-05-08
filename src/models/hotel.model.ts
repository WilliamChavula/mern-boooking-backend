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

const BookingSchema = new Schema<BookingTypeSchema>({
  userId: { type: String, ref: "User" },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  adultCount: { type: Number, required: true, min: 1 },
  childCount: { type: Number, required: true, min: 0 },
  totalStayCost: { type: Number, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
});

const HotelSchema = new Schema<HotelType>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },
    adultCount: { type: Number, required: true },
    childCount: { type: Number, required: true },
    pricePerNight: { type: Number, required: true },
    starRating: { type: Number, required: true, min: 1, max: 5 },
    imageUrls: [{ type: String, required: true }],
    facilities: [{ type: String, required: true }],
    bookings: [BookingSchema],
  },
  { timestamps: true },
);

const Hotel = model<HotelType>("Hotel", HotelSchema);
export default Hotel;
