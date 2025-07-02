
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPollsForAdmin, deletePoll, type PollListItem } from '@/data/polls';
import { addNotification } from '@/data/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, CheckCircle, XCircle, Loader2, BarChart, ChevronLeft, Megaphone } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import PollResults from './results';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AdminPollsPage() {
    const [polls, setPolls] = useState<PollListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    const fetchPolls = async () => {
        setIsLoading(true);
        const pollsData = await getPollsForAdmin();
        setPolls(pollsData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPolls();
    }, []);

    const handleDeletePoll = async (pollId: string) => {
        if (selectedPollId === pollId) {
            setSelectedPollId(null);
        }
        setIsDeleting(true);
        try {
            await deletePoll(pollId);
            toast({ variant: 'destructive', title: 'Poll Deleted', description: 'The poll and all its responses have been removed.' });
            await fetchPolls();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the poll.' });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleViewResults = (pollId: string) => {
        setSelectedPollId(pollId);
        setTimeout(() => {
            document.getElementById('poll-results-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };
    
    const handlePromotePoll = async (pollId: string, pollTitle: string) => {
        try {
            await addNotification({
                message: `New Poll: "${pollTitle}". Click here to participate!`,
                isActive: true,
                startTime: new Date().toISOString(),
                endTime: null, // No end time unless specified
                link: `/polls/${pollId}`,
            });
            toast({ title: "Poll Promoted", description: "A notification has been created for this poll." });
            setPolls(currentPolls => currentPolls.map(p => 
                p.id === pollId ? { ...p, is_promoted: true } : p
            ));
        } catch (error) {
            toast({ variant: 'destructive', title: 'Promotion Failed', description: 'Could not create the notification.' });
        }
    };

    const TableSkeleton = () => (
         <div className="border rounded-md p-4">
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-headline">Manage Polls</h1>
                <Button variant="outline" onClick={() => router.back()}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Tools
                </Button>
            </div>
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>Polls &amp; Surveys</CardTitle>
                        <CardDescription>Create, manage, and view results for all public polls.</CardDescription>
                    </div>
                    <Button onClick={() => router.push('/admin/tools/polls/create')}>
                        <PlusCircle className="mr-2" /> Create Poll
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? <TableSkeleton /> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Active Until</TableHead>
                                    <TableHead>Responses</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {polls.length > 0 ? polls.map(poll => (
                                    <TableRow key={poll.id}>
                                        <TableCell className="font-medium">{poll.title}</TableCell>
                                        <TableCell>
                                            <Badge variant={poll.is_active ? 'default' : 'secondary'} className={cn(poll.is_active && 'bg-green-600')}>
                                                {poll.is_active ? <CheckCircle className="h-3 w-3 mr-1"/> : <XCircle className="h-3 w-3 mr-1"/>}
                                                {poll.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{poll.active_until ? format(new Date(poll.active_until), 'MMM dd, yyyy') : 'No limit'}</TableCell>
                                        <TableCell>{poll.response_count}</TableCell>
                                        <TableCell className="text-right space-x-0.5">
                                            {poll.is_promoted ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" disabled>
                                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>This poll has been promoted.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" disabled={!poll.is_active}>
                                                            <Megaphone className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Promote this Poll?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will create a site-wide notification banner linking to this poll. Are you sure?</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handlePromotePoll(poll.id, poll.title)}>Confirm & Promote</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleViewResults(poll.id)} disabled={poll.response_count === 0}>
                                                <BarChart className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/tools/polls/${poll.id}`)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isDeleting}>
                                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete this poll and all associated user responses. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeletePoll(poll.id)} className="bg-destructive hover:bg-destructive/90">
                                                            Yes, delete poll
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No polls created yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {selectedPollId && (
                <PollResults pollId={selectedPollId} onClose={() => setSelectedPollId(null)} />
            )}
        </div>
    );
}
