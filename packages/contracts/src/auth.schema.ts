import { z } from "zod";

export const RegisterUserSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must not exceed 100 characters"),
});

export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>;

export const LoginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginUserDTO = z.infer<typeof LoginUserSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export type UserProfileDTO = z.infer<typeof UserProfileSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: UserProfileSchema,
});

export type AuthResponseDTO = z.infer<typeof AuthResponseSchema>;

export const JwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().email().optional(),
});

export type JwtPayloadDTO = z.infer<typeof JwtPayloadSchema>;

