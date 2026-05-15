import type z from 'zod';
import type { IntlService } from 'ember-intl';
export declare const createTodoValidationSchema: (intl: IntlService) => z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    completed: z.ZodOptional<z.ZodBoolean>;
    id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const editTodoValidationSchema: (intl: IntlService) => z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    completed: z.ZodOptional<z.ZodBoolean>;
    id: z.ZodString;
}, z.core.$strip>;
export type ValidatedTodo = z.infer<ReturnType<typeof createTodoValidationSchema>>;
export type UpdatedTodo = z.infer<ReturnType<typeof editTodoValidationSchema>>;
//# sourceMappingURL=todo-validation.d.ts.map