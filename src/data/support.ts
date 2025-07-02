
'use server';

import { db } from '@/lib/db';
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
    const stmt = db.prepare(`
        INSERT INTO support_tickets (id, user_id, user_name, user_email, subject, message, status, created_at, updated_at)
        VALUES (@id, @user_id, @user_name, @user_email, @subject, @message, 'open', @created_at, @updated_at)
    `);
    
    stmt.run({
        id: new Date().getTime().toString(),
        user_id: data.user_id,
        user_name: data.user_name,
        user_email: data.user_email,
        subject: data.subject,
        message: data.message,
        created_at: now,
        updated_at: now,
    });
}

export async function getSupportTickets(filters: { status?: TicketStatus, dateFrom?: string, dateTo?: string, searchQuery?: string } = {}): Promise<SupportTicket[]> {
    // --- Automated Deletion ---
    // Simulate a cron job that permanently deletes old, inactive tickets.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
        DELETE FROM support_tickets
        WHERE (status = 'in-progress' OR status = 'resolved' OR status = 'closed')
          AND updated_at < ?
    `).run(thirtyDaysAgo);

    // --- Fetch Remaining Tickets ---
    let query = 'SELECT * FROM support_tickets';
    const params: string[] = [];
    const conditions: string[] = [];

    if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
    }
    if (filters.dateFrom && filters.dateTo) {
        conditions.push('created_at >= ? AND created_at <= ?');
        params.push(filters.dateFrom, filters.dateTo);
    }
    if (filters.searchQuery) {
        conditions.push('(user_name LIKE ? OR user_email LIKE ?)');
        const searchTerm = `%${filters.searchQuery}%`;
        params.push(searchTerm, searchTerm);
    }


    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    // Order by most recently updated first
    query += ' ORDER BY updated_at DESC';

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(dbToTicket);
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus, adminNotes: string | null): Promise<void> {
    const stmt = db.prepare(`
        UPDATE support_tickets
        SET status = @status, 
            admin_notes = @admin_notes, 
            resolved_at = @resolved_at,
            updated_at = @updated_at
        WHERE id = @id
    `);
    
    stmt.run({
        id: ticketId,
        status: status,
        admin_notes: adminNotes,
        resolved_at: (status === 'resolved' || status === 'closed') ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
    });
}

export async function getSupportTicketStats(): Promise<SupportTicketStats> {
    const countsStmt = db.prepare(`
        SELECT
            status,
            COUNT(id) as count
        FROM support_tickets
        GROUP BY status
    `);
    const statusCounts = countsStmt.all() as { status: TicketStatus, count: number }[];

    const stats: Omit<SupportTicketStats, 'avgResolutionHours' | 'contact_email' | 'contact_phone' | 'contact_twitter' | 'contact_linkedin' | 'contact_youtube'> = {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
    };

    for (const row of statusCounts) {
        switch(row.status) {
            case 'open': stats.open = row.count; break;
            case 'in-progress': stats.inProgress = row.count; break;
            case 'resolved': stats.resolved = row.count; break;
            case 'closed': stats.closed = row.count; break;
        }
        stats.total += row.count;
    }

    const avgTimeStmt = db.prepare(`
        SELECT
            AVG(CAST(strftime('%s', resolved_at) - strftime('%s', created_at) AS REAL)) as avg_seconds
        FROM support_tickets
        WHERE status IN ('resolved', 'closed') AND resolved_at IS NOT NULL
    `);
    
    const result = avgTimeStmt.get() as { avg_seconds: number | null };
    const avgResolutionHours = result?.avg_seconds ? result.avg_seconds / 3600 : null;
    
    const settingsStmt = db.prepare("SELECT key, value FROM site_settings WHERE key LIKE 'contact_%'");
    const settingsRows = settingsStmt.all() as { key: string; value: string }[];
    const contactSettings: Partial<SupportTicketStats> = {};
     for (const row of settingsRows) {
        contactSettings[row.key as keyof SupportTicketStats] = row.value as any;
    }

    return { ...stats, avgResolutionHours, ...contactSettings as any };
}
