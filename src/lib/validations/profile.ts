import { z } from 'zod';

// Image validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Avatar file validation schema
export const avatarFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: 'File size must be less than 5MB',
  })
  .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
    message: 'Only .jpg, .jpeg, .png, .webp and .gif formats are supported',
  });

// Profile update schema
export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  avatar_url: z.string().url().nullable().optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
