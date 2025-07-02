
'use server';

import { supabase } from '@/lib/db';

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

export async function getSettings(): Promise<SiteSettings> {
    const { data, error } = await supabase
        .from('settings')
        .select('key, value');

    if (error) {
        console.error('Error fetching settings:', error);
        return {
            maintenance_active: 'false',
            maintenance_start: null,
            maintenance_end: null,
            maintenance_message: null,
            contact_email: null,
            contact_phone: null,
            contact_twitter: null,
            contact_linkedin: null,
            contact_youtube: null,
            contact_facebook: null,
        };
    }

    const settings: any = {};
    (data || []).forEach(row => {
        settings[row.key] = row.value;
    });

    return {
        maintenance_active: settings.maintenance_active || 'false',
        maintenance_start: settings.maintenance_start,
        maintenance_end: settings.maintenance_end,
        maintenance_message: settings.maintenance_message,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        contact_twitter: settings.contact_twitter,
        contact_linkedin: settings.contact_linkedin,
        contact_youtube: settings.contact_youtube,
        contact_facebook: settings.contact_facebook,
    };
}

export async function updateSettings(settings: Partial<SiteSettings>): Promise<void> {
    const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value?.toString() || null
    }));

    for (const update of updates) {
        const { error } = await supabase
            .from('settings')
            .upsert(update, { onConflict: 'key' });

        if (error) {
            console.error('Error updating setting:', error);
            throw new Error(`Failed to update setting: ${update.key}`);
        }
    }
}

export async function isMaintenanceActive(): Promise<boolean> {
    const settings = await getSettings();
    
    if (settings.maintenance_active !== 'true') {
        return false;
    }

    const now = new Date();
    const startTime = settings.maintenance_start ? new Date(settings.maintenance_start) : null;
    const endTime = settings.maintenance_end ? new Date(settings.maintenance_end) : null;

    if (startTime && now < startTime) {
        return false;
    }

    if (endTime && now > endTime) {
        return false;
    }

    return true;
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
        const { data, error } = await supabase
            .from('site_settings')
            .select('key, value');
        
        if (error) {
            console.error("Failed to get site settings:", error);
            return defaultSettings;
        }
        
        const settings: Partial<SiteSettings> = {};
        for (const row of data || []) {
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
    try {
        const updates = Object.entries(settings).map(([key, value]) => ({
            key,
            value: String(value)
        }));

        const { error } = await supabase
            .from('site_settings')
            .upsert(updates, { onConflict: 'key' });

        if (error) {
            console.error("Failed to update site settings:", error);
            throw new Error("Database transaction for updating settings failed.");
        }
    } catch (error) {
        console.error("Failed to update site settings:", error);
        throw new Error("Database transaction for updating settings failed.");
    }
}
