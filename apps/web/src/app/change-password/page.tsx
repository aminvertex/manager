'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'رمز عبور فعلی الزامی است'),
    newPassword: z.string().min(8, 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد'),
    confirmPassword: z.string().min(1, 'تکرار رمز عبور الزامی است'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'رمز عبور و تکرار آن یکسان نیستند',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      await refreshUser();
      toast({ title: 'موفق', description: 'رمز عبور با موفقیت تغییر کرد' });
      router.push('/dashboard');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'خطا در تغییر رمز عبور';
      toast({ title: 'خطا', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <KeyRound className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle>تغییر رمز عبور</CardTitle>
          <CardDescription>
            برای امنیت حساب، لطفاً رمز عبور جدید تعیین کنید
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
              <Input
                id="currentPassword"
                type="password"
                dir="ltr"
                className="text-left"
                {...register('currentPassword')}
              />
              {errors.currentPassword && (
                <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">رمز عبور جدید</Label>
              <Input
                id="newPassword"
                type="password"
                dir="ltr"
                className="text-left"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
              <Input
                id="confirmPassword"
                type="password"
                dir="ltr"
                className="text-left"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                'تغییر رمز عبور'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
