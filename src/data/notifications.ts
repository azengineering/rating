'use server';

import { supabase } from '@/lib/db';

export interface SiteNotification {
    id: string;
    message: string;
    startTime: string | null;
    endTime: string | null;
    isActive: boolean;
    createdAt: string;
    link: string | null;
}

const dbToNotification = (row: any): SiteNotification => ({
    id: row.id,
    message: row.message,
    startTime: row.start_time,
    endTime: row.end_time,
    isActive: row.is_active,
    createdAt: row.created_at,
    link: row.link,
});

export async function getNotifications(): Promise<SiteNotification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return (data || []).map(dbToNotification);
}

export async function getActiveNotifications(): Promise<SiteNotification[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .or(`start_time.is.null,start_time.lte.${now}`)
        .or(`end_time.is.null,end_time.gte.${now}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching active notifications:', error);
        return [];
    }

    return (data || []).map(dbToNotification);
}

type NotificationPayload = Omit<SiteNotification, 'id' | 'createdAt'>;

export async function addNotification(data: NotificationPayload): Promise<SiteNotification> {
    const id = new Date().getTime().toString();
    const createdAt = new Date().toISOString();

    const { error } = await supabase
        .from('notifications')
        .insert({
            id,
            message: data.message,
            start_time: data.startTime,
            end_time: data.endTime,
            is_active: data.isActive,
            created_at: createdAt,
            link: data.link,
        });

    if (error) {
        console.error('Error adding notification:', error);
        throw new Error('Failed to add notification');
    }

    return { id, ...data, createdAt };
}

export async function updateNotification(id: string, data: NotificationPayload): Promise<SiteNotification> {
    const { error } = await supabase
        .from('notifications')
        .update({
            message: data.message,
            start_time: data.startTime,
            end_time: data.endTime,
            is_active: data.isActive,
            link: data.link,
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating notification:', error);
        throw new Error('Failed to update notification');
    }

    const { data: updatedData, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError) {
        console.error('Error fetching updated notification:', fetchError);
        throw new Error('Failed to fetch updated notification');
    }

    return dbToNotification(updatedData);
}

export async function deleteNotification(id: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting notification:', error);
        throw new Error('Failed to delete notification');
    }
}