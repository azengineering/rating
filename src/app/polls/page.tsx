
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { getActivePollsForUser } from '@/data/polls';
import type { PollListItem } from '@/data/polls';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Vote, Check, Clock, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';

type PollCardProps = {
    poll: PollListItem & { user_has_voted: boolean };
    onParticipateClick: (pollId: string) => void;
};

const PollCard = ({ poll, onParticipateClick }: PollCardProps) => {
    return (
        <Card className="flex flex-col h-full bg-card hover:border-primary/50 border-transparent border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-2xl group">
            <CardHeader>
                <div className="flex justify-between items-start gap-4">
                    <CardTitle className="font-headline text-lg group-hover:text-primary transition-colors">{poll.title}</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                         <Vote className="h-6 w-6 text-primary" />
                    </div>
                </div>
                {poll.description && <CardDescription className="text-xs line-clamp-2 pt-1">{poll.description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex-grow space-y-2 text-sm text-muted-foreground pt-0">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary/70" />
                    <span>
                        {poll.active_until ? `Closes on ${format(new Date(poll.active_until), 'PPP')}` : 'No end date'}
                    </span>
                </div>
                 <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary/70" />
                    <span>{poll.response_count} total response(s)</span>
                </div>
            </CardContent>
            <CardFooter className="p-4 bg-secondary/30 rounded-b-2xl">
                {poll.user_has_voted ? (
                     <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
                        <Check className="mr-2"/> Voted
                    </Button>
                ) : (
                    <Button 
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20" 
                        onClick={() => onParticipateClick(poll.id)}
                    >
                        <Vote className="mr-2"/> Participate Now
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

export default function PollsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [polls, setPolls] = useState<(PollListItem & { user_has_voted: boolean; description: string | null; })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [selectedPollId, setSelectedPollId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPolls = async () => {
            setIsLoading(true);
            const pollsData = await getActivePollsForUser(user?.id || null);
            setPolls(pollsData);
            setIsLoading(false);
        };
        fetchPolls();
    }, [user]);
    
    const handleParticipate = (pollId: string) => {
        if (!user) {
            setSelectedPollId(pollId);
            setShowLoginDialog(true);
        } else {
            router.push(`/polls/${pollId}`);
        }
    };
    
    const PollsSkeleton = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <Card key={i} className="flex flex-col rounded-2xl">
                    <CardHeader className="bg-secondary/50"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full mt-2" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
                    <CardContent className="flex-grow pt-4"><Skeleton className="h-4 w-2/3" /></CardContent>
                    <CardFooter className="p-4"><Skeleton className="h-10 w-full" /></CardFooter>
                </Card>
            ))}
        </div>
    );

    return (
        <>
            <div className="flex flex-col min-h-screen bg-secondary/50">
                <Header />
                <main className="flex-grow container mx-auto px-4 py-12">
                    <div className="text-left mb-12">
                        <h1 className="text-3xl font-extrabold font-headline text-primary">Active Polls &amp; Surveys</h1>
                        <p className="mt-2 max-w-2xl text-md text-muted-foreground">
                            Your opinion matters. Participate in ongoing polls to make your voice heard on important issues.
                        </p>
                    </div>

                    {isLoading ? (
                        <PollsSkeleton />
                    ) : polls.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {polls.map(poll => (
                                <PollCard key={poll.id} poll={poll} onParticipateClick={handleParticipate} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 px-4 rounded-lg bg-background border-2 border-dashed">
                            <Vote className="w-16 h-16 mx-auto text-muted-foreground" />
                            <h2 className="mt-6 text-2xl font-semibold">No Active Polls</h2>
                            <p className="mt-2 text-muted-foreground">There are no active polls at the moment. Please check back later.</p>
                        </div>
                    )}
                </main>
                <Footer />
            </div>

            <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Login Required</AlertDialogTitle>
                        <AlertDialogDescription>
                            You must be logged in to participate in a poll. Please log in to continue.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedPollId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.push(`/login?redirect=/polls/${selectedPollId}`)}>
                            Login
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
