import { z } from 'zod';

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'VITE_SUPABASE_ANON_KEY missing'),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  // Surface env errors loudly at startup. Bundler swaps import.meta.env at build,
  // so a missing key fails immediately on first load instead of silently breaking auth.
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables — see console.');
}

export const env = parsed.data;
