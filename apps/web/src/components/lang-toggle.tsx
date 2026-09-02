'use client';

import { useI18n } from '@/lib/i18n-context';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
      title={lang === 'fa' ? 'English' : 'فارسی'}
      className="gap-1"
    >
      <Languages className="h-4 w-4" />
      {lang === 'fa' ? 'EN' : 'فا'}
    </Button>
  );
}
