
'use server';

import { supabase } from '@/lib/db';

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
        partyName: dbLeader.partyName || dbLeader.party_name,
        gender: dbLeader.gender,
        age: dbLeader.age,
        photoUrl: dbLeader.photoUrl || dbLeader.photo_url,
        constituency: dbLeader.constituency,
        nativeAddress: dbLeader.nativeAddress || dbLeader.native_address,
        electionType: dbLeader.electionType || dbLeader.election_type,
        location: {
            state: dbLeader.location_state,
            district: dbLeader.location_district,
        },
        rating: dbLeader.rating || 0,
        reviewCount: dbLeader.reviewCount || dbLeader.review_count || 0,
        previousElections: typeof dbLeader.previousElections === 'string' 
            ? JSON.parse(dbLeader.previousElections || '[]')
            : dbLeader.previousElections || [],
        manifestoUrl: dbLeader.manifestoUrl || dbLeader.manifesto_url,
        twitterUrl: dbLeader.twitterUrl || dbLeader.twitter_url,
        addedByUserId: dbLeader.addedByUserId || dbLeader.added_by_user_id,
        createdAt: dbLeader.createdAt || dbLeader.created_at,
        status: dbLeader.status || 'pending',
        adminComment: dbLeader.adminComment || dbLeader.admin_comment,
        userName: dbLeader.userName || dbLeader.user_name,
    };
}

// --- Public API ---

// Gets only approved leaders for the public site
export async function getLeaders(): Promise<Leader[]> {
  try {
    const { data, error } = await supabase
      .from('leaders')
      .select('*')
      .eq('status', 'approved');
    
    if (error) {
      console.error('Error fetching leaders:', error);
      return [];
    }
    
    return (data || []).map(dbToLeader);
  } catch (error) {
    console.error('Error in getLeaders:', error);
    return [];
  }
}

export async function addLeader(leaderData: Omit<Leader, 'id' | 'rating' | 'reviewCount' | 'addedByUserId' | 'createdAt' | 'status' | 'adminComment' | 'userName'>, userId: string | null): Promise<void> {
    const newLeader = {
        id: new Date().getTime().toString(),
        name: leaderData.name,
        party_name: leaderData.partyName,
        gender: leaderData.gender,
        age: leaderData.age,
        photo_url: leaderData.photoUrl,
        constituency: leaderData.constituency,
        native_address: leaderData.nativeAddress,
        election_type: leaderData.electionType,
        location_state: leaderData.location.state,
        location_district: leaderData.location.district,
        rating: 0,
        review_count: 0,
        previous_elections: JSON.stringify(leaderData.previousElections),
        manifesto_url: leaderData.manifestoUrl,
        twitter_url: leaderData.twitterUrl,
        added_by_user_id: userId,
        created_at: new Date().toISOString(),
        status: 'pending',
        admin_comment: null,
    };

    const { error } = await supabase
        .from('leaders')
        .insert([newLeader]);

    if (error) {
        console.error('Error adding leader:', error);
        throw new Error('Failed to add leader');
    }
}

export async function getLeaderById(id: string): Promise<Leader | null> {
    const { data, error } = await supabase
        .from('leaders')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching leader:', error);
        return null;
    }

    return data ? dbToLeader(data) : null;
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

    if (isAdmin) {
        newStatus = leaderToUpdate.status;
        newAdminComment = leaderToUpdate.adminComment;
    } else {
        newStatus = 'pending';
        newAdminComment = 'User updated details. Pending re-approval.';
    }

    const updateData = {
        name: leaderData.name,
        party_name: leaderData.partyName,
        gender: leaderData.gender,
        age: leaderData.age,
        photo_url: leaderData.photoUrl,
        constituency: leaderData.constituency,
        native_address: leaderData.nativeAddress,
        election_type: leaderData.electionType,
        location_state: leaderData.location.state,
        location_district: leaderData.location.district,
        previous_elections: JSON.stringify(leaderData.previousElections),
        manifesto_url: leaderData.manifestoUrl,
        twitter_url: leaderData.twitterUrl,
        status: newStatus,
        admin_comment: newAdminComment,
    };

    const { error } = await supabase
        .from('leaders')
        .update(updateData)
        .eq('id', leaderId);

    if (error) {
        console.error('Error updating leader:', error);
        throw new Error('Failed to update leader');
    }

    return getLeaderById(leaderId);
}

export async function submitRatingAndComment(leaderId: string, userId: string, newRating: number, comment: string | null, socialBehaviour: string | null): Promise<Leader | null> {
    try {
        const now = new Date().toISOString();

        // Check if rating already exists
        const { data: existingRating } = await supabase
            .from('ratings')
            .select('rating')
            .eq('userId', userId)
            .eq('leaderId', leaderId)
            .single();

        // Insert or update rating
        const { error: ratingError } = await supabase
            .from('ratings')
            .upsert({
                userId,
                leaderId,
                rating: newRating,
                createdAt: existingRating ? undefined : now,
                updatedAt: now,
                socialBehaviour
            });

        if (ratingError) {
            console.error('Error upserting rating:', ratingError);
            throw new Error('Failed to submit rating');
        }

        // Handle comment
        if (comment && comment.trim().length > 0) {
            const { error: commentError } = await supabase
                .from('comments')
                .upsert({
                    userId,
                    leaderId,
                    comment,
                    createdAt: now,
                    updatedAt: now
                });

            if (commentError) {
                console.error('Error upserting comment:', commentError);
            }
        }

        // Update leader's aggregate rating
        const { data: allRatings } = await supabase
            .from('ratings')
            .select('rating')
            .eq('leaderId', leaderId);

        if (allRatings && allRatings.length > 0) {
            const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = totalRating / allRatings.length;

            const { error: updateError } = await supabase
                .from('leaders')
                .update({
                    rating: parseFloat(averageRating.toFixed(2)),
                    review_count: allRatings.length
                })
                .eq('id', leaderId);

            if (updateError) {
                console.error('Error updating leader rating:', updateError);
            }
        }

        return getLeaderById(leaderId);
    } catch (error) {
        console.error("Failed to submit rating and comment:", error);
        throw error;
    }
}

export async function getReviewsForLeader(leaderId: string): Promise<Review[]> {
    const { data, error } = await supabase
        .from('ratings')
        .select(`
            rating,
            updatedAt,
            socialBehaviour,
            users!inner(name),
            comments(comment)
        `)
        .eq('leaderId', leaderId)
        .order('updatedAt', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }

    return (data || []).map(r => ({
        userName: r.users?.name || 'Anonymous',
        rating: r.rating,
        comment: r.comments?.[0]?.comment || null,
        updatedAt: r.updatedAt,
        socialBehaviour: r.socialBehaviour
    }));
}

export async function getRatingDistribution(leaderId: string): Promise<RatingDistribution[]> {
    const { data, error } = await supabase
        .from('ratings')
        .select('rating')
        .eq('leaderId', leaderId);

    if (error) {
        console.error('Error fetching rating distribution:', error);
        return [];
    }

    const distribution: { [key: number]: number } = {};
    (data || []).forEach(r => {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    return Object.entries(distribution)
        .map(([rating, count]) => ({ rating: parseInt(rating), count }))
        .sort((a, b) => b.rating - a.rating);
}

export async function getSocialBehaviourDistribution(leaderId: string): Promise<SocialBehaviourDistribution[]> {
    const { data, error } = await supabase
        .from('ratings')
        .select('socialBehaviour')
        .eq('leaderId', leaderId)
        .not('socialBehaviour', 'is', null)
        .neq('socialBehaviour', '');

    if (error) {
        console.error('Error fetching social behaviour distribution:', error);
        return [];
    }

    const distribution: { [key: string]: number } = {};
    (data || []).forEach(r => {
        if (r.socialBehaviour) {
            distribution[r.socialBehaviour] = (distribution[r.socialBehaviour] || 0) + 1;
        }
    });

    return Object.entries(distribution)
        .map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
            count
        }))
        .sort((a, b) => b.count - a.count);
}

export async function getActivitiesForUser(userId: string): Promise<UserActivity[]> {
    const { data, error } = await supabase
        .from('ratings')
        .select(`
            leaderId,
            rating,
            updatedAt,
            socialBehaviour,
            users!inner(name),
            leaders!inner(*),
            comments(comment)
        `)
        .eq('userId', userId)
        .order('updatedAt', { ascending: false });

    if (error) {
        console.error('Error fetching user activities:', error);
        return [];
    }

    return (data || []).map(activity => ({
        leaderId: activity.leaderId,
        leaderName: activity.leaders?.name || '',
        leaderPhotoUrl: activity.leaders?.photo_url || '',
        rating: activity.rating,
        comment: activity.comments?.[0]?.comment || null,
        updatedAt: activity.updatedAt,
        socialBehaviour: activity.socialBehaviour,
        userName: activity.users?.name || 'Anonymous',
        leader: dbToLeader(activity.leaders)
    }));
}

export async function getAllActivities(): Promise<UserActivity[]> {
    const { data, error } = await supabase
        .from('ratings')
        .select(`
            leaderId,
            rating,
            updatedAt,
            socialBehaviour,
            users!inner(name),
            leaders!inner(*),
            comments(comment)
        `)
        .order('updatedAt', { ascending: false });

    if (error) {
        console.error('Error fetching all activities:', error);
        return [];
    }

    return (data || []).map(activity => ({
        leaderId: activity.leaderId,
        leaderName: activity.leaders?.name || '',
        leaderPhotoUrl: activity.leaders?.photo_url || '',
        rating: activity.rating,
        comment: activity.comments?.[0]?.comment || null,
        updatedAt: activity.updatedAt,
        socialBehaviour: activity.socialBehaviour,
        userName: activity.users?.name || 'Anonymous',
        leader: dbToLeader(activity.leaders)
    }));
}

export async function getLeadersAddedByUser(userId: string): Promise<Leader[]> {
    const { data, error } = await supabase
        .from('leaders')
        .select('*')
        .eq('added_by_user_id', userId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching leaders added by user:', error);
        return [];
    }

    return (data || []).map(dbToLeader);
}

export async function getLeaderCount(filters?: { startDate?: string, endDate?: string, state?: string, constituency?: string }): Promise<number> {
    let query = supabase.from('leaders').select('*', { count: 'exact', head: true });

    if (filters?.startDate && filters?.endDate) {
        query = query.gte('created_at', filters.startDate).lte('created_at', filters.endDate);
    }
    if (filters?.state) {
        query = query.eq('location_state', filters.state);
    }
    if (filters?.constituency) {
        query = query.ilike('constituency', `%${filters.constituency}%`);
    }

    const { count, error } = await query;

    if (error) {
        console.error('Error getting leader count:', error);
        return 0;
    }

    return count || 0;
}

export async function getRatingCount(filters?: { startDate?: string, endDate?: string, state?: string, constituency?: string }): Promise<number> {
    let query = supabase.from('ratings').select('*', { count: 'exact', head: true });

    if (filters?.startDate && filters?.endDate) {
        query = query.gte('createdAt', filters.startDate).lte('createdAt', filters.endDate);
    }
    if (filters?.state || filters?.constituency) {
        query = query.select('*, leaders!inner(*)', { count: 'exact', head: true });
        if (filters?.state) {
            query = query.eq('leaders.location_state', filters.state);
        }
        if (filters?.constituency) {
            query = query.ilike('leaders.constituency', `%${filters.constituency}%`);
        }
    }

    const { count, error } = await query;

    if (error) {
        console.error('Error getting rating count:', error);
        return 0;
    }

    return count || 0;
}

// --- Admin Functions ---
export async function getLeadersForAdminPanel(filters: {
    dateFrom?: string;
    dateTo?: string;
    state?: string;
    constituency?: string;
    candidateName?: string;
}): Promise<Leader[]> {
    let query = supabase
        .from('leaders')
        .select(`
            *,
            users(name)
        `);

    if (filters.dateFrom && filters.dateTo) {
        query = query.gte('created_at', filters.dateFrom).lte('created_at', filters.dateTo);
    }
    if (filters.state) {
        query = query.eq('location_state', filters.state);
    }
    if (filters.constituency) {
        query = query.ilike('constituency', `%${filters.constituency}%`);
    }
    if (filters.candidateName) {
        query = query.ilike('name', `%${filters.candidateName}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching leaders for admin:', error);
        return [];
    }

    return (data || []).map(leader => ({
        ...dbToLeader(leader),
        userName: leader.users?.name
    }));
}

export async function approveLeader(leaderId: string): Promise<void> {
    const { error } = await supabase
        .from('leaders')
        .update({
            status: 'approved',
            admin_comment: 'Approved by admin.'
        })
        .eq('id', leaderId);

    if (error) {
        console.error('Error approving leader:', error);
        throw new Error('Failed to approve leader');
    }
}

export async function updateLeaderStatus(leaderId: string, status: 'pending' | 'approved' | 'rejected', adminComment: string | null): Promise<void> {
    const { error } = await supabase
        .from('leaders')
        .update({
            status,
            admin_comment: adminComment
        })
        .eq('id', leaderId);

    if (error) {
        console.error('Error updating leader status:', error);
        throw new Error('Failed to update leader status');
    }
}

export async function deleteLeader(leaderId: string): Promise<void> {
    // Delete dependent records first
    await supabase.from('ratings').delete().eq('leaderId', leaderId);
    await supabase.from('comments').delete().eq('leaderId', leaderId);

    // Delete the leader
    const { error } = await supabase
        .from('leaders')
        .delete()
        .eq('id', leaderId);

    if (error) {
        console.error('Error deleting leader:', error);
        throw new Error('Failed to delete leader');
    }
}

export async function deleteRating(userId: string, leaderId: string): Promise<void> {
    // Delete rating and comment
    await supabase.from('ratings').delete().eq('userId', userId).eq('leaderId', leaderId);
    await supabase.from('comments').delete().eq('userId', userId).eq('leaderId', leaderId);

    // Recalculate leader's rating
    const { data: allRatings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('leaderId', leaderId);

    const newReviewCount = allRatings?.length || 0;
    const newAverageRating = newReviewCount > 0
        ? (allRatings?.reduce((sum, r) => sum + r.rating, 0) || 0) / newReviewCount
        : 0;

    await supabase
        .from('leaders')
        .update({
            rating: parseFloat(newAverageRating.toFixed(2)),
            review_count: newReviewCount
        })
        .eq('id', leaderId);
}
