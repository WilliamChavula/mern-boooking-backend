import express from "express";
import type { Request, Response, Router } from "express";
import { ZodError } from "zod";
import Stripe from "stripe";

import {
  constructSearchQuery,
  constructSortOptions,
  findHotelByIdAndUpdateBooking,
  getAllHotels,
  getHotelById,
  getHotelCount,
  getLatestHotels,
} from "../services/hotels.service";

import {
  hotelParamsSchema,
  HotelParamsSchema,
  HotelSchemaPaginatedResponse,
  HotelSchemaResponse,
  createBookingSchema,
  CreateBookingSchema,
  PaymentIntentResponseSchema,
  paymentIntentSchema,
  PaymentIntentSchema,
  CreateBookingResponseSchema,
  GetAllHotelsResponseSchema,
} from "../schemas/hotel.schema";
import { hotelParams, HotelParams } from "../schemas/my-hotel.schema";

import { parseZodError } from "../utils/parse-zod-error";
import { config } from "../config";
import { verifyToken } from "../middleware/auth.middleware";

const stripe = new Stripe(config.STRIPE_SECRET_KEY);

const router: Router = express.Router();

router.get(
  "/search",
  async (
    req: Request<{}, {}, {}, HotelParamsSchema>,
    res: Response<HotelSchemaPaginatedResponse>,
  ) => {
    try {
      const pageSize = 5;
      const params = await hotelParamsSchema.parseAsync(req.query);

      const q = constructSearchQuery(params);

      const pageNumber = params.page ? params.page : 1;
      const skip = (pageNumber - 1) * pageSize;
      const sortBy = constructSortOptions(params.sort);

      const hotels = await getAllHotels(q, skip, pageSize, sortBy);
      const totalHotelCount = await getHotelCount(q);

      const pagesCount = Math.ceil(totalHotelCount / pageSize);

      res.status(200).json({
        success: true,
        message: "Search Hotels Success",
        pagination: {
          total: totalHotelCount,
          pages: pagesCount,
          currentPage: pageNumber,
          nextPage: pageNumber + 1 <= pagesCount ? pageNumber + 1 : null,
        },
        data: hotels,
      });
    } catch (e) {
      console.log("Unknown error occurred. ", e);

      if (e instanceof ZodError) {
        const issues = parseZodError(e);

        res.status(400).send({
          success: false,
          message: "Failed to create user",
          error: issues,
        });
        return;
      }
      res
        .status(500)
        .json({ success: false, message: "Something went wrong." });
    }
  },
);

router.get(
  "/",
  async (_req: Request, res: Response<GetAllHotelsResponseSchema>) => {
    try {
      const hotels = await getLatestHotels();

      if (!hotels) {
        res.status(404).send({
          success: false,
          message: "No hotels found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Hotels fetched successfully",
        data: hotels,
      });
    } catch (e) {
      console.log("Unknown error occurred. ", e);
      res
        .status(500)
        .json({ success: false, message: "Something went wrong." });
    }
  },
);

router.get(
  "/:hotelId",
  async (req: Request<HotelParams>, res: Response<HotelSchemaResponse>) => {
    try {
      const { hotelId } = await hotelParams.parseAsync(req.params);
      const hotel = await getHotelById(hotelId);

      if (!hotel) {
        res.status(404).send({
          success: false,
          message: "No hotel found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Hotel fetched successfully",
        data: hotel,
      });
    } catch (e) {
      if (e instanceof ZodError) {
        const issues = parseZodError(e);

        res.status(400).json({
          success: false,
          message: "Failed to create a hotel.",
          error: issues,
        });
      }
      console.log("Error creating Hotels", e);
      res.status(500).send({
        success: false,
        message: "Something went wrong",
      });
    }
  },
);

router.post(
  "/:hotelId/bookings/payment-intent",
  verifyToken,
  async (
    req: Request<HotelParams, {}, PaymentIntentSchema>,
    res: Response<PaymentIntentResponseSchema>,
  ) => {
    try {
      const { userId } = req.user;
      const { hotelId } = await hotelParams.parseAsync(req.params);
      const { numberOfNights } = await paymentIntentSchema.parseAsync(req.body);

      const hotel = await getHotelById(hotelId);

      if (!hotel) {
        res.status(404).json({
          success: false,
          message: "hotel not found",
        });
        return;
      }
      const totalStayCost = hotel.pricePerNight * numberOfNights;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalStayCost * 100,
        currency: "usd",
        metadata: {
          hotelId,
          userId,
        },
      });

      if (!paymentIntent.client_secret) {
        res.status(500).json({
          success: false,
          message: "Error processing your payment",
        });
        return;
      }

      const response = {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        totalStayCost,
      };

      res.status(200).json({
        success: true,
        message: "Payment intent created successfully",
        data: response,
      });
    } catch (e) {
      console.log("Unknown error occurred. ", e);

      if (e instanceof ZodError) {
        const issues = parseZodError(e);

        res.status(400).send({
          success: false,
          message: "Failed to create user",
          error: issues,
        });
        return;
      }
      res
        .status(500)
        .json({ success: false, message: "Something went wrong." });
    }
  },
);

router.post(
  "/:hotelId/bookings",
  verifyToken,
  async (
    req: Request<HotelParams, {}, CreateBookingSchema>,
    res: Response<CreateBookingResponseSchema>,
  ) => {
    try {
      const { userId } = req.user;
      const { hotelId } = await hotelParams.parseAsync(req.params);
      const data = await createBookingSchema.parseAsync(req.body);

      const paymentIntent = await stripe.paymentIntents.retrieve(
        data.paymentIntentId,
      );

      if (!paymentIntent) {
        res.status(400).json({
          success: false,
          message: "Payment intent not found",
        });
        return;
      }

      if (
        paymentIntent.metadata.hotelId !== hotelId ||
        paymentIntent.metadata.userId !== userId
      ) {
        res.status(400).json({
          success: false,
          message: "Payment intent mismatched",
        });
        return;
      }

      if (paymentIntent.status !== "succeeded") {
        res.status(400).json({
          success: false,
          message: `Processing payment failed. Status: ${paymentIntent.status}`,
        });
        return;
      }

      const hotel = await findHotelByIdAndUpdateBooking(hotelId, {
        ...data,
        userId,
      });

      if (!hotel) {
        res.status(404).json({
          success: false,
          message: "hotel not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Booking created successfully",
      });
    } catch (e) {
      console.log("Unknown error occurred. ", e);

      if (e instanceof ZodError) {
        const issues = parseZodError(e);

        res.status(400).send({
          success: false,
          message: "Failed to create user",
          error: issues,
        });
        return;
      }
      res
        .status(500)
        .json({ success: false, message: "Something went wrong." });
    }
  },
);

export default router;
