import express from "express";
import type { Request, Response, Router } from "express";

import {
  constructSearchQuery,
  constructSortOptions,
  getAllHotels,
  getHotelCount,
} from "../services/hotels.service";
import {
  hotelParamsSchema,
  HotelParamsSchema,
  HotelSchemaResponse,
} from "../schemas/hotel.schema";
import { ZodError } from "zod";
import { parseZodError } from "../utils/parse-zod-error";

const router: Router = express.Router();

router.get(
  "/search",
  async (
    req: Request<{}, {}, {}, HotelParamsSchema>,
    res: Response<HotelSchemaResponse>,
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

export default router;
