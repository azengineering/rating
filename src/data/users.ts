
'use server';

import { db } from '@/lib/db';
import type { RunResult } from 'better-sqlite3';

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
    let query = `
        SELECT
            u.*,
            (SELECT COUNT(*) FROM ratings WHERE userId = u.id) as ratingCount,
            (SELECT COUNT(*) FROM leaders WHERE addedByUserId = u.id) as leaderAddedCount,
            (SELECT COUNT(*) FROM admin_messages WHERE userId = u.id AND isRead = 0) as unreadMessageCount
        FROM users u
    `;
    const params: string[] = [];

    if (searchTerm && searchTerm.trim() !== '') {
        query += ' WHERE u.name LIKE ? OR u.email LIKE ? OR u.id LIKE ?';
        const st = `%${searchTerm.trim()}%`;
        params.push(st, st, st);
    }
    
    query += ' ORDER BY u.createdAt DESC';

    const stmt = db.prepare(query);
    const users = stmt.all(...params) as User[];
    
    return Promise.resolve(users.map(u => {
        delete u.password;
        return u;
    }));
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get(email.toLowerCase()) as User | undefined;
  return Promise.resolve(user);
}

export async function findUserById(id: string): Promise<User | undefined> {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id) as User | undefined;
  if (user) {
    delete user.password;
  }
  return Promise.resolve(user);
}

export async function addUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User | null> {
  const name = user.name || user.email.split('@')[0];
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
  const id = new Date().getTime().toString();
  const createdAt = new Date().toISOString();
  
  const newUser: User = {
    ...user,
    id,
    name: formattedName,
    createdAt,
    isBlocked: 0,
    blockedUntil: null,
    blockReason: null,
  };

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password, name, createdAt, isBlocked, blockedUntil, blockReason)
    VALUES (@id, @email, @password, @name, @createdAt, @isBlocked, @blockedUntil, @blockReason)
  `);

  try {
    stmt.run({
        id: newUser.id,
        email: newUser.email.toLowerCase(),
        password: newUser.password || '', // Use empty string for password-less social logins
        name: newUser.name,
        createdAt: newUser.createdAt,
        isBlocked: newUser.isBlocked,
        blockedUntil: newUser.blockedUntil,
        blockReason: newUser.blockReason,
    });
    
    const createdUser: Partial<User> = { ...newUser };
    delete createdUser.password;
    return Promise.resolve(createdUser as User);

  } catch (error) {
    console.error("Error adding user:", error);
    return Promise.resolve(null);
  }
}

export async function updateUserProfile(userId: string, profileData: Partial<User>): Promise<User | null> {
    const dataToUpdate = { ...profileData };
    delete dataToUpdate.id; // Cannot update ID
    delete dataToUpdate.email; // Cannot update email
    delete dataToUpdate.password; // Password updated elsewhere
    delete dataToUpdate.createdAt; // Cannot update creation date

    const setClauses = Object.keys(dataToUpdate).map(key => `${key} = @${key}`).join(', ');
    
    if (!setClauses) {
        // Nothing to update
        return findUserById(userId).then(user => user || null);
    }
    
    const stmt = db.prepare(`UPDATE users SET ${setClauses} WHERE id = @id`);

    try {
        const params: { [key: string]: any } = { id: userId };
        for (const [key, value] of Object.entries(dataToUpdate)) {
            // Handle empty strings from form to be stored as null
            params[key] = value === '' ? null : value;
             if (key === 'age' && isNaN(Number(value))) {
                 params[key] = null;
             }
        }
        
        stmt.run(params);

        const updatedUser = await findUserById(userId);
        return Promise.resolve(updatedUser || null);
    } catch (error) {
        console.error("Error updating user profile:", error);
        return Promise.resolve(null);
    }
}

export async function getUserCount(filters?: { startDate?: string, endDate?: string, state?: string, constituency?: string }): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM users';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (filters?.startDate && filters?.endDate) {
        conditions.push('createdAt >= ? AND createdAt <= ?');
        params.push(filters.startDate, filters.endDate);
    }
    if (filters?.state) {
        conditions.push('state = ?');
        params.push(filters.state);
    }
    if (filters?.constituency) {
        conditions.push('(mpConstituency LIKE ? OR mlaConstituency LIKE ? OR panchayat LIKE ?)');
        const searchTerm = `%${filters.constituency}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const { count } = db.prepare(query).get(...params) as { count: number };
    return Promise.resolve(count);
}

// --- Admin Moderation Functions ---

export async function blockUser(userId: string, reason: string, blockedUntil: string | null): Promise<void> {
    const stmt = db.prepare(`
        UPDATE users
        SET isBlocked = 1, blockReason = ?, blockedUntil = ?
        WHERE id = ?
    `);
    stmt.run(reason, blockedUntil, userId);
    return Promise.resolve();
}

export async function unblockUser(userId: string): Promise<void> {
    const stmt = db.prepare(`
        UPDATE users
        SET isBlocked = 0, blockReason = NULL, blockedUntil = NULL
        WHERE id = ?
    `);
    stmt.run(userId);
    return Promise.resolve();
}

export async function addAdminMessage(userId: string, message: string): Promise<void> {
    const stmt = db.prepare(`
        INSERT INTO admin_messages (id, userId, message, createdAt, isRead)
        VALUES (?, ?, ?, ?, 0)
    `);
    stmt.run(new Date().getTime().toString(), userId, message, new Date().toISOString());
    return Promise.resolve();
}

export async function getAdminMessages(userId: string): Promise<AdminMessage[]> {
    const stmt = db.prepare('SELECT * FROM admin_messages WHERE userId = ? ORDER BY createdAt DESC');
    return Promise.resolve(stmt.all(userId) as AdminMessage[]);
}

export async function getUnreadMessages(userId: string): Promise<AdminMessage[]> {
    const stmt = db.prepare('SELECT * FROM admin_messages WHERE userId = ? AND isRead = 0 ORDER BY createdAt ASC');
    return Promise.resolve(stmt.all(userId) as AdminMessage[]);
}

export async function markMessageAsRead(messageId: string): Promise<void> {
    const stmt = db.prepare('UPDATE admin_messages SET isRead = 1 WHERE id = ?');
    stmt.run(messageId);
    return Promise.resolve();
}

export async function deleteAdminMessage(messageId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM admin_messages WHERE id = ?');
    stmt.run(messageId);
    return Promise.resolve();
}
