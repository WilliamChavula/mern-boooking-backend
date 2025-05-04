import Hotel from "../models/hotel.model";
import type { CreateHotelPayload } from "../schemas/my-hotel.schema";

export const createHotel = async (data: CreateHotelPayload) => {
  return Hotel.create(data);
};

export const getMyHotels = async (userId: string) => {
  return Hotel.find({ userId });
};

export const getMyHotel = async (hotelId: string, userId: string) => {
  return Hotel.findOne({ _id: hotelId, userId });
};

export const updateHotel = async (
  hotelId: string,
  userId: string,
  hotel: CreateHotelPayload,
) => {
  return Hotel.findOneAndUpdate({ _id: hotelId, userId }, hotel, { new: true });
};
