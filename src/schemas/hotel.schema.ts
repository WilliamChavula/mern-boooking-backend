import { z } from "zod";

export const hotelParamsSchema = z.object({
  page: z.coerce.number().optional(),
  destination: z.string().optional(),
  adultCount: z.coerce.number().optional(),
  childCount: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),

  types: z.array(z.string()).or(z.string()).optional(),
  facilities: z.array(z.string()).or(z.string()).optional(),
  sort: z
    .enum(["pricePerNightAsc", "pricePerNightDesc", "starRating"])
    .default("starRating")
    .optional(),
  stars: z.array(z.coerce.number()).or(z.coerce.number()).optional(),
});

const hotelSchema = z.object({
  _id: z.string(),
  name: z
    .string({ message: "Name cannot be blank." })
    .min(3, "Name cannot be less than 3 characters.")
    .max(300, "Name cannot be more than 300 characters"),
  city: z
    .string({ message: "City cannot be blank." })
    .min(3, "City cannot be less than 3 characters.")
    .max(300, "City cannot be more than 300 characters"),
  country: z
    .string({ message: "Country cannot be blank." })
    .min(3, "Country cannot be less than 3 characters.")
    .max(300, "Country cannot be more than 300 characters"),
  description: z
    .string({ message: "Description cannot be blank." })
    .min(3, "Description cannot be less than 3 characters.")
    .max(300, "Description cannot be more than 300 characters"),
  type: z.string(),
  adultCount: z.coerce
    .number()
    .min(1, "Adult count cannot be less than 1")
    .default(1),
  childCount: z.coerce.number().default(0),
  pricePerNight: z.coerce.number().min(1),
  starRating: z.coerce
    .number()
    .min(1, "Rating cannot be less than 1")
    .max(5, "Rating cannot be more than 5"),
  userId: z.string().optional(),
  imageUrls: z.string().array().optional(),
  facilities: z.string().array().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const hotelSchemaSuccessResponse = z.object({
  success: z.literal(true),
  message: z.string(),
  data: hotelSchema,
});

const hotelSchemaSuccessPaginationResponse = z.object({
  success: z.literal(true),
  message: z.string(),
  pagination: z.object({
    pages: z.number(),
    total: z.number(),
    currentPage: z.number(),
    nextPage: z.number().nullable(),
  }),
  data: hotelSchema.array(),
});

const hotelSchemaErrorResponse = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z
    .object({
      message: z.string(),
      path: z.string().array(),
    })
    .array()
    .optional(),
});

export const paymentIntentSchema = z.object({
  numberOfNights: z
    .number({ message: "Length of Stay is required" })
    .min(1, "Length of Stay cannot be less than 1"),
});

export type PayMentIntentResponseSchema =
  | {
      success: true;
      message: string;
      data: {
        paymentIntentId: string;
        clientSecret: string;
        totalStayCost: number;
      };
    }
  | z.infer<typeof hotelSchemaErrorResponse>;

export type HotelParamsSchema = z.infer<typeof hotelParamsSchema>;
export type HotelSchemaPaginatedResponse =
  | z.infer<typeof hotelSchemaSuccessPaginationResponse>
  | z.infer<typeof hotelSchemaErrorResponse>;
export type HotelSchemaResponse =
  | z.infer<typeof hotelSchemaSuccessResponse>
  | z.infer<typeof hotelSchemaErrorResponse>;
export type PayMentIntentSchema = z.infer<typeof paymentIntentSchema>;
