
'use server';

import { supabase } from '@/lib/db';
import type { User } from './users';

export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

export interface SupportTicket {
    id: string;
    user_id: string | null;
    user_name: string;
    user_email: string;
    subject: string;
    message: string;
    status: TicketStatus;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    admin_notes: string | null;
}

export interface SupportTicketStats {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    avgResolutionHours: number | null;
    contact_email: string | null;
    contact_phone: string | null;
    contact_twitter: string | null;
    contact_linkedin: string | null;
    contact_youtube: string | null;
}

const dbToTicket = (row: any): SupportTicket => ({
    ...row,
    resolved_at: row.resolved_at || null,
    admin_notes: row.admin_notes || null,
});

export async function createSupportTicket(data: Omit<SupportTicket, 'id' | 'status' | 'created_at' | 'resolved_at' | 'admin_notes' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();
    
    const { error } = await supabase
        .from('support_tickets')
        .insert({
            id: new Date().getTime().toString(),
            user_id: data.user_id,
            user_name: data.user_name,
            user_email: data.user_email,
            subject: data.subject,
            message: data.message,
            status: 'open',
            created_at: now,
            updated_at: now,
        });

    if (error) {
        console.error('Error creating support ticket:', error);
        throw new Error('Failed to create support ticket');
    }
}

export async function getSupportTickets(filters: { status?: TicketStatus, dateFrom?: string, dateTo?: string, searchQuery?: string } = {}): Promise<SupportTicket[]> {
    // --- Automated Deletion ---
    // Simulate a cron job that permanently deletes old, inactive tickets.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    await supabase
        .from('support_tickets')
        .delete()
        .in('status', ['in-progress', 'resolved', 'closed'])
        .lt('updated_at', thirtyDaysAgo);

    let query = supabase.from('support_tickets').select('*');

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    if (filters.dateFrom && filters.dateTo) {
        query = query.gte('created_at', filters.dateFrom).lte('created_at', filters.dateTo);
    }

    if (filters.searchQuery) {
        const searchTerm = `%${filters.searchQuery}%`;
        query = query.or(`user_name.ilike.${searchTerm},user_email.ilike.${searchTerm},subject.ilike.${searchTerm}`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching support tickets:', error);
        return [];
    }

    return (data || []).map(dbToTicket);
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus, adminNotes: string | null): Promise<void> {
    const updateData: any = {
        status: status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
    };

    if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

    if (error) {
        console.error('Error updating ticket status:', error);
        throw new Error('Failed to update ticket status');
    }
}

export async function getSupportTicketStats(): Promise<SupportTicketStats> {
    // Get status counts
    const { data: statusData, error: statusError } = await supabase
        .from('support_tickets')
        .select('status')
        .order('status');

    if (statusError) {
        console.error('Error fetching ticket stats:', statusError);
        return {
            total: 0,
            open: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0,
            avgResolutionHours: null,
            contact_email: null,
            contact_phone: null,
            contact_twitter: null,
            contact_linkedin: null,
            contact_youtube: null,
        };
    }

    const stats = {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
    };

    for (const ticket of statusData || []) {
        stats.total++;
        switch (ticket.status) {
            case 'open':
                stats.open++;
                break;
            case 'in-progress':
                stats.inProgress++;
                break;
            case 'resolved':
                stats.resolved++;
                break;
            case 'closed':
                stats.closed++;
                break;
        }
    }

    // Calculate average resolution time
    const { data: resolvedTickets } = await supabase
        .from('support_tickets')
        .select('created_at, resolved_at')
        .not('resolved_at', 'is', null);

    let avgResolutionHours: number | null = null;
    if (resolvedTickets && resolvedTickets.length > 0) {
        const totalHours = resolvedTickets.reduce((sum, ticket) => {
            const created = new Date(ticket.created_at);
            const resolved = new Date(ticket.resolved_at!);
            return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        avgResolutionHours = Math.round(totalHours / resolvedTickets.length);
    }

    // Get contact settings
    const { data: settings } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['contact_email', 'contact_phone', 'contact_twitter', 'contact_linkedin', 'contact_youtube']);

    const contactSettings: any = {};
    for (const setting of settings || []) {
        contactSettings[setting.key] = setting.value;
    }

    return {
        ...stats,
        avgResolutionHours,
        contact_email: contactSettings.contact_email || null,
        contact_phone: contactSettings.contact_phone || null,
        contact_twitter: contactSettings.contact_twitter || null,
        contact_linkedin: contactSettings.contact_linkedin || null,
        contact_youtube: contactSettings.contact_youtube || null,
    };
}
