
import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from '@/context/language-context';
import { AuthProvider } from '@/context/auth-context';
import AdminMessageManager from '@/components/admin-message-manager';
import MaintenanceEnforcer from '@/components/maintenance-enforcer';
import NotificationBanner from '@/components/notification-banner';
import './globals.css';

export const metadata: Metadata = {
  title: 'PolitiRate',
  description: 'Rate and review political leaders.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <LanguageProvider>
          <AuthProvider>
            <MaintenanceEnforcer />
            <NotificationBanner />
            <AdminMessageManager />
            {children}
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
