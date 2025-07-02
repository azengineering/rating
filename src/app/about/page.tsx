'use client';

import Header from '@/components/header';
import Footer from '@/components/footer';
import { useLanguage } from '@/context/language-context';

export default function AboutPage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">{t('aboutPage.title')}</h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
                {t('aboutPage.mission')}
            </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
