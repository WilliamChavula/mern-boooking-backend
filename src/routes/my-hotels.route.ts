import type { Request, Response, Router } from "express";
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import type {
  CreateHotelPayload,
  CreateHotelSchemaResponse,
} from "../schemas/hotel.schema";
import { createHotel } from "../services/my-hotels.service";

const router: Router = express.Router();

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.post(
  "/",
  multerUpload.array("imageFiles", 6),
  async (
    req: Request<{}, {}, CreateHotelPayload>,
    res: Response<CreateHotelSchemaResponse>,
  ) => {
    try {
      const imageFiles = req.files as Express.Multer.File[];
      const newHotel = req.body;

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
      console.log("Error creating Hotels", e);
      res.status(500).send({
        success: false,
        message: "Something went wrong",
      });
    }
  },
);
