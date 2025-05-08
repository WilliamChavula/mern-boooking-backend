import express from "express";
import { Request, Response, Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { findBookingsByUserId } from "../services/hotels.service";
import { HotelSchema, UserBookingResponse } from "../schemas/hotel.schema";

const router: Router = express.Router();

router.get(
  "/",
  verifyToken,
  async (req: Request, res: Response<UserBookingResponse>) => {
    try {
      const { userId } = req.user;

      const bookings: HotelSchema[] = await findBookingsByUserId(userId);

      res.status(200).json({
        success: true,
        message: "User bookings fetched successfully",
        data: bookings,
      });
    } catch (e) {
      console.log("Unable to get bookings", e);
      res.status(500).send({
        success: false,
        message: "Something went wrong",
      });
    }
  },
);

export default router;
