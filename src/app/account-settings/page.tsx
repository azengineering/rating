'use client';

import Header from '@/components/header';
import Footer from '@/components/footer';
import { useLanguage } from '@/context/language-context';
import withAuth from '@/components/with-auth';
import { useAuth } from '@/context/auth-context';

function AccountSettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-secondary/50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-headline">{t('accountSettingsPage.title')}</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('myActivitiesPage.welcome').replace('{name}', user?.name || 'User')}
            </p>
             <p className="mt-4 text-lg text-muted-foreground">
              {t('accountSettingsPage.description')}
            </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default withAuth(AccountSettingsPage);
