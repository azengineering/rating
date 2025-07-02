
'use server';

import { db } from '@/lib/db';

export interface SiteSettings {
    maintenance_active: 'true' | 'false';
    maintenance_start: string | null;
    maintenance_end: string | null;
    maintenance_message: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    contact_twitter: string | null;
    contact_linkedin: string | null;
    contact_youtube: string | null;
    contact_facebook: string | null;
}

const defaultSettings: SiteSettings = {
    maintenance_active: 'false',
    maintenance_start: null,
    maintenance_end: null,
    maintenance_message: 'The site is currently down for maintenance. We will be back shortly.',
    contact_email: 'support@politirate.com',
    contact_phone: null,
    contact_twitter: null,
    contact_linkedin: null,
    contact_youtube: null,
    contact_facebook: null,
};

/**
 * Retrieves all site settings from the database.
 * @returns A promise that resolves to an object containing all site settings.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
    try {
        const stmt = db.prepare('SELECT key, value FROM site_settings');
        const rows = stmt.all() as { key: string; value: string }[];
        
        const settings: Partial<SiteSettings> = {};
        for (const row of rows) {
            settings[row.key as keyof SiteSettings] = row.value as any;
        }
        
        // Merge with defaults to ensure all keys are present
        return { ...defaultSettings, ...settings };
    } catch (error) {
        // This might happen if the table doesn't exist on first run
        console.error("Failed to get site settings, returning defaults.", error);
        return defaultSettings;
    }
}

/**
 * Updates multiple site settings in a single transaction.
 * @param settings An object where keys are the setting names and values are the new values.
 * @returns A promise that resolves when the settings have been updated.
 */
export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
    const stmt = db.prepare(`
        INSERT INTO site_settings (key, value)
        VALUES (@key, @value)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const transaction = db.transaction((settingsToUpdate: Partial<SiteSettings>) => {
        for (const [key, value] of Object.entries(settingsToUpdate)) {
            stmt.run({ key, value: String(value) });
        }
    });

    try {
        transaction(settings);
    } catch (error) {
        console.error("Failed to update site settings:", error);
        throw new Error("Database transaction for updating settings failed.");
    }
}
