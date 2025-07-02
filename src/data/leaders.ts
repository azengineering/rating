
'use server';

import { db } from '@/lib/db';
import type { User } from './users';
import { getUsers } from './users';
import type { RunResult } from 'better-sqlite3';

export interface Leader {
  id: string;
  name: string;
  partyName: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  photoUrl: string;
  constituency: string;
  nativeAddress: string;
  electionType: 'national' | 'state' | 'panchayat';
  location: {
    state?: string;
    district?: string;
  };
  rating: number;
  reviewCount: number;
  previousElections: Array<{
    electionType: string;
    constituency: string;
    status: 'winner' | 'loser';
    electionYear: string;
    partyName: string;
  }>;
  manifestoUrl?: string;
  twitterUrl?: string;
  addedByUserId?: string | null;
  createdAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string | null;
  userName?: string;
}

export interface Review {
  userName: string;
  rating: number;
  comment: string | null;
  updatedAt: string;
  socialBehaviour: string | null;
}

export interface UserActivity {
  leaderId: string;
  leaderName: string;
  leaderPhotoUrl: string;
  rating: number;
  comment: string | null;
  updatedAt: string;
  leader: Leader;
  socialBehaviour: string | null;
  userName: string;
}

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface SocialBehaviourDistribution {
  name: string;
  count: number;
}


// --- DB data transformation ---
function dbToLeader(dbLeader: any): Leader {
    return {
        id: dbLeader.id,
        name: dbLeader.name,
        partyName: dbLeader.partyName,
        gender: dbLeader.gender,
        age: dbLeader.age,
        photoUrl: dbLeader.photoUrl,
        constituency: dbLeader.constituency,
        nativeAddress: dbLeader.nativeAddress,
        electionType: dbLeader.electionType,
        location: {
            state: dbLeader.location_state,
            district: dbLeader.location_district,
        },
        rating: dbLeader.rating,
        reviewCount: dbLeader.reviewCount,
        previousElections: JSON.parse(dbLeader.previousElections || '[]'),
        manifestoUrl: dbLeader.manifestoUrl,
        twitterUrl: dbLeader.twitterUrl,
        addedByUserId: dbLeader.addedByUserId,
        createdAt: dbLeader.createdAt,
        status: dbLeader.status,
        adminComment: dbLeader.adminComment,
        userName: dbLeader.userName,
    };
}

function mapDbActivityToUserActivity(activity: any): UserActivity {
    const leaderData = dbToLeader({
        id: activity.leader_id,
        name: activity.leader_name,
        partyName: activity.leader_partyName,
        gender: activity.leader_gender,
        age: activity.leader_age,
        photoUrl: activity.leader_photoUrl,
        constituency: activity.leader_constituency,
        nativeAddress: activity.leader_nativeAddress,
        electionType: activity.leader_electionType,
        location_state: activity.leader_location_state,
        location_district: activity.leader_location_district,
        rating: activity.leader_rating,
        reviewCount: activity.leader_reviewCount,
        previousElections: activity.leader_previousElections, // Already a string
        manifestoUrl: activity.leader_manifestoUrl,
        twitterUrl: activity.leader_twitterUrl,
        addedByUserId: activity.leader_addedByUserId,
        createdAt: activity.leader_createdAt,
        status: activity.leader_status,
        adminComment: activity.leader_adminComment,
    });

    return {
        leaderId: activity.leaderId,
        leaderName: activity.leader_name,
        leaderPhotoUrl: activity.leader_photoUrl,
        rating: activity.rating,
        comment: activity.comment,
        updatedAt: activity.updatedAt,
        socialBehaviour: activity.socialBehaviour,
        userName: activity.userName,
        leader: leaderData,
    };
}

// --- Public API ---

// Gets only approved leaders for the public site
export async function getLeaders(): Promise<Leader[]> {
  const stmt = db.prepare("SELECT * FROM leaders WHERE status = 'approved'");
  const dbLeaders = stmt.all() as any[];
  return Promise.resolve(dbLeaders.map(dbToLeader));
}

export async function addLeader(leaderData: Omit<Leader, 'id' | 'rating' | 'reviewCount' | 'addedByUserId' | 'createdAt' | 'status' | 'adminComment' | 'userName'>, userId: string | null): Promise<void> {
    const newLeader: Leader = {
        ...leaderData,
        id: new Date().getTime().toString(),
        rating: 0,
        reviewCount: 0,
        addedByUserId: userId,
        createdAt: new Date().toISOString(),
        status: 'pending', // New leaders are pending approval
        adminComment: null,
    };
    
    const stmt = db.prepare(`
        INSERT INTO leaders (id, name, partyName, gender, age, photoUrl, constituency, nativeAddress, electionType, location_state, location_district, rating, reviewCount, previousElections, manifestoUrl, twitterUrl, addedByUserId, createdAt, status, adminComment)
        VALUES (@id, @name, @partyName, @gender, @age, @photoUrl, @constituency, @nativeAddress, @electionType, @location_state, @location_district, @rating, @reviewCount, @previousElections, @manifestoUrl, @twitterUrl, @addedByUserId, @createdAt, @status, @adminComment)
    `);
    
    stmt.run({
        id: newLeader.id,
        name: newLeader.name,
        partyName: newLeader.partyName,
        gender: newLeader.gender,
        age: newLeader.age,
        photoUrl: newLeader.photoUrl,
        constituency: newLeader.constituency,
        nativeAddress: newLeader.nativeAddress,
        electionType: newLeader.electionType,
        location_state: newLeader.location.state,
        location_district: newLeader.location.district,
        rating: newLeader.rating,
        reviewCount: newLeader.reviewCount,
        previousElections: JSON.stringify(newLeader.previousElections),
        manifestoUrl: newLeader.manifestoUrl,
        twitterUrl: newLeader.twitterUrl,
        addedByUserId: newLeader.addedByUserId,
        createdAt: newLeader.createdAt,
        status: newLeader.status,
        adminComment: newLeader.adminComment,
    });

    return Promise.resolve();
}

export async function getLeaderById(id: string): Promise<Leader | null> {
    const stmt = db.prepare('SELECT * FROM leaders WHERE id = ?');
    const dbLeader = stmt.get(id) as any;
    if (dbLeader) {
        return Promise.resolve(dbToLeader(dbLeader));
    }
    return Promise.resolve(null);
}

export async function updateLeader(leaderId: string, leaderData: Omit<Leader, 'id' | 'rating' | 'reviewCount' | 'addedByUserId' | 'createdAt' | 'status' | 'adminComment' | 'userName'>, userId: string | null, isAdmin: boolean): Promise<Leader | null> {
    const leaderToUpdate = await getLeaderById(leaderId);

    if (!leaderToUpdate) {
        throw new Error("Leader not found.");
    }
    
    // Authorization: Only the original submitter or an admin can edit.
    if (!isAdmin && leaderToUpdate.addedByUserId !== userId) {
        throw new Error("You are not authorized to edit this leader.");
    }

    let newStatus: Leader['status'];
    let newAdminComment: string | null | undefined;

    // This is the core logic for the re-approval workflow.
    if (isAdmin) {
        // When an admin edits, they are not changing the approval status here.
        // Status is managed separately in the admin panel.
        newStatus = leaderToUpdate.status;
        newAdminComment = leaderToUpdate.adminComment;
    } else {
        // When a non-admin user edits, we must force a re-approval.
        newStatus = 'pending';
        newAdminComment = 'User updated details. Pending re-approval.';
    }

    const stmt = db.prepare(`
        UPDATE leaders
        SET name = @name,
            partyName = @partyName,
            gender = @gender,
            age = @age,
            photoUrl = @photoUrl,
            constituency = @constituency,
            nativeAddress = @nativeAddress,
            electionType = @electionType,
            location_state = @location_state,
            location_district = @location_district,
            previousElections = @previousElections,
            manifestoUrl = @manifestoUrl,
            twitterUrl = @twitterUrl,
            status = @status,
            adminComment = @adminComment
        WHERE id = @id
    `);

    stmt.run({
        id: leaderId,
        name: leaderData.name,
        partyName: leaderData.partyName,
        gender: leaderData.gender,
        age: leaderData.age,
        photoUrl: leaderData.photoUrl,
        constituency: leaderData.constituency,
        nativeAddress: leaderData.nativeAddress,
        electionType: leaderData.electionType,
        location_state: leaderData.location.state,
        location_district: leaderData.location.district,
        previousElections: JSON.stringify(leaderData.previousElections),
        manifestoUrl: leaderData.manifestoUrl,
        twitterUrl: leaderData.twitterUrl,
        status: newStatus,
        adminComment: newAdminComment,
    });

    return getLeaderById(leaderId);
}


export async function submitRatingAndComment(leaderId: string, userId: string, newRating: number, comment: string | null, socialBehaviour: string | null): Promise<Leader | null> {
    const transaction = db.transaction(() => {
        const now = new Date().toISOString();

        // 1. Find existing rating
        const ratingStmt = db.prepare('SELECT rating FROM ratings WHERE userId = ? AND leaderId = ?');
        const existingRating = ratingStmt.get(userId, leaderId) as { rating: number } | undefined;
        
        // 2. Insert or update rating. createdAt is only set on the initial insert.
        const upsertRatingStmt = db.prepare(`
            INSERT INTO ratings (userId, leaderId, rating, createdAt, updatedAt, socialBehaviour)
            VALUES (@userId, @leaderId, @rating, @createdAt, @updatedAt, @socialBehaviour)
            ON CONFLICT(userId, leaderId) DO UPDATE SET
            rating = excluded.rating,
            updatedAt = excluded.updatedAt,
            socialBehaviour = excluded.socialBehaviour
        `);
        upsertRatingStmt.run({ userId, leaderId, rating: newRating, createdAt: now, updatedAt: now, socialBehaviour });

        // 3. Handle comment
        if (comment && comment.trim().length > 0) {
            const upsertCommentStmt = db.prepare(`
                INSERT INTO comments (userId, leaderId, comment, createdAt, updatedAt)
                VALUES (@userId, @leaderId, @comment, @createdAt, @updatedAt)
                ON CONFLICT(userId, leaderId) DO UPDATE SET
                comment = excluded.comment,
                updatedAt = excluded.updatedAt
            `);
            upsertCommentStmt.run({ userId, leaderId, comment, createdAt: now, updatedAt: now });
        }

        // 4. Update leader's aggregate rating
        const leader = db.prepare('SELECT rating, reviewCount FROM leaders WHERE id = ?').get(leaderId) as { rating: number; reviewCount: number };
        if (!leader) {
            throw new Error("Leader not found during transaction.");
        }

        let newReviewCount = leader.reviewCount;
        let newAverageRating = leader.rating;

        if (existingRating) {
            // User is updating their rating
            const oldRatingValue = existingRating.rating;
            if (leader.reviewCount > 0) {
                newAverageRating = ((leader.rating * leader.reviewCount) - oldRatingValue + newRating) / leader.reviewCount;
            } else {
                newAverageRating = newRating; // Should not happen if reviewCount is consistent
            }
        } else {
            // New rating from this user
            newReviewCount = leader.reviewCount + 1;
            newAverageRating = ((leader.rating * leader.reviewCount) + newRating) / newReviewCount;
        }

        const updateLeaderStmt = db.prepare('UPDATE leaders SET rating = ?, reviewCount = ? WHERE id = ?');
        updateLeaderStmt.run(newAverageRating.toFixed(2), newReviewCount, leaderId);
    });

    try {
        transaction();
        return getLeaderById(leaderId);
    } catch (error) {
        console.error("Failed to submit rating and comment:", error);
        throw error;
    }
}


export async function getReviewsForLeader(leaderId: string): Promise<Review[]> {
    const stmt = db.prepare(`
        SELECT
            r.rating,
            r.updatedAt,
            r.socialBehaviour,
            c.comment,
            u.name as userName
        FROM ratings r
        JOIN users u ON r.userId = u.id
        LEFT JOIN comments c ON r.userId = c.userId AND r.leaderId = c.leaderId
        WHERE r.leaderId = ?
        ORDER BY r.updatedAt DESC
    `);
    
    const reviews = stmt.all(leaderId) as any[];
    return Promise.resolve(reviews.map(r => ({ ...r })));
}

export async function getRatingDistribution(leaderId: string): Promise<RatingDistribution[]> {
    const stmt = db.prepare(`
        SELECT rating, COUNT(rating) as count
        FROM ratings
        WHERE leaderId = ?
        GROUP BY rating
        ORDER BY rating DESC
    `);
    const results = stmt.all(leaderId) as RatingDistribution[];
    return Promise.resolve(results);
}

export async function getSocialBehaviourDistribution(leaderId: string): Promise<SocialBehaviourDistribution[]> {
    const stmt = db.prepare(`
        SELECT socialBehaviour as name, COUNT(socialBehaviour) as count
        FROM ratings
        WHERE leaderId = ? AND socialBehaviour IS NOT NULL AND socialBehaviour != ''
        GROUP BY socialBehaviour
        ORDER BY count DESC
    `);
    const results = stmt.all(leaderId) as SocialBehaviourDistribution[];
    return Promise.resolve(results.map(r => ({ ...r, name: r.name.charAt(0).toUpperCase() + r.name.slice(1).replace('-', ' ') })));
}


export async function getActivitiesForUser(userId: string): Promise<UserActivity[]> {
    const stmt = db.prepare(`
        SELECT
            r.leaderId,
            l.*, l.id as leader_id, l.name as leader_name, l.partyName as leader_partyName, l.gender as leader_gender, l.age as leader_age, l.photoUrl as leader_photoUrl, l.constituency as leader_constituency, l.nativeAddress as leader_nativeAddress, l.electionType as leader_electionType, l.location_state as leader_location_state, l.location_district as leader_location_district, l.rating as leader_rating, l.reviewCount as leader_reviewCount, l.previousElections as leader_previousElections, l.manifestoUrl as leader_manifestoUrl, l.twitterUrl as leader_twitterUrl, l.addedByUserId as leader_addedByUserId, l.createdAt as leader_createdAt, l.status as leader_status, l.adminComment as leader_adminComment,
            r.rating,
            r.updatedAt,
            r.socialBehaviour,
            c.comment,
            u.name as userName
        FROM ratings r
        JOIN leaders l ON r.leaderId = l.id
        JOIN users u ON r.userId = u.id
        LEFT JOIN comments c ON r.userId = c.userId AND r.leaderId = c.leaderId
        WHERE r.userId = ?
        ORDER BY r.updatedAt DESC
    `);
    
    const activities = stmt.all(userId) as any[];

    return Promise.resolve(activities.map(mapDbActivityToUserActivity));
}

export async function getAllActivities(): Promise<UserActivity[]> {
    const stmt = db.prepare(`
        SELECT
            r.leaderId,
            l.*, l.id as leader_id, l.name as leader_name, l.partyName as leader_partyName, l.gender as leader_gender, l.age as leader_age, l.photoUrl as leader_photoUrl, l.constituency as leader_constituency, l.nativeAddress as leader_nativeAddress, l.electionType as leader_electionType, l.location_state as leader_location_state, l.location_district as leader_location_district, l.rating as leader_rating, l.reviewCount as leader_reviewCount, l.previousElections as leader_previousElections, l.manifestoUrl as leader_manifestoUrl, l.twitterUrl as leader_twitterUrl, l.addedByUserId as leader_addedByUserId, l.createdAt as leader_createdAt, l.status as leader_status, l.adminComment as leader_adminComment,
            r.rating,
            r.updatedAt,
            r.socialBehaviour,
            c.comment,
            u.name as userName
        FROM ratings r
        JOIN leaders l ON r.leaderId = l.id
        JOIN users u ON r.userId = u.id
        LEFT JOIN comments c ON r.userId = c.userId AND r.leaderId = c.leaderId
        ORDER BY r.updatedAt DESC
    `);
    
    const activities = stmt.all() as any[];
    return Promise.resolve(activities.map(mapDbActivityToUserActivity));
}


export async function getLeadersAddedByUser(userId: string): Promise<Leader[]> {
  const stmt = db.prepare('SELECT * FROM leaders WHERE addedByUserId = ? ORDER BY name ASC');
  const dbLeaders = stmt.all(userId) as any[];
  return Promise.resolve(dbLeaders.map(dbToLeader));
}


export async function getLeaderCount(filters?: { startDate?: string, endDate?: string, state?: string, constituency?: string }): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM leaders';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (filters?.startDate && filters?.endDate) {
        conditions.push('createdAt >= ? AND createdAt <= ?');
        params.push(filters.startDate, filters.endDate);
    }
    if (filters?.state) {
        conditions.push('location_state = ?');
        params.push(filters.state);
    }
    if (filters?.constituency) {
        conditions.push('constituency LIKE ?');
        params.push(`%${filters.constituency}%`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    const { count } = db.prepare(query).get(...params) as { count: number };
    return Promise.resolve(count);
}

export async function getRatingCount(filters?: { startDate?: string, endDate?: string, state?: string, constituency?: string }): Promise<number> {
    let query = 'SELECT COUNT(r.leaderId) as count FROM ratings r';
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    let needsJoin = false;

    if (filters?.startDate && filters?.endDate) {
        conditions.push('r.createdAt >= ? AND r.createdAt <= ?');
        params.push(filters.startDate, filters.endDate);
    }
    if (filters?.state) {
        needsJoin = true;
        conditions.push('l.location_state = ?');
        params.push(filters.state);
    }
    if (filters?.constituency) {
        needsJoin = true;
        conditions.push('l.constituency LIKE ?');
        params.push(`%${filters.constituency}%`);
    }
    
    if (needsJoin) {
        query += ' JOIN leaders l ON r.leaderId = l.id';
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const { count } = db.prepare(query).get(...params) as { count: number };
    return Promise.resolve(count);
}

// --- Admin Functions ---
export async function getLeadersForAdminPanel(filters: {
    dateFrom?: string;
    dateTo?: string;
    state?: string;
    constituency?: string;
    candidateName?: string;
}): Promise<Leader[]> {
  let query = `
    SELECT l.*, u.name as userName
    FROM leaders l
    LEFT JOIN users u ON l.addedByUserId = u.id
  `;
  const params: (string | number)[] = [];
  const conditions: string[] = [];

  if (filters.dateFrom && filters.dateTo) {
    conditions.push('l.createdAt >= ? AND l.createdAt <= ?');
    params.push(filters.dateFrom, filters.dateTo);
  }
  if (filters.state) {
    conditions.push('l.location_state = ?');
    params.push(filters.state);
  }
  if (filters.constituency) {
    conditions.push('l.constituency LIKE ?');
    params.push(`%${filters.constituency}%`);
  }
  if (filters.candidateName) {
    conditions.push('l.name LIKE ?');
    params.push(`%${filters.candidateName}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY l.createdAt DESC';
  
  const stmt = db.prepare(query);
  const dbLeaders = stmt.all(...params) as any[];
  return Promise.resolve(dbLeaders.map(dbToLeader));
}


export async function approveLeader(leaderId: string): Promise<void> {
  const stmt = db.prepare("UPDATE leaders SET status = 'approved', adminComment = 'Approved by admin.' WHERE id = ?");
  stmt.run(leaderId);
  return Promise.resolve();
}

export async function updateLeaderStatus(leaderId: string, status: 'pending' | 'approved' | 'rejected', adminComment: string | null): Promise<void> {
  const stmt = db.prepare("UPDATE leaders SET status = ?, adminComment = ? WHERE id = ?");
  stmt.run(status, adminComment, leaderId);
  return Promise.resolve();
}

export async function deleteLeader(leaderId: string): Promise<void> {
    const transaction = db.transaction((id: string) => {
        // Explicitly delete dependent records first to ensure foreign key constraints are met.
        db.prepare('DELETE FROM ratings WHERE leaderId = ?').run(id);
        db.prepare('DELETE FROM comments WHERE leaderId = ?').run(id);
        
        // Now delete the leader.
        db.prepare('DELETE FROM leaders WHERE id = ?').run(id);
    });

    try {
        transaction(leaderId);
    } catch (error) {
        console.error("Failed to delete leader and associated data:", error);
        throw error;
    }
}

export async function deleteRating(userId: string, leaderId: string): Promise<void> {
    const transaction = db.transaction(() => {
        // 1. Get the rating value before deleting
        const ratingStmt = db.prepare('SELECT rating FROM ratings WHERE userId = ? AND leaderId = ?');
        const ratingToDelete = ratingStmt.get(userId, leaderId) as { rating: number } | undefined;

        if (!ratingToDelete) {
            // Nothing to delete, maybe already deleted.
            return;
        }

        // 2. Delete from ratings and comments
        db.prepare('DELETE FROM ratings WHERE userId = ? AND leaderId = ?').run(userId, leaderId);
        db.prepare('DELETE FROM comments WHERE userId = ? AND leaderId = ?').run(userId, leaderId);

        // 3. Recalculate leader's average rating
        const leader = db.prepare('SELECT rating, reviewCount FROM leaders WHERE id = ?').get(leaderId) as { rating: number; reviewCount: number };
        if (!leader) {
            // Leader might have been deleted concurrently, which is fine.
            return;
        }

        const newReviewCount = leader.reviewCount - 1;
        let newAverageRating = 0;

        if (newReviewCount > 0) {
            // (Total Score - Deleted Score) / New Count
            newAverageRating = ((leader.rating * leader.reviewCount) - ratingToDelete.rating) / newReviewCount;
        }
        // If newReviewCount is 0, newAverageRating remains 0, which is correct.

        // 4. Update the leader
        const updateLeaderStmt = db.prepare('UPDATE leaders SET rating = ?, reviewCount = ? WHERE id = ?');
        updateLeaderStmt.run(newAverageRating.toFixed(2), newReviewCount, leaderId);
    });

    try {
        transaction();
        return Promise.resolve();
    } catch (error) {
        console.error("Failed to delete rating:", error);
        throw error;
    }
}
