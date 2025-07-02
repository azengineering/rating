
'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { addDays } from 'date-fns';

import { getUsers, type User, blockUser, unblockUser, addAdminMessage, getAdminMessages, deleteAdminMessage, type AdminMessage } from "@/data/users";
import { getActivitiesForUser, getLeadersAddedByUser, type UserActivity, type Leader, deleteRating, approveLeader, deleteLeader as deleteLeaderAction, getLeaderById, updateLeader, updateLeaderStatus } from "@/data/leaders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, RotateCw, X, Star, MoreVertical, Ban, Unlock, MessageSquareWarning, Trash2, Edit, UserCheck, PlusCircle, ChevronDown, Info, ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { indianStates } from '@/data/locations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import ManifestoDialog from '@/components/manifesto-dialog';

// The User type from the data layer will include these optional counts
type UserWithCounts = User & {
    ratingCount?: number;
    leaderAddedCount?: number;
    unreadMessageCount?: number;
};

type SelectedTab = 'profile' | 'ratings' | 'leaders' | 'messages';
type LeaderStatus = 'pending' | 'approved' | 'rejected';

const blockFormSchema = z.object({
  durationType: z.enum(['temporary', 'permanent']),
  days: z.coerce.number().int().positive().optional(),
  reason: z.string().min(10, { message: "Reason must be at least 10 characters." }),
}).refine(data => {
  if (data.durationType === 'temporary') {
    return data.days !== undefined && data.days > 0;
  }
  return true;
}, {
  message: "Number of days is required for a temporary block.",
  path: ['days'],
});

const messageFormSchema = z.object({
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

const MAX_PHOTO_SIZE_MB = 1;
const MAX_MANIFESTO_SIZE_MB = 5;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
const MAX_MANIFESTO_SIZE_BYTES = MAX_MANIFESTO_SIZE_MB * 1024 * 1024;

const leaderEditSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  partyName: z.string().min(1, { message: "Party name is required." }),
  electionType: z.enum(['national', 'state', 'panchayat'], { required_error: "Please select an election type."}),
  constituency: z.string().min(1, { message: "Constituency is required." }),
  gender: z.enum(['male', 'female', 'other'], { required_error: "Please select a gender."}),
  age: z.coerce.number().int({ message: "Age must be a whole number." }).positive({ message: "Age must be positive." }).min(25, { message: "Candidate must be at least 25 years old." }),
  nativeAddress: z.string().min(1, { message: "Native address is required." }),
  state: z.string().optional(),
  previousElections: z.array(z.object({
    electionType: z.string().min(1, { message: "Required" }),
    constituency: z.string().min(1, { message: "Required" }),
    state: z.string().optional(),
    status: z.enum(['winner', 'loser']),
    electionYear: z.string().min(4, { message: "Invalid year" }).max(4, { message: "Invalid year" }),
    partyName: z.string().min(1, { message: "Required" }),
  })).optional(),
  twitterUrl: z.string().url({ message: "Please enter a valid X/Twitter URL." }).optional().or(z.literal('')),
  photoUrl: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_PHOTO_SIZE_BYTES,
      { message: `Max photo size is ${MAX_PHOTO_SIZE_MB}MB.` }
    ),
  manifestoUrl: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_MANIFESTO_SIZE_BYTES,
      { message: `Max manifesto size is ${MAX_MANIFESTO_SIZE_MB}MB.` }
    ),
}).refine(data => {
    if (data.electionType === 'state' || data.electionType === 'panchayat') {
        return !!data.state;
    }
    return true;
}, {
  message: "State is required",
  path: ["state"],
});

const ProfileInfo = ({ label, value }: {label: string, value: string | number | undefined | null}) => (
    <div>
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <p className="text-base font-medium">{value || 'N/A'}</p>
    </div>
);

export default function AdminUsersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [users, setUsers] = useState<UserWithCounts[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserWithCounts | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [selectedTab, setSelectedTab] = useState<SelectedTab>('profile');
    const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
    const [userAddedLeaders, setUserAddedLeaders] = useState<Leader[]>([]);
    const [userAdminMessages, setUserAdminMessages] = useState<AdminMessage[]>([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    
    const [isBlockUserDialogOpen, setBlockUserDialogOpen] = useState(false);
    const [isSendMessageDialogOpen, setSendMessageDialogOpen] = useState(false);
    const [selectedLeaderForView, setSelectedLeaderForView] = useState<Leader | null>(null);
    const [isEditLeaderDialogOpen, setEditLeaderDialogOpen] = useState(false);
    const [leaderToEdit, setLeaderToEdit] = useState<Leader | null>(null);
    const [manifestoForView, setManifestoForView] = useState<{url: string; name: string} | null>(null);
    
    // State for handling file removal in edit dialog
    const [photoRemoved, setPhotoRemoved] = useState(false);
    const [manifestoRemoved, setManifestoRemoved] = useState(false);

    // State for status change dialog
    const [statusChangeInfo, setStatusChangeInfo] = useState<{ leaderId: string; newStatus: LeaderStatus } | null>(null);
    const [statusChangeComment, setStatusChangeComment] = useState('');
    const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

    const blockUserForm = useForm<z.infer<typeof blockFormSchema>>({
      resolver: zodResolver(blockFormSchema),
      defaultValues: { durationType: 'temporary', reason: "", days: undefined },
    });
    
    const sendMessageForm = useForm<z.infer<typeof messageFormSchema>>({
      resolver: zodResolver(messageFormSchema),
      defaultValues: { message: "" },
    });
    
    const editLeaderForm = useForm<z.infer<typeof leaderEditSchema>>({
      resolver: zodResolver(leaderEditSchema),
      defaultValues: {
        name: "", partyName: "", constituency: "", nativeAddress: "",
        state: "", age: undefined, previousElections: [], twitterUrl: "",
        photoUrl: undefined, manifestoUrl: undefined,
      },
    });

    const { fields: prevElectionFields, append: appendPrevElection, remove: removePrevElection } = useFieldArray({
      control: editLeaderForm.control,
      name: "previousElections"
    });

    useEffect(() => {
        if (leaderToEdit) {
            editLeaderForm.reset({
              name: leaderToEdit.name,
              partyName: leaderToEdit.partyName,
              electionType: leaderToEdit.electionType,
              constituency: leaderToEdit.constituency,
              gender: leaderToEdit.gender,
              age: leaderToEdit.age,
              nativeAddress: leaderToEdit.nativeAddress,
              state: leaderToEdit.location.state || '',
              previousElections: leaderToEdit.previousElections || [],
              twitterUrl: leaderToEdit.twitterUrl || '',
              photoUrl: undefined,
              manifestoUrl: undefined,
            });
        }
    }, [leaderToEdit, editLeaderForm]);
    
    const handleSelectUser = useCallback((user: UserWithCounts, tab: SelectedTab = 'profile') => {
        if (selectedUser?.id === user.id) {
          // If already selected, just switch tab
          setSelectedTab(tab);
        } else {
          // If new user selected, reset everything
          setSelectedUser(user);
          setSelectedTab(tab);
          setUserActivities([]);
          setUserAddedLeaders([]);
          setUserAdminMessages([]);
          setSelectedLeaderForView(null);
        }
    }, [selectedUser?.id]);

    const fetchUsers = useCallback(async (query?: string) => {
        setIsLoading(true);
        setSelectedUser(null);
        setSelectedLeaderForView(null);
        const fetchedUsers = await getUsers(query);
        setUsers(fetchedUsers as UserWithCounts[]);
        setIsLoading(false);
        return fetchedUsers as UserWithCounts[];
    }, []);

     useEffect(() => {
        const userIdFromQuery = searchParams.get('userId');
        if (userIdFromQuery && !hasSearched) {
            const preselectUser = async () => {
                setIsLoading(true);
                setSearchTerm(userIdFromQuery);
                const fetchedUsers = await fetchUsers(userIdFromQuery);
                if (fetchedUsers.length > 0) {
                    handleSelectUser(fetchedUsers[0], 'leaders');
                }
                setHasSearched(true);
                setIsLoading(false);
            };
            preselectUser();
        }
    }, [searchParams, hasSearched, fetchUsers, handleSelectUser]);

    useEffect(() => {
      const leaderIdFromQuery = searchParams.get('leaderId');
      if (leaderIdFromQuery && selectedTab === 'leaders' && userAddedLeaders.length > 0) {
          const leaderToView = userAddedLeaders.find(l => l.id === leaderIdFromQuery);
          if (leaderToView) {
              setSelectedLeaderForView(leaderToView);
          }
      }
    }, [userAddedLeaders, searchParams, selectedTab]);

    const handleEditLeader = useCallback((leader: Leader) => {
        setLeaderToEdit(leader);
        setPhotoRemoved(false);
        setManifestoRemoved(false);
        setEditLeaderDialogOpen(true);
    }, []);

    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'edit' && selectedLeaderForView) {
            handleEditLeader(selectedLeaderForView);
            
            // Remove action from URL to prevent re-triggering on other state changes
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('action');
            const queryString = newParams.toString();
            router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`);
        }
    }, [selectedLeaderForView, searchParams, router, pathname, handleEditLeader]);


    const handleSearch = () => {
        if (!hasSearched) setHasSearched(true);
        fetchUsers(searchTerm);
    };
    
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };
    
    const handleReset = () => {
        setSearchTerm('');
        setUsers([]);
        setHasSearched(false);
        setSelectedUser(null);
        setSelectedLeaderForView(null);
    };

    const fetchUserRatings = useCallback(async (userId: string) => {
        setIsDetailsLoading(true);
        const activities = await getActivitiesForUser(userId);
        setUserActivities(activities);
        setIsDetailsLoading(false);
    }, []);

    const fetchUserLeaders = useCallback(async (userId: string) => {
        setIsDetailsLoading(true);
        const leaders = await getLeadersAddedByUser(userId);
        setUserAddedLeaders(leaders);
        setIsDetailsLoading(false);
    }, []);

    const fetchUserAdminMessages = useCallback(async (userId: string) => {
        setIsDetailsLoading(true);
        const messages = await getAdminMessages(userId);
        setUserAdminMessages(messages);
        setIsDetailsLoading(false);
    }, []);
    
    useEffect(() => {
        if (selectedUser) {
            if (selectedTab === 'ratings') fetchUserRatings(selectedUser.id);
            if (selectedTab === 'leaders') fetchUserLeaders(selectedUser.id);
            if (selectedTab === 'messages') fetchUserAdminMessages(selectedUser.id);
        }
    }, [selectedUser, selectedTab, fetchUserRatings, fetchUserLeaders, fetchUserAdminMessages]);

    const handleUnblockUser = () => {
      if (!selectedUser) return;
      startTransition(async () => {
        await unblockUser(selectedUser.id);
        toast({ title: "User Unblocked", description: `${selectedUser.name} can now access the platform again.` });
        const updatedUser = { ...selectedUser, isBlocked: false, blockReason: null, blockedUntil: null };
        setSelectedUser(updatedUser);
        setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
      });
    }

    const onBlockUserSubmit = (values: z.infer<typeof blockFormSchema>) => {
      if (!selectedUser) return;
      startTransition(async () => {
        try {
          const blockUntil = values.durationType === 'temporary'
            ? addDays(new Date(), values.days!).toISOString()
            : null;
          
          await blockUser(selectedUser.id, values.reason, blockUntil);

          toast({ title: "User Blocked", description: `${selectedUser.name} has been blocked.` });
          setBlockUserDialogOpen(false);
          blockUserForm.reset({ durationType: 'temporary', reason: "", days: undefined });

          const updatedUser = { ...selectedUser, isBlocked: true, blockReason: values.reason, blockedUntil: blockUntil };
          setSelectedUser(updatedUser);
          setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
        } catch (error) {
          toast({ variant: 'destructive', title: "Failed to block user", description: String(error) });
        }
      });
    }

    const onSendMessageSubmit = (values: z.infer<typeof messageFormSchema>) => {
      if (!selectedUser) return;
      startTransition(async () => {
        await addAdminMessage(selectedUser.id, values.message);
        toast({ title: "Message Sent", description: "The message has been sent to the user." });
        setSendMessageDialogOpen(false);
        sendMessageForm.reset();
        if (selectedTab === 'messages') {
          fetchUserAdminMessages(selectedUser.id);
        }
        fetchUsers(searchTerm);
      });
    }
    
    const handleDeleteMessage = (messageId: string) => {
        if (!selectedUser) return;
        startTransition(async () => {
            await deleteAdminMessage(messageId);
            toast({ title: "Message Deleted" });
            fetchUserAdminMessages(selectedUser.id);
            fetchUsers(searchTerm);
        });
    }
    
    const handleDeleteRating = (userId: string, leaderId: string) => {
      if (!selectedUser) return;
      startTransition(async () => {
        try {
          await deleteRating(userId, leaderId);
          toast({ title: "Rating Deleted", description: "The user's rating has been removed." });
          fetchUserRatings(selectedUser.id);
          fetchUsers(searchTerm);
        } catch (error) {
          toast({ variant: 'destructive', title: "Failed to delete rating", description: String(error) });
        }
      });
    };
    
    const handleStatusChangeClick = (leaderId: string, newStatus: LeaderStatus) => {
        const leader = userAddedLeaders.find(l => l.id === leaderId);
        if (leader) {
            setStatusChangeInfo({ leaderId, newStatus });
            setStatusChangeComment(leader.adminComment || '');
        }
    };

    const handleStatusUpdate = async () => {
        if (!statusChangeInfo) return;
        if (!statusChangeComment.trim()) {
            toast({ variant: 'destructive', title: 'Comment Required', description: 'A comment is required to update the status.' });
            return;
        }

        setIsStatusSubmitting(true);
        startTransition(async () => {
            await updateLeaderStatus(statusChangeInfo.leaderId, statusChangeInfo.newStatus, statusChangeComment);
            toast({ title: "Leader Status Updated" });
            
            // Refetch data
            if (selectedUser) {
              const updatedLeaders = await getLeadersAddedByUser(selectedUser.id);
              setUserAddedLeaders(updatedLeaders);
              
              const leaderInView = selectedLeaderForView && selectedLeaderForView.id === statusChangeInfo.leaderId;
              if (leaderInView) {
                const refreshedLeader = updatedLeaders.find(l => l.id === statusChangeInfo.leaderId);
                if (refreshedLeader) setSelectedLeaderForView(refreshedLeader);
              }
            }
            
            setStatusChangeInfo(null);
            setStatusChangeComment('');
        });
        setIsStatusSubmitting(false);
    };

    const onEditLeaderSubmit = async (values: z.infer<typeof leaderEditSchema>) => {
      if (!leaderToEdit || !selectedUser) return;
      startTransition(async () => {
        try {
          const fileToDataUri = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    resolve(event.target.result as string);
                } else {
                    reject(new Error("Failed to read file."));
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
          });
    
          let photoDataUrl = leaderToEdit.photoUrl;
          if (photoRemoved) {
            photoDataUrl = '';
          } else if (values.photoUrl && values.photoUrl.length > 0) {
              try {
                  photoDataUrl = await fileToDataUri(values.photoUrl[0]);
              } catch (error) {
                  toast({ variant: 'destructive', title: 'Error uploading photo.' });
                  return;
              }
          }
    
          let manifestoDataUrl = leaderToEdit.manifestoUrl;
          if (manifestoRemoved) {
            manifestoDataUrl = '';
          } else if (values.manifestoUrl && values.manifestoUrl.length > 0) {
              try {
                  manifestoDataUrl = await fileToDataUri(values.manifestoUrl[0]);
              } catch (error) {
                  toast({ variant: 'destructive', title: 'Error uploading manifesto.' });
                  return;
              }
          }

          const leaderPayload = {
            name: values.name,
            partyName: values.partyName,
            constituency: values.constituency,
            electionType: values.electionType,
            gender: values.gender,
            age: values.age,
            nativeAddress: values.nativeAddress,
            location: {
              state: values.state,
              district: leaderToEdit.location.district,
            },
            previousElections: values.previousElections || [],
            twitterUrl: values.twitterUrl,
            photoUrl: photoDataUrl,
            manifestoUrl: manifestoDataUrl,
          };
          
          await updateLeader(leaderToEdit.id, leaderPayload, selectedUser.id, true);
          toast({ title: "Leader Updated Successfully" });
          setEditLeaderDialogOpen(false);
          setLeaderToEdit(null);

          // Refresh data in the UI
          fetchUserLeaders(selectedUser.id);
          const updatedLeader = await getLeaderById(leaderToEdit.id);
          if (updatedLeader) setSelectedLeaderForView(updatedLeader);

        } catch(error) {
          toast({ variant: 'destructive', title: 'Update Failed', description: String(error) });
        }
      });
    };

    const handleDeleteLeader = (leaderId: string) => {
      if (!selectedUser) return;
      startTransition(async () => {
        await deleteLeaderAction(leaderId);
        toast({ title: "Leader Deleted", variant: 'destructive' });
        fetchUserLeaders(selectedUser.id);
        fetchUsers(searchTerm);
        setSelectedLeaderForView(null);
      });
    };

    const TableSkeleton = () => (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Joined On</TableHead>
                        <TableHead className="text-center">Ratings</TableHead>
                        <TableHead className="text-center">Leaders Added</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-40" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-headline">User Management</h1>
                <Button variant="outline" onClick={() => router.back()}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>User Search</CardTitle>
                    <CardDescription>Search for registered users and perform administrative actions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                        <Input
                            placeholder="Search by name, email, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="max-w-sm"
                        />
                        <Button onClick={handleSearch} disabled={isLoading || isPending}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Search
                        </Button>
                        <Button onClick={handleReset} variant="outline" size="icon" disabled={isLoading || isPending}>
                            <RotateCw className="h-4 w-4" />
                            <span className="sr-only">Reset search</span>
                        </Button>
                    </div>
                    
                    {isLoading ? <TableSkeleton /> : hasSearched ? (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Joined On</TableHead>
                                        <TableHead className="text-center">Ratings</TableHead>
                                        <TableHead className="text-center">Leaders Added</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length > 0 ? (
                                        users.map((user: UserWithCounts) => (
                                            <TableRow 
                                                key={user.id}
                                                className={cn("cursor-pointer", selectedUser?.id === user.id && "bg-secondary")}
                                            >
                                                <TableCell onClick={() => handleSelectUser(user, 'profile')}>
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-medium hover:text-primary hover:underline">{user.name || 'N/A'}</span>
                                                        {user.isBlocked ? (
                                                          <TooltipProvider>
                                                            <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <Badge variant="destructive" className="cursor-pointer"><Ban className="h-3 w-3" /></Badge>
                                                              </TooltipTrigger>
                                                              <TooltipContent><p>User is Blocked</p></TooltipContent>
                                                            </Tooltip>
                                                          </TooltipProvider>
                                                        ) : null}
                                                        {user.unreadMessageCount && user.unreadMessageCount > 0 ? (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-auto w-auto p-0" onClick={(e) => { e.stopPropagation(); handleSelectUser(user, 'messages'); }}>
                                                                            <Badge variant="outline" className="border-amber-500 text-amber-500 cursor-pointer">
                                                                                <MessageSquareWarning className="h-4 w-4" />
                                                                            </Badge>
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{user.unreadMessageCount} unread message(s)</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                                    <div className="text-xs text-muted-foreground/70">ID: {user.id}</div>
                                                </TableCell>
                                                <TableCell onClick={() => handleSelectUser(user, 'profile')}>
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                                                </TableCell>
                                                <TableCell 
                                                    className="text-center font-medium hover:text-primary hover:underline"
                                                    onClick={() => handleSelectUser(user, 'ratings')}
                                                >
                                                    {user.ratingCount}
                                                </TableCell>
                                                <TableCell 
                                                    className="text-center font-medium hover:text-primary hover:underline"
                                                    onClick={() => handleSelectUser(user, 'leaders')}
                                                >
                                                    {user.leaderAddedCount}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                No users found matching your search.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-16 px-4 rounded-lg bg-secondary border-2 border-dashed border-border">
                            <h3 className="text-lg font-semibold">Search for Users</h3>
                            <p className="mt-2 text-muted-foreground">
                                Enter a name, email, or user ID to begin your search.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {selectedUser && (
                <Card className="animate-in fade-in-0">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>User Details</CardTitle>
                            <CardDescription>Full profile and activity for {selectedUser.name}.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close user details</span>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as SelectedTab)} className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="profile">Profile</TabsTrigger>
                                <TabsTrigger value="ratings">Ratings ({selectedUser.ratingCount})</TabsTrigger>
                                <TabsTrigger value="leaders">Leaders Added ({selectedUser.leaderAddedCount})</TabsTrigger>
                                <TabsTrigger value="messages">Admin Messages</TabsTrigger>
                            </TabsList>
                            <TabsContent value="profile" className="mt-4">
                                {selectedUser.isBlocked ? (
                                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive mb-4">
                                    <h4 className="font-bold flex items-center gap-2"><Ban /> User Blocked</h4>
                                    <p className="text-sm mt-2"><strong>Reason:</strong> {selectedUser.blockReason}</p>
                                    <p className="text-sm"><strong>Blocked Until:</strong> {selectedUser.blockedUntil ? new Date(selectedUser.blockedUntil).toLocaleString() : 'Permanent'}</p>
                                  </div>
                                ) : null}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                    <ProfileInfo label="Name" value={selectedUser.name} />
                                    <ProfileInfo label="Email" value={selectedUser.email} />
                                    <ProfileInfo label="User ID" value={selectedUser.id} />
                                    <ProfileInfo label="Gender" value={selectedUser.gender} />
                                    <ProfileInfo label="Age" value={selectedUser.age} />
                                    <ProfileInfo label="Joined On" value={selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : 'N/A'} />
                                </div>
                                <Separator className="my-4" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <ProfileInfo label="State" value={selectedUser.state} />
                                    <ProfileInfo label="MP Constituency" value={selectedUser.mpConstituency} />
                                    <ProfileInfo label="MLA Constituency" value={selectedUser.mlaConstituency} />
                                    <ProfileInfo label="Panchayat / Corporation" value={selectedUser.panchayat} />
                                </div>
                            </TabsContent>
                            <TabsContent value="ratings" className="mt-4">
                                {isDetailsLoading ? <p>Loading ratings...</p> : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Leader</TableHead>
                                                <TableHead>Rating</TableHead>
                                                <TableHead>Social Behaviour</TableHead>
                                                <TableHead>Comment</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {userActivities.length > 0 ? userActivities.map(activity => (
                                            <TableRow key={activity.leaderId}>
                                                <TableCell>{activity.leaderName}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                        {activity.rating}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="capitalize">{activity.socialBehaviour?.replace('-', ' ') || 'N/A'}</TableCell>
                                                <TableCell className="max-w-xs truncate">{activity.comment || 'N/A'}</TableCell>
                                                <TableCell>{new Date(activity.updatedAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                          <Button variant="ghost" size="icon" disabled={isPending}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                          </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete this rating?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action cannot be undone. It will permanently delete the rating and associated comment, and the leader's overall score will be recalculated.</AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteRating(selectedUser.id, activity.leaderId)} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction>
                                                          </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                      </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={6} className="text-center h-24">This user has not submitted any ratings.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                )}
                            </TabsContent>
                            <TabsContent value="leaders" className="mt-4">
                                {isDetailsLoading ? <p>Loading leaders...</p> : (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Leader</TableHead>
                                                    <TableHead>Constituency</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Date Added</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {userAddedLeaders.length > 0 ? userAddedLeaders.map(leader => (
                                                    <TableRow key={leader.id}>
                                                        <TableCell>
                                                            <Button variant="link" className="p-0 h-auto font-medium" onClick={() => setSelectedLeaderForView(leader)}>
                                                                {leader.name}
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
                                                                    <DropdownMenuItem onSelect={() => handleStatusChangeClick(leader.id, 'approved')}>Approved</DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={() => handleStatusChangeClick(leader.id, 'pending')}>Pending</DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={() => handleStatusChangeClick(leader.id, 'rejected')}>Rejected</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                        <TableCell className="text-right">{leader.createdAt ? new Date(leader.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                                                    </TableRow>
                                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">This user has not added any leaders.</TableCell></TableRow>}
                                            </TableBody>
                                        </Table>
                                        {selectedLeaderForView && (
                                            <Card className="mt-6 bg-secondary/50" key={selectedLeaderForView.id}>
                                                <CardHeader>
                                                    <div className="flex justify-between items-start">
                                                      <div className="flex items-start gap-4">
                                                        <Image src={selectedLeaderForView.photoUrl || 'https://placehold.co/400x400.png'} alt={selectedLeaderForView.name} width={64} height={64} className="rounded-lg object-cover" />
                                                        <div>
                                                            <CardTitle className="flex items-center gap-2">{selectedLeaderForView.name}</CardTitle>
                                                            <CardDescription>{selectedLeaderForView.partyName}</CardDescription>
                                                        </div>
                                                      </div>
                                                      <Button variant="ghost" size="icon" onClick={() => setSelectedLeaderForView(null)}>
                                                          <X className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                        <ProfileInfo label="Status" value={selectedLeaderForView.status} />
                                                        <ProfileInfo label="Constituency" value={selectedLeaderForView.constituency} />
                                                        <ProfileInfo label="Election Type" value={selectedLeaderForView.electionType} />
                                                        <ProfileInfo label="State" value={selectedLeaderForView.location.state} />
                                                        <ProfileInfo label="Gender" value={selectedLeaderForView.gender} />
                                                        <ProfileInfo label="Age" value={selectedLeaderForView.age} />
                                                        <ProfileInfo label="Address" value={selectedLeaderForView.nativeAddress} />
                                                        <div>
                                                            <Label className="text-sm text-muted-foreground">Twitter</Label>
                                                            {selectedLeaderForView.twitterUrl ? (
                                                                <a href={selectedLeaderForView.twitterUrl} target="_blank" rel="noopener noreferrer" className="block text-base font-medium text-primary hover:underline truncate">
                                                                    View Profile
                                                                </a>
                                                            ) : (
                                                                <p className="text-base font-medium">N/A</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <Label className="text-sm text-muted-foreground">Manifesto</Label>
                                                            {selectedLeaderForView.manifestoUrl ? (
                                                                 <Button 
                                                                    type="button" 
                                                                    variant="link" 
                                                                    className="p-0 h-auto block text-base font-medium text-primary hover:underline truncate"
                                                                    onClick={() => setManifestoForView({ url: selectedLeaderForView.manifestoUrl!, name: selectedLeaderForView.name })}
                                                                >
                                                                    View Document
                                                                </Button>
                                                            ) : (
                                                                <p className="text-base font-medium">N/A</p>
                                                            )}
                                                        </div>
                                                        {selectedLeaderForView.adminComment && (
                                                            <div className="col-span-full">
                                                                <Label className="text-sm text-muted-foreground flex items-center gap-1"><Info className="h-4 w-4" /> Admin Comment</Label>
                                                                <p className="text-base font-medium p-2 bg-background rounded-md border">{selectedLeaderForView.adminComment}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Separator className="my-4"/>
                                                    <h4 className="font-semibold mb-2">Previous Election History</h4>
                                                    {selectedLeaderForView.previousElections && selectedLeaderForView.previousElections.length > 0 ? (
                                                        <Table>
                                                          <TableHeader><TableRow><TableHead>Year</TableHead><TableHead>Party</TableHead><TableHead>Constituency</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                                          <TableBody>
                                                            {selectedLeaderForView.previousElections.map((e, i) => (
                                                              <TableRow key={i}><TableCell>{e.electionYear}</TableCell><TableCell>{e.partyName}</TableCell><TableCell>{e.constituency}</TableCell><TableCell><Badge variant={e.status === 'winner' ? 'default' : 'destructive'} className={cn(e.status === 'winner' && 'bg-green-600')}>{e.status}</Badge></TableCell></TableRow>
                                                            ))}
                                                          </TableBody>
                                                        </Table>
                                                    ) : <p className="text-sm text-muted-foreground">No previous election data available.</p>}
                                                </CardContent>
                                                <CardFooter className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleEditLeader(selectedLeaderForView)} disabled={isPending}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="sm" variant="destructive" disabled={isPending}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete {selectedLeaderForView.name}?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the leader and all associated ratings and comments.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteLeader(selectedLeaderForView.id)} className="bg-destructive hover:bg-destructive/90">Yes, delete it</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </CardFooter>
                                            </Card>
                                        )}
                                    </>
                                )}
                            </TabsContent>
                            <TabsContent value="messages" className="mt-4">
                                {isDetailsLoading ? <p>Loading messages...</p> : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Message</TableHead>
                                                <TableHead>Sent On</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {userAdminMessages.length > 0 ? userAdminMessages.map(message => (
                                                <TableRow key={message.id}>
                                                    <TableCell className="max-w-md break-words">{message.message}</TableCell>
                                                    <TableCell>{new Date(message.createdAt).toLocaleString()}</TableCell>
                                                    <TableCell>{message.isRead ? 'Read' : 'Unread'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <AlertDialog>
                                                          <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" disabled={isPending}>
                                                              <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                          </AlertDialogTrigger>
                                                          <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                              <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                                                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                              <AlertDialogAction onClick={() => handleDeleteMessage(message.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                          </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
                                                </TableRow>
                                            )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No messages have been sent to this user.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" disabled={isPending}>
                            <MoreVertical className="mr-2 h-4 w-4" />
                             Admin Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Moderation</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {selectedUser.isBlocked ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Unlock className="mr-2 h-4 w-4" />
                                    Unblock User
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Unblock {selectedUser.name}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will allow the user to access the platform again. Are you sure?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleUnblockUser}>Confirm Unblock</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          ) : (
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setBlockUserDialogOpen(true); }}>
                              <Ban className="mr-2 h-4 w-4" />
                              Block User
                            </DropdownMenuItem>
                          )}
                           <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSendMessageDialogOpen(true); }}>
                            <MessageSquareWarning className="mr-2 h-4 w-4" />
                            Send Warning/Message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                </Card>
            )}

            {/* Block User Dialog */}
            <Dialog open={isBlockUserDialogOpen} onOpenChange={setBlockUserDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Block User: {selectedUser?.name}</DialogTitle>
                  <DialogDescription>
                    Select the duration and provide a reason for blocking this user. This action can be reversed later.
                  </DialogDescription>
                </DialogHeader>
                <Form {...blockUserForm}>
                  <form onSubmit={blockUserForm.handleSubmit(onBlockUserSubmit)} className="space-y-4">
                    <FormField
                      control={blockUserForm.control}
                      name="durationType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Block Duration</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="temporary" />
                                </FormControl>
                                <FormLabel className="font-normal">Temporary</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="permanent" />
                                </FormControl>
                                <FormLabel className="font-normal">Permanent</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {blockUserForm.watch('durationType') === 'temporary' && (
                       <FormField
                          control={blockUserForm.control}
                          name="days"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Days</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="e.g., 30"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) =>
                                    field.onChange(e.target.value === '' ? undefined : +e.target.value)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    )}
                    <FormField
                      control={blockUserForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for Blocking (Required)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Explain why this user is being blocked..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Block
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Send Message Dialog */}
            <Dialog open={isSendMessageDialogOpen} onOpenChange={setSendMessageDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Message to: {selectedUser?.name}</DialogTitle>
                  <DialogDescription>
                    Compose a warning or message for this user. This will be logged for administrative review.
                  </DialogDescription>
                </DialogHeader>
                <Form {...sendMessageForm}>
                  <form onSubmit={sendMessageForm.handleSubmit(onSendMessageSubmit)} className="space-y-4">
                    <FormField
                        control={sendMessageForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Type your message here..." {...field} rows={6} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Message
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Status Change Comment Dialog */}
            <Dialog open={!!statusChangeInfo} onOpenChange={() => setStatusChangeInfo(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Leader Status</DialogTitle>
                  <DialogDescription>
                    You are changing the status to <span className="font-bold capitalize">{statusChangeInfo?.newStatus}</span>. A comment is required.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="status-comment">Admin Comment</Label>
                  <Textarea
                    id="status-comment"
                    value={statusChangeComment}
                    onChange={(e) => setStatusChangeComment(e.target.value)}
                    placeholder="Provide a reason for this status change..."
                    className="mt-2"
                  />
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

            {/* Edit Leader Dialog */}
            <Dialog open={isEditLeaderDialogOpen} onOpenChange={setEditLeaderDialogOpen}>
              <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Edit Leader: {leaderToEdit?.name}</DialogTitle>
                  <DialogDescription>
                    Update the details for this leader. Changes will be reflected immediately.
                  </DialogDescription>
                </DialogHeader>
                <Form {...editLeaderForm}>
                  <form onSubmit={editLeaderForm.handleSubmit(onEditLeaderSubmit)}>
                    <ScrollArea className="h-[60vh] p-4">
                      <div className="space-y-8">
                        <div className="grid md:grid-cols-3 gap-6">
                            <FormField control={editLeaderForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={editLeaderForm.control} name="partyName" render={({ field }) => (<FormItem><FormLabel>Party Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={editLeaderForm.control} name="electionType" render={({ field }) => (<FormItem><FormLabel>Election Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="national">National</SelectItem><SelectItem value="state">State</SelectItem><SelectItem value="panchayat">Panchayat</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            <FormField control={editLeaderForm.control} name="state" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a state" /></SelectTrigger></FormControl><SelectContent>{indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={editLeaderForm.control} name="constituency" render={({ field }) => (<FormItem><FormLabel>Constituency</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={editLeaderForm.control} name="nativeAddress" render={({ field }) => (<FormItem><FormLabel>Native Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            <FormField control={editLeaderForm.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={editLeaderForm.control} name="age" render={({ field }) => (<FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={editLeaderForm.control} name="twitterUrl" render={({ field }) => (<FormItem><FormLabel>X/Twitter URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField
                                control={editLeaderForm.control}
                                name="photoUrl"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>Candidate's Photo</FormLabel>
                                        {!photoRemoved && leaderToEdit?.photoUrl ? (
                                            <div className="mb-2 flex items-center gap-4">
                                                <Image src={leaderToEdit.photoUrl} alt="Current leader photo" width={80} height={80} className="rounded-md object-cover mt-1" />
                                                <Button type="button" variant="destructive" size="icon" onClick={() => setPhotoRemoved(true)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <FormControl>
                                                <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
                                            </FormControl>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editLeaderForm.control}
                                name="manifestoUrl"
                                render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem>
                                        <FormLabel>Manifesto/Brochure (PDF)</FormLabel>
                                        {!manifestoRemoved && leaderToEdit?.manifestoUrl ? (
                                            <div className="mb-2 flex items-center gap-4">
                                                <Button type="button" variant="link" className="p-0 h-auto" onClick={() => setManifestoForView({url: leaderToEdit.manifestoUrl!, name: leaderToEdit.name})}>
                                                    View Current Manifesto
                                                </Button>
                                                <Button type="button" variant="destructive" size="icon" onClick={() => setManifestoRemoved(true)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <FormControl>
                                                <Input type="file" accept="application/pdf" onChange={(e) => onChange(e.target.files)} {...rest} />
                                            </FormControl>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="border-b pb-2"><h3 className="text-lg font-medium">Previous Elections</h3></div>
                            <div className="space-y-4">
                              {prevElectionFields.map((item, index) => (
                                <div key={item.id} className="p-4 border rounded-md space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 items-end">
                                    <FormField control={editLeaderForm.control} name={`previousElections.${index}.electionType`} render={({ field }) => (<FormItem className="col-span-12 md:col-span-2"><FormLabel className="text-xs">Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="national">National</SelectItem><SelectItem value="state">State</SelectItem><SelectItem value="panchayat">Panchayat</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/>
                                    <FormField control={editLeaderForm.control} name={`previousElections.${index}.state`} render={({ field }) => (<FormItem className="col-span-12 md:col-span-2"><FormLabel className="text-xs">State</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{indianStates.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/>
                                    <FormField control={editLeaderForm.control} name={`previousElections.${index}.constituency`} render={({ field }) => (<FormItem className="col-span-12 md:col-span-4"><FormLabel className="text-xs">Constituency</FormLabel><Input {...field}/><FormMessage/></FormItem>)}/>
                                    <FormField control={editLeaderForm.control} name={`previousElections.${index}.partyName`} render={({ field }) => (<FormItem className="col-span-12 md:col-span-3"><FormLabel className="text-xs">Party</FormLabel><Input {...field}/><FormMessage/></FormItem>)}/>
                                    <Button type="button" variant="ghost" size="icon" className="col-span-12 md:col-span-1" onClick={() => removePrevElection(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2">
                                    <FormField control={editLeaderForm.control} name={`previousElections.${index}.status`} render={({ field }) => (<FormItem className="col-span-6 md:col-span-2"><FormLabel className="text-xs">Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="winner">Winner</SelectItem><SelectItem value="loser">Loser</SelectItem></SelectContent></Select><FormMessage/></FormItem>)}/>
                                    <FormField control={editLeaderForm.control} name={`previousElections.${index}.electionYear`} render={({ field }) => (<FormItem className="col-span-6 md:col-span-2"><FormLabel className="text-xs">Year</FormLabel><Input {...field}/><FormMessage/></FormItem>)}/>
                                  </div>
                                </div>
                              ))}
                              <Button type="button" onClick={() => appendPrevElection({ electionType: '', state: '', constituency: '', status: 'winner', electionYear: '', partyName: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Record</Button>
                            </div>
                        </div>
                      </div>
                    </ScrollArea>
                    <DialogFooter className="pt-4">
                      <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

             <ManifestoDialog
                open={!!manifestoForView}
                onOpenChange={() => setManifestoForView(null)}
                manifestoUrl={manifestoForView?.url ?? null}
                leaderName={manifestoForView?.name ?? ''}
              />
        </div>
    );
}
