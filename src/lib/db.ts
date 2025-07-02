import { createClient } from '@supabase/supabase-js';
import type { Leader } from '@/data/leaders';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema creation function (run this once to set up your tables)
export const initializeDatabase = async () => {
  // Note: You'll need to run these SQL commands in your Supabase SQL editor
  console.log('Database initialization should be done via Supabase SQL editor');
};

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

// For this prototype, we'll use a simple file-based SQLite database.
// In a production app, you'd use a more robust database solution.

// Store the database in a `data` directory at the project root to ensure it's persistent.
const dbDir = path.join(process.cwd(), 'data');

// Ensure the directory exists before initializing the database.
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(path.join(dbDir, 'politirate.db'));


// Enable WAL mode for better concurrency.
db.pragma('journal_mode = WAL');

// Enable foreign key support to make ON DELETE CASCADE work.
db.pragma('foreign_keys = ON');

const now = new Date().toISOString();

const defaultLeaders: Leader[] = [];

// --- Schema Definition and Seeding ---
const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    gender TEXT,
    age INTEGER,
    state TEXT,
    mpConstituency TEXT,
    mlaConstituency TEXT,
    panchayat TEXT,
    createdAt TEXT,
    isBlocked INTEGER DEFAULT 0,
    blockedUntil TEXT,
    blockReason TEXT
  );

  CREATE TABLE IF NOT EXISTS leaders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    partyName TEXT NOT NULL,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
    photoUrl TEXT,
    constituency TEXT NOT NULL,
    nativeAddress TEXT NOT NULL,
    electionType TEXT NOT NULL,
    location_state TEXT,
    location_district TEXT,
    rating REAL DEFAULT 0,
    reviewCount INTEGER DEFAULT 0,
    previousElections TEXT,
    manifestoUrl TEXT,
    twitterUrl TEXT,
    addedByUserId TEXT,
    createdAt TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    adminComment TEXT,
    FOREIGN KEY(addedByUserId) REFERENCES users(id) ON DELETE SET NULL
  );
  
  CREATE TABLE IF NOT EXISTS ratings (
    userId TEXT NOT NULL,
    leaderId TEXT NOT NULL,
    rating INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    socialBehaviour TEXT,
    PRIMARY KEY (userId, leaderId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (leaderId) REFERENCES leaders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    userId TEXT NOT NULL,
    leaderId TEXT NOT NULL,
    comment TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    PRIMARY KEY (userId, leaderId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (leaderId) REFERENCES leaders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS admin_messages (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    message TEXT NOT NULL,
    isRead INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    link TEXT
  );

  CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    active_until TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS poll_questions (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    question_order INTEGER NOT NULL,
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    option_text TEXT NOT NULL,
    option_order INTEGER NOT NULL,
    FOREIGN KEY(question_id) REFERENCES poll_questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS poll_responses (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(poll_id, user_id),
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS poll_answers (
    id TEXT PRIMARY KEY,
    response_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_option_id TEXT NOT NULL,
    FOREIGN KEY(response_id) REFERENCES poll_responses(id) ON DELETE CASCADE,
    FOREIGN KEY(question_id) REFERENCES poll_questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    resolved_at TEXT,
    admin_notes TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`;

db.exec(schema);

// --- Simple migration script to add missing columns ---
const migrations = {
    users: {
        createdAt: 'TEXT',
        isBlocked: 'INTEGER DEFAULT 0',
        blockedUntil: 'TEXT',
        blockReason: 'TEXT'
    },
    leaders: {
        addedByUserId: 'TEXT',
        createdAt: 'TEXT',
        status: "TEXT NOT NULL DEFAULT 'pending'",
        adminComment: 'TEXT'
    },
    ratings: {
        socialBehaviour: 'TEXT',
        createdAt: 'TEXT'
    },
    comments: {
        createdAt: 'TEXT'
    },
    admin_messages: {
        isRead: 'INTEGER DEFAULT 0'
    },
    notifications: {
        link: 'TEXT'
    },
    site_settings: {
        contact_email: 'TEXT',
        contact_phone: 'TEXT',
        contact_twitter: 'TEXT',
        contact_linkedin: 'TEXT',
        contact_youtube: 'TEXT',
        contact_facebook: 'TEXT',
    },
    support_tickets: {
        updated_at: 'TEXT'
    }
};

for (const [tableName, columns] of Object.entries(migrations)) {
    try {
        const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
        const existingColumns = tableInfo.map(col => col.name);

        for (const [columnName, columnType] of Object.entries(columns)) {
            if (!existingColumns.includes(columnName)) {
                db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`).run();
                console.log(`Database migration: Added '${columnName}' to '${tableName}' table.`);
            }
        }
    } catch (error) {
        // This might fail if the table doesn't exist yet, which is fine on the first run during schema creation.
        if (!(error instanceof Error && error.message.includes('no such table'))) {
            console.error(`Migration failed for table ${tableName}:`, error);
        }
    }
}


// --- Seeding Logic ---
const seedDatabase = () => {
  const transaction = db.transaction(() => {
    // Permanently remove any remaining default leaders (those not added by a user)
    // and their associated ratings/comments.
    const defaultLeaderIds = db.prepare('SELECT id FROM leaders WHERE addedByUserId IS NULL').all().map((row: any) => row.id);
    
    if (defaultLeaderIds.length > 0) {
        // Prepare a string of placeholders for the IN clause
        const placeholders = defaultLeaderIds.map(() => '?').join(',');

        // Explicitly delete dependent records first
        db.prepare(`DELETE FROM ratings WHERE leaderId IN (${placeholders})`).run(...defaultLeaderIds);
        db.prepare(`DELETE FROM comments WHERE leaderId IN (${placeholders})`).run(...defaultLeaderIds);
        
        // Now delete the leaders
        const deleteStmt = db.prepare('DELETE FROM leaders WHERE addedByUserId IS NULL');
        const info = deleteStmt.run();

        console.log(`Removed ${info.changes} default leader(s) and their associated data from the database.`);
    }

    // Seed Site Settings
    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM site_settings').get() as { count: number };
    if (settingsCount.count === 0) {
        const insertSetting = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
        insertSetting.run('maintenance_active', 'false');
        insertSetting.run('maintenance_start', '');
        insertSetting.run('maintenance_end', '');
        insertSetting.run('maintenance_message', 'The site is currently down for maintenance. We will be back online shortly.');
        insertSetting.run('contact_email', 'support@politirate.com');
        console.log('Database seeded with default site settings.');
    }
  });

  transaction();
};

seedDatabase();