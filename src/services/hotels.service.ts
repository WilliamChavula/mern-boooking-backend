import Hotel from "../models/hotel.model";

export const getAllHotels = async (skip: number, limit: number) => {
  return Hotel.find().skip(skip).limit(limit);
};

export const getHotelCount = async () => Hotel.countDocuments();
