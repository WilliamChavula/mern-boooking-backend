import Hotel, { HotelType } from "../models/hotel.model";
import {
  CreateBookingSchema,
  HotelParamsSchema,
} from "../schemas/hotel.schema";
import { FilterQuery, SortOrder } from "mongoose";

export const getAllHotels = async (
  q: Record<string, any>,
  skip: number,
  limit: number,
  sortBy: Partial<
    Record<"starRating" | "pricePerNightAsc" | "pricePerNightDesc", SortOrder>
  >,
) => {
  return Hotel.find(q).sort(sortBy).skip(skip).limit(limit);
};

export const getHotelById = async (hotelId: string) => {
  return Hotel.findById(hotelId);
};

export const getHotelCount = async (q: FilterQuery<HotelType>) =>
  Hotel.countDocuments(q);

export const constructSearchQuery = (params: HotelParamsSchema) => {
  let constructedQuery: FilterQuery<HotelType> = {};

  if (params.destination) {
    constructedQuery.$or = [
      { city: new RegExp(params.destination, "i") },
      { country: new RegExp(params.destination, "i") },
    ];
  }

  if (params.adultCount) {
    constructedQuery.adultCount = { $gte: params.adultCount };
  }

  if (params.childCount) {
    constructedQuery.childCount = { $gte: params.childCount };
  }

  if (params.maxPrice) {
    constructedQuery.pricePerNight = { $lte: params.maxPrice };
  }

  if (params.stars) {
    constructedQuery.starRating = {
      $in: Array.isArray(params.stars) ? params.stars : [params.stars],
    };
  }

  if (params.types) {
    constructedQuery.type = {
      $in: Array.isArray(params.types) ? params.types : [params.types],
    };
  }

  if (params.facilities) {
    constructedQuery.facilities = {
      $all: Array.isArray(params.facilities)
        ? params.facilities
        : [params.facilities],
    };
  }

  return constructedQuery;
};

export const constructSortOptions = (
  sortOptions: HotelParamsSchema["sort"],
) => {
  let options: Partial<Record<"starRating" | "pricePerNight", SortOrder>> = {};
  switch (sortOptions) {
    case "starRating":
      options = { starRating: -1 };
      break;
    case "pricePerNightAsc":
      options = { pricePerNight: 1 };
      break;
    case "pricePerNightDesc":
      options = { pricePerNight: -1 };
      break;
  }

  return options;
};

export const findHotelByIdAndUpdateBooking = async (
  hotelId: string,
  booking: CreateBookingSchema,
) => {
  return Hotel.findByIdAndUpdate(hotelId, {
    $push: { bookings: booking },
  }).lean();
};
