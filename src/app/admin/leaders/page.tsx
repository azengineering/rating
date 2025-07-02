
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getLeadersForAdminPanel, deleteLeader, updateLeaderStatus, type Leader } from "@/data/leaders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Trash2, Clock, Calendar as CalendarIcon, RotateCcw, Loader2, Search, ChevronDown, UserCheck, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from "react-day-picker";
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { indianStates } from '@/data/locations';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type LeaderStatus = 'pending' | 'approved' | 'rejected';

export default function AdminLeadersPage() {
    const [allFoundLeaders, setAllFoundLeaders] = useState<Leader[]>([]);
    const [pendingLeaders, setPendingLeaders] = useState<Leader[]>([]);
    const [approvedLeaders, setApprovedLeaders] = useState<Leader[]>([]);
    const [rejectedLeaders, setRejectedLeaders] = useState<Leader[]>([]);
    
    const [isSearching, setIsSearching] = useState(true);
    const [isPending, startTransition] = useTransition();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Filter states
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [selectedState, setSelectedState] = useState<string>('all-states');
    const [constituency, setConstituency] = useState<string>('');
    const [candidateName, setCandidateName] = useState<string>('');
    
    // Dialog states
    const [statusChangeInfo, setStatusChangeInfo] = useState<{ leaderId: string; newStatus: LeaderStatus } | null>(null);
    const [statusChangeComment, setStatusChangeComment] = useState('');
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

    const fetchLeaders = useCallback(async (filters: {
        dateFrom?: string | null;
        dateTo?: string | null;
        state?: string | null;
        constituency?: string | null;
        candidateName?: string | null;
    }) => {
        setIsSearching(true);
        const leaders = await getLeadersForAdminPanel({
            dateFrom: filters.dateFrom ? filters.dateFrom + 'T00:00:00.000Z' : undefined,
            dateTo: filters.dateTo ? filters.dateTo + 'T23:59:59.999Z' : undefined,
            state: (filters.state === 'all-states' || !filters.state) ? undefined : filters.state,
            constituency: filters.constituency?.trim() || undefined,
            candidateName: filters.candidateName?.trim() || undefined,
        });
        setAllFoundLeaders(leaders);
        setIsSearching(false);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        const fromParam = params.get('from');
        const toParam = params.get('to');
        const stateParam = params.get('state');
        const constiParam = params.get('constituency');
        const nameParam = params.get('name');

        // Sync URL params to local state for the input fields
        if (fromParam) {
            setDate({ from: new Date(fromParam), to: toParam ? new Date(toParam) : undefined });
        } else {
            setDate(undefined);
        }
        setSelectedState(stateParam || 'all-states');
        setConstituency(constiParam || '');
        setCandidateName(nameParam || '');

        fetchLeaders({ dateFrom: fromParam, dateTo: toParam, state: stateParam, constituency: constiParam, candidateName: nameParam });
    }, [searchParams, fetchLeaders]);

    useEffect(() => {
        setPendingLeaders(allFoundLeaders.filter(l => l.status === 'pending'));
        setApprovedLeaders(allFoundLeaders.filter(l => l.status === 'approved'));
        setRejectedLeaders(allFoundLeaders.filter(l => l.status === 'rejected'));
    }, [allFoundLeaders]);

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams);
        if (date?.from) {
             params.set('from', date.from.toISOString().split('T')[0]);
             if (date.to) {
                 params.set('to', date.to.toISOString().split('T')[0]);
             } else {
                 params.delete('to');
             }
        } else {
            params.delete('from');
            params.delete('to');
        }

        if (selectedState && selectedState !== 'all-states') {
             params.set('state', selectedState);
        } else {
             params.delete('state');
        }

        if (constituency.trim()) {
            params.set('constituency', constituency.trim());
        } else {
            params.delete('constituency');
        }

        if (candidateName.trim()) {
            params.set('name', candidateName.trim());
        } else {
            params.delete('name');
        }
        
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleReset = () => {
        router.push(pathname);
    };
    
    const handleStatusChangeClick = (leaderId: string, currentComment: string | null | undefined, newStatus: LeaderStatus) => {
        setStatusChangeInfo({ leaderId, newStatus });
        setStatusChangeComment(currentComment || '');
    };

    const handleStatusUpdate = async () => {
        if (!statusChangeInfo) return;
        if (!statusChangeComment.trim() && statusChangeInfo.newStatus === 'rejected') {
            toast({ variant: 'destructive', title: 'Comment Required', description: 'A comment is required to reject a submission.' });
            return;
        }

        setIsStatusSubmitting(true);
        await updateLeaderStatus(statusChangeInfo.leaderId, statusChangeInfo.newStatus, statusChangeComment);
        toast({ title: "Leader Status Updated" });
        
        setStatusChangeInfo(null);
        setStatusChangeComment('');
        setIsStatusSubmitting(false);

        const params = new URLSearchParams(searchParams);
        await fetchLeaders({
            dateFrom: params.get('from'),
            dateTo: params.get('to'),
            state: params.get('state'),
            constituency: params.get('constituency'),
            candidateName: params.get('name'),
        });
    };

    const handleDelete = (leaderId: string, leaderName: string) => {
        startTransition(async () => {
            await deleteLeader(leaderId);
            toast({ variant: 'destructive', title: "Leader Deleted", description: `${leaderName} has been removed from the database.` });
            
            const params = new URLSearchParams(searchParams);
            await fetchLeaders({
                dateFrom: params.get('from'),
                dateTo: params.get('to'),
                state: params.get('state'),
                constituency: params.get('constituency'),
                candidateName: params.get('name'),
            });
        });
    };
    
    const handleNameClick = (userId: string | null | undefined, leaderId: string) => {
        if (userId) {
            router.push(`/admin/users?userId=${userId}&leaderId=${leaderId}`);
        } else {
            toast({
                variant: 'destructive',
                title: "No User Associated",
                description: "This leader was not added by a registered user."
            });
        }
    };
    
    const handleEditClick = (leader: Leader) => {
        if (leader.addedByUserId) {
            router.push(`/admin/users?userId=${leader.addedByUserId}&leaderId=${leader.id}&action=edit`);
        }
        // For leaders without an associated user, this function will now do nothing.
    };
    
    const hasFiltersApplied = searchParams.size > 0;

    const LeaderTable = ({ leaders }: { leaders: Leader[] }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Constituency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {leaders.length > 0 ? leaders.map((leader: Leader) => (
                    <TableRow key={leader.id}>
                        <TableCell>
                            <Button variant="link" className="p-0 h-auto font-medium" onClick={() => handleNameClick(leader.addedByUserId, leader.id)}>
                                {leader.name}
                            </Button>
                            <div className="text-sm text-muted-foreground">{leader.partyName}</div>
                        </TableCell>
                        <TableCell>
                            <Button variant="link" className="p-0 h-auto text-muted-foreground" onClick={() => handleNameClick(leader.addedByUserId, leader.id)}>
                                {leader.userName || 'Admin/System'}
                            </Button>
                        </TableCell>
                        <TableCell>{leader.constituency}</TableCell>
                        <TableCell>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className={cn("w-32 justify-between",
                                        leader.status === 'approved' && 'border-green-500 text-green-600',
                                        leader.status === 'rejected' && 'border-red-500 text-red-600'
                                    )}>
                                        <span className="capitalize">{leader.status}</span>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => handleStatusChangeClick(leader.id, leader.adminComment, 'approved')}>Approved</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleStatusChangeClick(leader.id, leader.adminComment, 'pending')}>Pending</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleStatusChangeClick(leader.id, leader.adminComment, 'rejected')}>Rejected</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right">
                             <Button variant="ghost" size="sm" onClick={() => handleEditClick(leader)} disabled={!leader.addedByUserId}>
                                <Edit className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={isPending}>
                                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the leader and all associated ratings and comments.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(leader.id, leader.name)} className="bg-destructive hover:bg-destructive/90">
                                            Yes, delete it
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No leaders match the current criteria.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    const TableSkeleton = () => (
         <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Leader Management &amp; Search</CardTitle>
                    <CardDescription>Filter, search, and manage all leader submissions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="grid gap-2 lg:col-span-2">
                            <Label>Date Range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal",!date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="state-filter">State</Label>
                            <Select value={selectedState} onValueChange={setSelectedState}>
                                <SelectTrigger id="state-filter" className="bg-background"><SelectValue placeholder="All States" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all-states">All States</SelectItem>
                                    {indianStates.map(state => (<SelectItem key={state} value={state}>{state}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="constituency-filter">Constituency</Label>
                            <Input id="constituency-filter" value={constituency} onChange={(e) => setConstituency(e.target.value)} placeholder="Constituency name" className="bg-background"/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mt-4">
                         <div className="grid gap-2 lg:col-span-2">
                            <Label htmlFor="candidate-filter">Candidate Name</Label>
                            <Input id="candidate-filter" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Enter candidate name..." className="bg-background"/>
                        </div>
                         <div className="flex gap-2 self-end lg:col-start-5">
                            <Button onClick={handleSearch} disabled={isSearching} className="w-full">
                                {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                Search
                            </Button>
                            <Button onClick={handleReset} variant="outline" disabled={isSearching} size="icon">
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </div>
                     </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{hasFiltersApplied ? 'Search Results' : 'All Leader Submissions'}</CardTitle>
                    <CardDescription>
                        {hasFiltersApplied 
                            ? 'Showing all leaders matching your criteria.' 
                            : 'A list of all pending, approved, and rejected leaders.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="pending">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending">
                                <Clock className="mr-2 h-4 w-4"/>Pending <Badge variant="secondary" className="ml-2">{pendingLeaders.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="approved">
                                <CheckCircle className="mr-2 h-4 w-4"/>Approved <Badge variant="secondary" className="ml-2">{approvedLeaders.length}</Badge>
                            </TabsTrigger>
                             <TabsTrigger value="rejected">
                                <XCircle className="mr-2 h-4 w-4"/>Rejected <Badge variant="secondary" className="ml-2">{rejectedLeaders.length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending" className="mt-4">
                            {isSearching ? <TableSkeleton /> : <LeaderTable leaders={pendingLeaders} />}
                        </TabsContent>
                        <TabsContent value="approved" className="mt-4">
                            {isSearching ? <TableSkeleton /> : <LeaderTable leaders={approvedLeaders} />}
                        </TabsContent>
                         <TabsContent value="rejected" className="mt-4">
                            {isSearching ? <TableSkeleton /> : <LeaderTable leaders={rejectedLeaders} />}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={!!statusChangeInfo} onOpenChange={() => setStatusChangeInfo(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Leader Status</DialogTitle>
                  <DialogDescription>
                    You are changing the status to <span className="font-bold capitalize">{statusChangeInfo?.newStatus}</span>. A comment is required for rejection.
                  </DialogDescription>
                </DialogHeader>
                <div className="px-6 py-4">
                  <Label htmlFor="status-comment">Admin Comment</Label>
                  <Textarea id="status-comment" value={statusChangeComment} onChange={(e) => setStatusChangeComment(e.target.value)} placeholder="Provide a reason for this status change..." className="mt-2"/>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setStatusChangeInfo(null)}>Cancel</Button>
                  <Button onClick={handleStatusUpdate} disabled={isStatusSubmitting}>
                    {isStatusSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Update
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    );
}
