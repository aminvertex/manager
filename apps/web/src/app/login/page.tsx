'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Brain } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';

const loginSchema = z.object({
  mobile: z
    .string()
    .min(11, 'شماره موبایل باید ۱۱ رقم باشد')
    .max(11, 'شماره موبایل باید ۱۱ رقم باشد')
    .regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.mobile, data.password);
      toast({ title: 'ورود موفق', description: 'به سیستم آماتیس خوش آمدید' });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'خطا در ورود به سیستم';
      toast({ title: 'خطا', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/90 to-primary items-center justify-center p-12">
        <div className="text-white text-center max-w-md">
          <Brain className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h1 className="text-4xl font-bold mb-4">آماتیس</h1>
          <p className="text-lg opacity-90 leading-relaxed">
            سیستم مدیریت عملکرد، تسک و کنترل کیفیت کارشناسان روانشناسی
          </p>
          <p className="mt-4 text-sm opacity-75">راشا آماتیس</p>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">آماتیس</span>
            </div>
            <CardTitle className="text-2xl">ورود به سیستم</CardTitle>
            <CardDescription>
              شماره موبایل و رمز عبور خود را وارد کنید
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">شماره موبایل</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="09123456789"
                  dir="ltr"
                  className="text-left"
                  {...register('mobile')}
                />
                {errors.mobile && (
                  <p className="text-sm text-destructive">{errors.mobile.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="رمز عبور"
                  dir="ltr"
                  className="text-left"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  'ورود'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
