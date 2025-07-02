
'use server';

import { db } from '@/lib/db';
import type { RunResult } from 'better-sqlite3';

export type PollQuestionType = 'yes_no' | 'multiple_choice';

export interface PollOption {
  id: string;
  question_id: string;
  option_text: string;
  option_order: number;
}

export interface PollQuestion {
  id: string;
  poll_id: string;
  question_text: string;
  question_type: PollQuestionType;
  question_order: number;
  options: PollOption[];
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  active_until: string | null;
  created_at: string;
  questions: PollQuestion[];
}

// For listing in admin panel
export interface PollListItem {
    id: string;
    title: string;
    is_active: boolean;
    active_until: string | null;
    created_at: string;
    response_count: number;
    is_promoted?: boolean;
}

// For user participation page
export interface PollForParticipation extends Poll {
    user_has_voted: boolean;
}

export interface PollAnswer {
    questionId: string;
    optionId: string;
}

export interface PollResult {
    pollTitle: string;
    totalResponses: number;
    genderDistribution: { name: string; value: number }[];
    questions: {
        id: string;
        text: string;
        answers: { name: string; value: number }[];
    }[];
}


// --- Admin Panel Functions ---

export async function getPollsForAdmin(): Promise<PollListItem[]> {
    const stmt = db.prepare(`
        SELECT
            p.id,
            p.title,
            p.is_active,
            p.active_until,
            p.created_at,
            (SELECT COUNT(DISTINCT pr.user_id) FROM poll_responses pr WHERE pr.poll_id = p.id) as response_count,
            (SELECT 1 FROM notifications n WHERE n.link = ('/polls/' || p.id) LIMIT 1) as is_promoted
        FROM polls p
        LEFT JOIN poll_responses pr ON p.id = pr.poll_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `);
    const polls = stmt.all() as any[];
    return polls.map(p => ({...p, is_active: p.is_active === 1, is_promoted: p.is_promoted === 1}));
}

export async function getPollForEdit(pollId: string): Promise<Poll | null> {
    const pollStmt = db.prepare('SELECT * FROM polls WHERE id = ?');
    const pollData = pollStmt.get(pollId);
    if (!pollData) return null;

    const questionsStmt = db.prepare('SELECT * FROM poll_questions WHERE poll_id = ? ORDER BY question_order');
    const questionsData = questionsStmt.all(pollId) as PollQuestion[];

    const questions: PollQuestion[] = [];
    for (const q of questionsData) {
        const optionsStmt = db.prepare('SELECT * FROM poll_options WHERE question_id = ? ORDER BY option_order');
        const optionsData = optionsStmt.all(q.id);
        questions.push({ ...q, options: optionsData } as PollQuestion);
    }

    return { ...pollData, questions, is_active: pollData.is_active === 1 } as Poll;
}

export async function deletePoll(pollId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM polls WHERE id = ?');
    stmt.run(pollId); // ON DELETE CASCADE will handle questions, options, and responses
}

export async function upsertPoll(poll: Omit<Poll, 'created_at'>): Promise<Poll> {
    const transaction = db.transaction((p: typeof poll) => {
        const now = new Date().toISOString();
        const pollId = p.id || new Date().getTime().toString();
        
        const pollStmt = db.prepare(`
            INSERT INTO polls (id, title, description, is_active, active_until, created_at)
            VALUES (@id, @title, @description, @is_active, @active_until, @created_at)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                description = excluded.description,
                is_active = excluded.is_active,
                active_until = excluded.active_until
        `);

        pollStmt.run({
            id: pollId,
            title: p.title,
            description: p.description,
            is_active: p.is_active ? 1 : 0,
            active_until: p.active_until,
            created_at: now,
        });

        // Simple approach: delete all existing questions/options and re-insert
        // A more complex diff-based approach is possible but much more code
        db.prepare('DELETE FROM poll_questions WHERE poll_id = ?').run(pollId);

        const questionStmt = db.prepare(`
            INSERT INTO poll_questions (id, poll_id, question_text, question_type, question_order)
            VALUES (?, ?, ?, ?, ?)
        `);
        const optionStmt = db.prepare(`
            INSERT INTO poll_options (id, question_id, option_text, option_order)
            VALUES (?, ?, ?, ?)
        `);

        for (const [qIndex, question] of p.questions.entries()) {
            const questionId = new Date().getTime().toString() + qIndex;
            questionStmt.run(questionId, pollId, question.question_text, question.question_type, qIndex);

            for (const [oIndex, option] of question.options.entries()) {
                const optionId = questionId + oIndex;
                optionStmt.run(optionId, questionId, option.option_text, oIndex);
            }
        }
        return pollId;
    });

    const newPollId = transaction(poll);
    return (await getPollForEdit(newPollId))!;
}

export async function getPollResults(pollId: string): Promise<PollResult | null> {
    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as Poll;
    if (!poll) return null;

    const responses = db.prepare('SELECT id, user_id FROM poll_responses WHERE poll_id = ?').all(pollId) as { id: string, user_id: string }[];
    const totalResponses = responses.length;

    if (totalResponses === 0) {
        return {
            pollTitle: poll.title,
            totalResponses: 0,
            genderDistribution: [],
            questions: []
        };
    }

    const userIds = responses.map(r => r.user_id);
    const placeholders = userIds.map(() => '?').join(',');
    const users = db.prepare(`SELECT gender FROM users WHERE id IN (${placeholders})`).all(...userIds) as { gender: string | null }[];
    
    const genderCounts = users.reduce((acc, user) => {
        const gender = user.gender || 'unknown';
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const genderDistribution = Object.entries(genderCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
    }));
    
    const allAnswersForPoll = db.prepare(`
        SELECT pa.question_id, pa.selected_option_id
        FROM poll_answers pa
        JOIN poll_responses pr ON pa.response_id = pr.id
        WHERE pr.poll_id = ?
    `).all(pollId) as { question_id: string, selected_option_id: string }[];

    const questionsData = db.prepare('SELECT id, question_text, question_type FROM poll_questions WHERE poll_id = ? ORDER BY question_order').all(pollId) as { id: string, question_text: string, question_type: PollQuestionType }[];
    
    const questions = [];

    for (const q of questionsData) {
        const options = db.prepare('SELECT id, option_text FROM poll_options WHERE question_id = ? ORDER BY option_order').all(q.id) as { id: string, option_text: string}[];
        
        const answersForThisQuestion = options.map(opt => {
            const count = allAnswersForPoll.filter(ans => ans.selected_option_id === opt.id).length;
            return { name: opt.option_text, value: count };
        });

        questions.push({
            id: q.id,
            text: q.question_text,
            answers: answersForThisQuestion
        });
    }

    return {
        pollTitle: poll.title,
        totalResponses,
        genderDistribution,
        questions,
    };
}


// --- User Facing Functions ---

export async function getActivePollsForUser(userId: string | null): Promise<(PollListItem & { user_has_voted: boolean })[]> {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        SELECT
            p.id,
            p.title,
            p.description,
            p.active_until,
            p.created_at,
            (SELECT COUNT(DISTINCT pr.user_id) FROM poll_responses pr WHERE pr.poll_id = p.id) as response_count,
            CASE WHEN ? IS NOT NULL THEN (
                SELECT 1 FROM poll_responses pr WHERE pr.poll_id = p.id AND pr.user_id = ? LIMIT 1
            ) ELSE 0 END as user_has_voted
        FROM polls p
        WHERE p.is_active = 1 AND (p.active_until IS NULL OR p.active_until >= ?)
        ORDER BY p.created_at DESC
    `);
    
    const polls = stmt.all(userId, userId, now) as any[];
    return polls.map(p => ({ ...p, is_active: true, user_has_voted: p.user_has_voted === 1, description: p.description || '' }));
}

export async function getPollForParticipation(pollId: string, userId: string | null): Promise<PollForParticipation | null> {
    const poll = await getPollForEdit(pollId);
    if (!poll) return null;

    let hasVoted = false;
    if (userId) {
        const responseStmt = db.prepare('SELECT id FROM poll_responses WHERE poll_id = ? AND user_id = ?');
        const response = responseStmt.get(pollId, userId);
        hasVoted = !!response;
    }

    return { ...poll, user_has_voted: hasVoted };
}

export async function submitPollResponse(pollId: string, userId: string, answers: PollAnswer[]): Promise<void> {
    const transaction = db.transaction(() => {
        // Check if user has already voted
        const existing = db.prepare('SELECT id FROM poll_responses WHERE poll_id = ? AND user_id = ?').get(pollId, userId);
        if (existing) {
            throw new Error("You have already participated in this poll.");
        }

        const now = new Date().toISOString();
        const responseId = new Date().getTime().toString();
        
        // 1. Create the response entry
        const responseStmt = db.prepare('INSERT INTO poll_responses (id, poll_id, user_id, created_at) VALUES (?, ?, ?, ?)');
        responseStmt.run(responseId, pollId, userId, now);

        // 2. Insert each answer
        const answerStmt = db.prepare('INSERT INTO poll_answers (id, response_id, question_id, selected_option_id) VALUES (?, ?, ?, ?)');
        for (const answer of answers) {
            const answerId = new Date().getTime().toString() + Math.random();
            answerStmt.run(answerId, responseId, answer.questionId, answer.optionId);
        }
    });
    
    transaction();
}
