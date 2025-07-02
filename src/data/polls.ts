
'use server';

import { supabase } from '@/lib/db';

export interface Poll {
    id: string;
    title: string;
    description: string | null;
    isActive: boolean;
    activeUntil: string | null;
    createdAt: string;
    questions: PollQuestion[];
}

export interface PollQuestion {
    id: string;
    pollId: string;
    questionText: string;
    questionType: 'single-choice' | 'multiple-choice' | 'text';
    questionOrder: number;
    options: PollOption[];
}

export interface PollOption {
    id: string;
    questionId: string;
    optionText: string;
    optionOrder: number;
}

export interface PollResponse {
    id: string;
    pollId: string;
    userId: string;
    createdAt: string;
    answers: PollAnswer[];
}

export interface PollAnswer {
    id: string;
    responseId: string;
    questionId: string;
    selectedOptionId: string;
}

export interface PollResult {
    pollId: string;
    questionId: string;
    questionText: string;
    questionType: string;
    options: Array<{
        optionId: string;
        optionText: string;
        count: number;
        percentage: number;
    }>;
    totalResponses: number;
}

export async function getActivePolls(): Promise<Poll[]> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
        .from('polls')
        .select(`
            *,
            poll_questions(
                *,
                poll_options(*)
            )
        `)
        .eq('is_active', true)
        .or(`active_until.is.null,active_until.gt.${now}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching active polls:', error);
        return [];
    }

    return (data || []).map(dbToPoll);
}

export async function getAllPolls(): Promise<Poll[]> {
    const { data, error } = await supabase
        .from('polls')
        .select(`
            *,
            poll_questions(
                *,
                poll_options(*)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all polls:', error);
        return [];
    }

    return (data || []).map(dbToPoll);
}

export async function getPollById(pollId: string): Promise<Poll | null> {
    const { data, error } = await supabase
        .from('polls')
        .select(`
            *,
            poll_questions(
                *,
                poll_options(*)
            )
        `)
        .eq('id', pollId)
        .single();

    if (error) {
        console.error('Error fetching poll:', error);
        return null;
    }

    return data ? dbToPoll(data) : null;
}

export async function createPoll(pollData: Omit<Poll, 'id' | 'createdAt'>): Promise<string> {
    const pollId = new Date().getTime().toString();
    const createdAt = new Date().toISOString();

    const { error: pollError } = await supabase
        .from('polls')
        .insert({
            id: pollId,
            title: pollData.title,
            description: pollData.description,
            is_active: pollData.isActive,
            active_until: pollData.activeUntil,
            created_at: createdAt,
        });

    if (pollError) {
        console.error('Error creating poll:', pollError);
        throw new Error('Failed to create poll');
    }

    // Insert questions and options
    for (const question of pollData.questions) {
        const questionId = `${pollId}_q_${question.questionOrder}`;
        
        const { error: questionError } = await supabase
            .from('poll_questions')
            .insert({
                id: questionId,
                poll_id: pollId,
                question_text: question.questionText,
                question_type: question.questionType,
                question_order: question.questionOrder,
            });

        if (questionError) {
            console.error('Error creating question:', questionError);
            throw new Error('Failed to create poll question');
        }

        // Insert options for this question
        if (question.options && question.options.length > 0) {
            const optionsToInsert = question.options.map(option => ({
                id: `${questionId}_o_${option.optionOrder}`,
                question_id: questionId,
                option_text: option.optionText,
                option_order: option.optionOrder,
            }));

            const { error: optionError } = await supabase
                .from('poll_options')
                .insert(optionsToInsert);

            if (optionError) {
                console.error('Error creating options:', optionError);
                throw new Error('Failed to create poll options');
            }
        }
    }

    return pollId;
}

export async function submitPollResponse(pollId: string, userId: string, answers: Array<{ questionId: string; selectedOptionId: string }>): Promise<void> {
    const responseId = new Date().getTime().toString();
    const createdAt = new Date().toISOString();

    // Check if user has already responded
    const { data: existing } = await supabase
        .from('poll_responses')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', userId)
        .single();

    if (existing) {
        throw new Error('User has already responded to this poll');
    }

    // Insert response
    const { error: responseError } = await supabase
        .from('poll_responses')
        .insert({
            id: responseId,
            poll_id: pollId,
            user_id: userId,
            created_at: createdAt,
        });

    if (responseError) {
        console.error('Error creating poll response:', responseError);
        throw new Error('Failed to submit poll response');
    }

    // Insert answers
    const answersToInsert = answers.map((answer, index) => ({
        id: `${responseId}_a_${index}`,
        response_id: responseId,
        question_id: answer.questionId,
        selected_option_id: answer.selectedOptionId,
    }));

    const { error: answerError } = await supabase
        .from('poll_answers')
        .insert(answersToInsert);

    if (answerError) {
        console.error('Error creating poll answers:', answerError);
        throw new Error('Failed to submit poll answers');
    }
}

export async function getPollResults(pollId: string): Promise<PollResult[]> {
    const { data: poll } = await supabase
        .from('polls')
        .select(`
            *,
            poll_questions(
                *,
                poll_options(*),
                poll_answers(*)
            )
        `)
        .eq('id', pollId)
        .single();

    if (!poll) {
        return [];
    }

    const results: PollResult[] = [];

    for (const question of poll.poll_questions || []) {
        const totalResponses = question.poll_answers?.length || 0;
        const optionCounts: { [optionId: string]: number } = {};

        // Count responses for each option
        for (const answer of question.poll_answers || []) {
            optionCounts[answer.selected_option_id] = (optionCounts[answer.selected_option_id] || 0) + 1;
        }

        const options = (question.poll_options || []).map((option: any) => ({
            optionId: option.id,
            optionText: option.option_text,
            count: optionCounts[option.id] || 0,
            percentage: totalResponses > 0 ? Math.round(((optionCounts[option.id] || 0) / totalResponses) * 100) : 0,
        }));

        results.push({
            pollId,
            questionId: question.id,
            questionText: question.question_text,
            questionType: question.question_type,
            options,
            totalResponses,
        });
    }

    return results;
}

export async function hasUserRespondedToPoll(pollId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('poll_responses')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', userId)
        .single();

    return !!data;
}

export async function updatePollStatus(pollId: string, isActive: boolean, activeUntil: string | null): Promise<void> {
    const { error } = await supabase
        .from('polls')
        .update({
            is_active: isActive,
            active_until: activeUntil,
        })
        .eq('id', pollId);

    if (error) {
        console.error('Error updating poll status:', error);
        throw new Error('Failed to update poll status');
    }
}

export async function deletePoll(pollId: string): Promise<void> {
    // Delete in order: answers -> responses -> options -> questions -> poll
    await supabase.from('poll_answers').delete().in('response_id', 
        supabase.from('poll_responses').select('id').eq('poll_id', pollId)
    );
    
    await supabase.from('poll_responses').delete().eq('poll_id', pollId);
    
    await supabase.from('poll_options').delete().in('question_id',
        supabase.from('poll_questions').select('id').eq('poll_id', pollId)
    );
    
    await supabase.from('poll_questions').delete().eq('poll_id', pollId);
    
    const { error } = await supabase.from('polls').delete().eq('id', pollId);

    if (error) {
        console.error('Error deleting poll:', error);
        throw new Error('Failed to delete poll');
    }
}

// Helper function to convert database row to Poll object
function dbToPoll(dbPoll: any): Poll {
    return {
        id: dbPoll.id,
        title: dbPoll.title,
        description: dbPoll.description,
        isActive: dbPoll.is_active,
        activeUntil: dbPoll.active_until,
        createdAt: dbPoll.created_at,
        questions: (dbPoll.poll_questions || []).map((q: any) => ({
            id: q.id,
            pollId: q.poll_id,
            questionText: q.question_text,
            questionType: q.question_type,
            questionOrder: q.question_order,
            options: (q.poll_options || []).map((o: any) => ({
                id: o.id,
                questionId: o.question_id,
                optionText: o.option_text,
                optionOrder: o.option_order,
            })).sort((a: any, b: any) => a.optionOrder - b.optionOrder),
        })).sort((a: any, b: any) => a.questionOrder - b.questionOrder),
    };
}
