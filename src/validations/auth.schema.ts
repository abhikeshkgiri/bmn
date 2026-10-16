import { z } from 'zod';
import { normalizePhoneNumber } from '@/utils/phone';
import { OTP_CONFIG } from '@/constants/auth';

export const SendOtpSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number is too long')
    .refine(
      (phone) => {
        try {
          normalizePhoneNumber(phone);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid Indian mobile number format' }
    ),
});

export const VerifyOtpSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number is too long')
    .refine(
      (phone) => {
        try {
          normalizePhoneNumber(phone);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid Indian mobile number format' }
    ),
  otp: z
    .string()
    .length(OTP_CONFIG.LENGTH, `OTP must be exactly ${OTP_CONFIG.LENGTH} digits`)
    .regex(/^\d+$/, 'OTP must contain only digits'),
});

export type SendOtpInput = z.infer<typeof SendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
