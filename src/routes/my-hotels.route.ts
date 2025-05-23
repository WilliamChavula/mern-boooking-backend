import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

import type { Request, Response, Router } from "express";

import {
  createHotel,
  getMyHotel,
  getMyHotels,
  updateHotel,
} from "../services/my-hotels.service";
import { verifyToken } from "../middleware/auth.middleware";

import {
  CreateHotelPayload,
  createHotelSchema,
  CreateHotelSchemaResponse,
  GetHotelResponse,
  hotelParams,
  HotelParams,
  HotelsResponse,
} from "../schemas/my-hotel.schema";
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

      newHotel.imageUrls = await uploadImages(imageFiles);
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

router.get(
  "/:hotelId",
  verifyToken,
  async (req: Request<HotelParams>, res: Response<GetHotelResponse>) => {
    try {
      const { hotelId } = await hotelParams.parseAsync(req.params);
      const userId = req.user.userId;

      const hotel = await getMyHotel(hotelId, userId);

      if (!hotel) {
        res.status(404).json({
          success: false,
          message: "No Hotel found with id: " + hotelId,
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: "Fetch hotel Successful",
        data: hotel,
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        message: "Something went wrong",
      });
    }
  },
);

router.put(
  "/:hotelId",
  verifyToken,
  multerUpload.array("imageFiles"),
  async (
    req: Request<HotelParams, {}, CreateHotelPayload>,
    res: Response<CreateHotelSchemaResponse>,
  ) => {
    try {
      const { hotelId } = await hotelParams.parseAsync(req.params);
      const userId = req.user.userId;

      const validHotel = await createHotelSchema.parseAsync(req.body);
      const updatedHotel = await updateHotel(hotelId, userId, validHotel);

      const imageFiles = req.files as Express.Multer.File[];
      const updatedUrls = await uploadImages(imageFiles);

      if (!updatedHotel) {
        res.status(404).send({
          success: false,
          message: "Hotel not found",
        });
        return;
      }

      updatedHotel.imageUrls = [
        ...updatedUrls,
        ...(updatedHotel.imageUrls || []),
      ];

      await updatedHotel.save();

      res.status(200).json({
        success: true,
        message: "Hotel updated successfully",
        data: updatedHotel,
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

async function uploadImages(imageFiles: Express.Multer.File[]) {
  // upload images to cloudinary
  const promises = imageFiles.map(async (image) => {
    const b64 = Buffer.from(image.buffer).toString("base64");
    const dataURI = `data:${image.mimetype};base64,${b64}`;
    const res = await cloudinary.uploader.upload(dataURI);

    return res.secure_url;
  });
  return await Promise.all(promises);
}

export default router;
