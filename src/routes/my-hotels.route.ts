import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

import type { Request, Response, Router } from "express";

import { createHotel, getMyHotels } from "../services/my-hotels.service";
import { verifyToken } from "../middleware/auth.middleware";

import {
  CreateHotelPayload,
  createHotelSchema,
  CreateHotelSchemaResponse,
  HotelsResponse,
} from "../schemas/hotel.schema";
import { ZodError } from "zod";
import { parseZodError } from "../utils/parse-zod-error";

const router: Router = express.Router();

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.post(
  "/",
  verifyToken,
  multerUpload.array("imageFiles", 6),
  async (
    req: Request<{}, {}, CreateHotelPayload>,
    res: Response<CreateHotelSchemaResponse>,
  ) => {
    try {
      const imageFiles = req.files as Express.Multer.File[];
      const newHotel = await createHotelSchema.parseAsync(req.body);

      // upload images to cloudinary
      const promises = imageFiles.map(async (image) => {
        const b64 = Buffer.from(image.buffer).toString("base64");
        const dataURI = `data:${image.mimetype};base64,${b64}`;
        const res = await cloudinary.uploader.upload(dataURI);

        return res.secure_url;
      });

      newHotel.imageUrls = await Promise.all(promises);
      newHotel.userId = req.user.userId;

      const hotel = await createHotel(newHotel);

      res.status(201).json({
        success: true,
        message: "Hotel created successfully",
        data: hotel,
      });

      return;
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

router.get(
  "/",
  verifyToken,
  async (req: Request, res: Response<HotelsResponse>) => {
    try {
      const hotels = await getMyHotels(req.user.userId);
      res.status(200).json({
        success: true,
        message: "Fetched hotels successfully",
        data: hotels,
      });
      return;
    } catch (e) {
      res.status(500).json({
        success: false,
        message: "Error fetching Hotels",
        data: [],
      });
    }
  },
);

export default router;
