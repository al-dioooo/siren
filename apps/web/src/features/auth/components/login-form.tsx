'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type LoginInput = {
  email: string;
  password: string;
};

const loginResolver: Resolver<LoginInput> = async (values) => {
  const email = typeof values.email === 'string' ? values.email.trim() : '';
  const password = typeof values.password === 'string' ? values.password : '';
  const errors: FieldErrors<LoginInput> = {};

  if (!email.includes('@')) {
    errors.email = { type: 'validate', message: 'Email tidak valid.' };
  }
  if (password.length < 1) {
    errors.password = { type: 'required', message: 'Password wajib diisi.' };
  }

  if (Object.keys(errors).length > 0) {
    return { values: {} as Record<string, never>, errors };
  }

  return { values: { email, password }, errors: {} };
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: loginResolver,
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setServerError(
        error.status === 429
          ? 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.'
          : 'Email atau password salah.',
      );
      return;
    }
    router.push(searchParams.get('next') ?? '/dashboard');
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="operator@siren.id" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && <p className="text-destructive text-sm">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Masuk…' : 'Masuk'}
        </Button>
      </form>
    </Form>
  );
}
