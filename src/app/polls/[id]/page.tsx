
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getPollForParticipation, submitPollResponse, type PollForParticipation, type PollAnswer } from '@/data/polls';
import withAuth from '@/components/with-auth';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function PollParticipationPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const pollId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [poll, setPoll] = useState<PollForParticipation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchPoll = async () => {
            setIsLoading(true);
            const pollData = await getPollForParticipation(pollId, user?.id || null);
            if (!pollData || pollData.user_has_voted) {
                // If poll doesn't exist, is inactive, or user voted, redirect them.
                // A more sophisticated version might show results instead.
                toast({ variant: 'destructive', title: 'Cannot Participate', description: 'This poll is unavailable or you have already voted.' });
                router.push('/polls');
                return;
            }
            setPoll(pollData);
            setIsLoading(false);
        };
        fetchPoll();
    }, [pollId, user, router, toast]);

    const handleAnswerChange = (questionId: string, optionId: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmit = async () => {
        // Validate that all questions have been answered
        if (Object.keys(answers).length !== poll?.questions.length) {
            toast({ variant: 'destructive', title: 'Incomplete Poll', description: 'Please answer all questions before submitting.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const responsePayload: PollAnswer[] = Object.entries(answers).map(([questionId, optionId]) => ({
                questionId,
                optionId,
            }));
            await submitPollResponse(pollId, user!.id, responsePayload);
            toast({ title: 'Thank You!', description: 'Your response has been submitted successfully.' });
            router.push('/polls');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const PageSkeleton = () => (
        <Card className="max-w-4xl mx-auto">
            <CardHeader><Skeleton className="h-8 w-3/4"/><Skeleton className="h-4 w-full mt-2"/></CardHeader>
            <CardContent className="space-y-8">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-4 p-4 border rounded-lg">
                        <Skeleton className="h-6 w-1/2" />
                        <div className="space-y-2"><Skeleton className="h-5 w-1/4"/><Skeleton className="h-5 w-1/4"/></div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col min-h-screen bg-secondary/50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-12">
                {isLoading ? <PageSkeleton /> : poll && (
                    <Card className="max-w-4xl mx-auto animate-in fade-in-0">
                        <CardHeader>
                            <CardTitle className="text-3xl font-headline">{poll.title}</CardTitle>
                            <CardDescription className="text-base">{poll.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {poll.questions.map((question, index) => (
                                <div key={question.id} className="p-4 border rounded-lg bg-background">
                                    <Label className="text-lg font-semibold mb-4 block">Question {index + 1}: {question.question_text}</Label>
                                    <RadioGroup onValueChange={(value) => handleAnswerChange(question.id, value)}>
                                        {question.options.map(option => (
                                            <div key={option.id} className="flex items-center space-x-2">
                                                <RadioGroupItem value={option.id} id={option.id} />
                                                <Label htmlFor={option.id} className="text-base font-normal">{option.option_text}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            ))}
                            <div className="flex justify-end">
                                <Button size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                                    Submit My Vote
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>
            <Footer />
        </div>
    );
}

export default withAuth(PollParticipationPage);
