
import { Wrench } from 'lucide-react';
import { getSiteSettings } from '@/data/settings';
import Link from 'next/link';

export default async function MaintenancePage() {
    const settings = await getSiteSettings();
    const message = settings.maintenance_message || "The site is currently down for planned maintenance. We'll be back online shortly. Thank you for your patience.";

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-secondary text-center p-6">
            <main className="flex-grow flex items-center justify-center">
                <div className="max-w-xl">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-6">
                        <Wrench className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold font-headline text-foreground">Under Maintenance</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        {message}
                    </p>
                </div>
            </main>
            <footer className="w-full py-4 text-center text-muted-foreground text-sm">
                <p>
                  © {new Date().getFullYear()} PolitiRate. All rights reserved.
                  <Link href="/admin/login" className="ml-2 text-primary hover:underline" aria-label="Admin Panel">...</Link>
                </p>
            </footer>
        </div>
    );
}
