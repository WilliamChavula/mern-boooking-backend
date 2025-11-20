import type { CreateUserSchema } from "../../src/schemas/users.schema";
import type { UserType } from "../../src/models/user.model";

export const mockUserData: CreateUserSchema = {
  email: "test@example.com",
  password: "Test123!@#",
  firstName: "John",
  lastName: "Doe",
};

export const mockUsers: CreateUserSchema[] = [
  {
    email: "john.doe@example.com",
    password: "Password123!",
    firstName: "John",
    lastName: "Doe",
  },
  {
    email: "jane.smith@example.com",
    password: "SecurePass456!",
    firstName: "Jane",
    lastName: "Smith",
  },
  {
    email: "bob.wilson@example.com",
    password: "BobPass789!",
    firstName: "Bob",
    lastName: "Wilson",
  },
];

export const mockHotelData = {
  userId: "507f1f77bcf86cd799439011",
  name: "Grand Plaza Hotel",
  city: "New York",
  country: "USA",
  description: "A luxurious hotel in the heart of Manhattan",
  type: "Luxury",
  adultCount: 2,
  childCount: 1,
  pricePerNight: 250,
  starRating: 5,
  imageUrls: [
    "https://example.com/hotel1.jpg",
    "https://example.com/hotel2.jpg",
  ],
  facilities: ["WiFi", "Pool", "Spa", "Gym", "Restaurant"],
};

export const mockHotels = [
  {
    ...mockHotelData,
    name: "Beachside Resort",
    city: "Miami",
    type: "Resort",
    pricePerNight: 300,
  },
  {
    ...mockHotelData,
    name: "City Center Inn",
    city: "Boston",
    type: "Business",
    pricePerNight: 150,
    starRating: 3,
  },
  {
    ...mockHotelData,
    name: "Mountain Lodge",
    city: "Denver",
    type: "Lodge",
    pricePerNight: 200,
    starRating: 4,
  },
];

export const mockBookingData = {
  userId: "507f1f77bcf86cd799439011",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  adultCount: 2,
  childCount: 1,
  totalStayCost: 750,
  checkIn: new Date("2025-12-01"),
  checkOut: new Date("2025-12-04"),
};

export const createMockUser = (overrides?: Partial<CreateUserSchema>) => ({
  ...mockUserData,
  ...overrides,
});

export const createMockHotel = (overrides?: Partial<typeof mockHotelData>) => ({
  ...mockHotelData,
  ...overrides,
});
