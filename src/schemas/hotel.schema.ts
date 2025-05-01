import { z } from "zod";

const createHotelSchema = z.object({
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
});

const createHotelSchemaSuccessResponse = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z
    .object({
      _id: z.string(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .merge(createHotelSchema),
});

const createHotelSchemaFailedResponse = z.object({
  success: z.literal(false),
  message: z.string(),
});

export type CreateHotelPayload = z.infer<typeof createHotelSchema>;
export type CreateHotelSchemaResponse =
  | z.infer<typeof createHotelSchemaSuccessResponse>
  | z.infer<typeof createHotelSchemaFailedResponse>;
