import { z } from 'zod';

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
  });

export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;

// Default export so the addon's auto-generated `_app_/` re-export
// (`export { default } from "..."`) resolves. See user-validation.ts for context.
export default { ChangePasswordSchema };
