
'use server';

import { supabase } from '@/lib/db';

// For a real app, passwords should be securely hashed.
// For this prototype, we'll store them as-is.
export interface User {
  id: string;
  email: string;
  password?: string;
  name?: string;
  gender?: 'male' | 'female' | 'other' | '';
  age?: number;
  state?: string;
  mpConstituency?: string;
  mlaConstituency?: string;
  panchayat?: string;
  createdAt?: string;
  isBlocked?: boolean | number;
  blockedUntil?: string | null;
  blockReason?: string | null;
  // These are optional because they are added by the query, not part of the core table schema
  ratingCount?: number; 
  leaderAddedCount?: number;
  unreadMessageCount?: number;
}

export interface AdminMessage {
    id: string;
    userId: string;
    message: string;
    isRead: boolean | number;
    createdAt: string;
}

export async function getUsers(searchTerm?: string): Promise<User[]> {
    try {
        let query = supabase.from('users').select(`
            *,
            ratings(count),
            leaders!leaders_added_by_user_id_fkey(count),
            admin_messages(count)
        `);

        if (searchTerm && searchTerm.trim() !== '') {
            const st = `%${searchTerm.trim()}%`;
            query = query.or(`name.ilike.${st},email.ilike.${st},id.ilike.${st}`);
        }
        
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return (data || []).map(user => {
            const cleanUser = { ...user };
            delete cleanUser.password;
            return cleanUser;
        });
    } catch (error) {
        console.error('Error in getUsers:', error);
        return [];
    }
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

    if (error) {
        return undefined;
    }

    return data || undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return undefined;
    }

    if (data) {
        delete data.password;
    }
    return data || undefined;
}

export async function addUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User | null> {
    const name = user.name || user.email.split('@')[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    const id = new Date().getTime().toString();
    const createdAt = new Date().toISOString();
    
    const newUser = {
        id,
        email: user.email.toLowerCase(),
        password: user.password || '',
        name: formattedName,
        is_blocked: false,
    };

    const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

    if (error) {
        console.error("Error adding user:", error);
        return null;
    }

    const createdUser = { ...data };
    delete createdUser.password;
    return createdUser;
}

export async function updateUserProfile(userId: string, profileData: Partial<User>): Promise<User | null> {
    const dataToUpdate = { ...profileData };
    delete dataToUpdate.id;
    delete dataToUpdate.email;
    delete dataToUpdate.password;
    delete dataToUpdate.createdAt;

    // Convert empty strings to null and handle age validation
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(dataToUpdate)) {
        if (key === 'age' && isNaN(Number(value))) {
            cleanedData[key] = null;
        } else {
            cleanedData[key] = value === '' ? null : value;
        }
    }

    const { error } = await supabase
        .from('users')
        .update(cleanedData)
        .eq('id', userId);

    if (error) {
        console.error("Error updating user profile:", error);
        return null;
    }

    return await findUserById(userId);
}

export async function getUserCount(filters?: { startDate?: string, endDate?: string, state?: string, constituency?: string }): Promise<number> {
    let query = supabase.from('users').select('*', { count: 'exact', head: true });

    if (filters?.startDate && filters?.endDate) {
        query = query.gte('created_at', filters.startDate).lte('created_at', filters.endDate);
    }
    if (filters?.state) {
        query = query.eq('state', filters.state);
    }
    if (filters?.constituency) {
        const searchTerm = `%${filters.constituency}%`;
        query = query.or(`mp_constituency.ilike.${searchTerm},mla_constituency.ilike.${searchTerm},panchayat.ilike.${searchTerm}`);
    }
    
    const { count, error } = await query;
    
    if (error) {
        console.error('Error getting user count:', error);
        return 0;
    }
    
    return count || 0;
}

// --- Admin Moderation Functions ---

export async function blockUser(userId: string, reason: string, blockedUntil: string | null): Promise<void> {
    const { error } = await supabase
        .from('users')
        .update({
            is_blocked: true,
            block_reason: reason,
            blocked_until: blockedUntil
        })
        .eq('id', userId);

    if (error) {
        console.error('Error blocking user:', error);
        throw new Error('Failed to block user');
    }
}

export async function unblockUser(userId: string): Promise<void> {
    const { error } = await supabase
        .from('users')
        .update({
            is_blocked: false,
            block_reason: null,
            blocked_until: null
        })
        .eq('id', userId);

    if (error) {
        console.error('Error unblocking user:', error);
        throw new Error('Failed to unblock user');
    }
}

export async function addAdminMessage(userId: string, message: string): Promise<void> {
    const { error } = await supabase
        .from('admin_messages')
        .insert({
            id: new Date().getTime().toString(),
            userId: userId,
            message: message,
            createdAt: new Date().toISOString(),
            isRead: false
        });

    if (error) {
        console.error('Error adding admin message:', error);
        throw new Error('Failed to add admin message');
    }
}

export async function getAdminMessages(userId: string): Promise<AdminMessage[]> {
    const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching admin messages:', error);
        return [];
    }

    return data || [];
}

export async function getUnreadMessages(userId: string): Promise<AdminMessage[]> {
    const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('userId', userId)
        .eq('isRead', false)
        .order('createdAt', { ascending: true });

    if (error) {
        console.error('Error fetching unread messages:', error);
        return [];
    }

    return data || [];
}

export async function markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
        .from('admin_messages')
        .update({ isRead: true })
        .eq('id', messageId);

    if (error) {
        console.error('Error marking message as read:', error);
        throw new Error('Failed to mark message as read');
    }
}

export async function deleteAdminMessage(messageId: string): Promise<void> {
    const { error } = await supabase
        .from('admin_messages')
        .delete()
        .eq('id', messageId);

    if (error) {
        console.error('Error deleting admin message:', error);
        throw new Error('Failed to delete admin message');
    }
}
