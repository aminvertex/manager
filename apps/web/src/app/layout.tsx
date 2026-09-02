import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'آماتیس | سیستم مدیریت عملکرد',
  description: 'سیستم مدیریت عملکرد کارشناسان روانشناسی - راشا آماتیس',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
