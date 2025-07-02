
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from 'next/navigation';
import { PlusCircle, Trash2, RotateCw, Loader2 } from 'lucide-react';
import { useState, useEffect } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useLanguage } from '@/context/language-context';
import { useToast } from "@/hooks/use-toast";
import { addLeader, getLeaderById, updateLeader, type Leader, getLeaders } from '@/data/leaders';
import { indianStates } from '@/data/locations';
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import LeaderCard from "@/components/leader-card";
import ManifestoDialog from "@/components/manifesto-dialog";

const MAX_PHOTO_SIZE_MB = 1;
const MAX_MANIFESTO_SIZE_MB = 5;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
const MAX_MANIFESTO_SIZE_BYTES = MAX_MANIFESTO_SIZE_MB * 1024 * 1024;

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  partyName: z.string().min(1, { message: "Party name is required." }),
  electionType: z.enum(['national', 'state', 'panchayat'], { required_error: "Please select an election type."}),
  constituency: z.string().min(1, { message: "Constituency is required." }),
  gender: z.enum(['male', 'female', 'other'], { required_error: "Please select a gender."}),
  age: z.coerce.number().int({ message: "Age must be a whole number." }).positive({ message: "Age must be positive." }).min(25, { message: "Candidate must be at least 25 years old." }),
  nativeAddress: z.string().min(1, { message: "Native address is required." }),
  state: z.string().optional(),
  district: z.string().optional(),
  previousElections: z.array(z.object({
    electionType: z.string().min(1, { message: "Required" }),
    constituency: z.string().min(1, { message: "Required" }),
    state: z.string().optional(),
    status: z.enum(['winner', 'loser']),
    electionYear: z.string().min(4, { message: "Invalid year" }).max(4, { message: "Invalid year" }),
    partyName: z.string().min(1, { message: "Required" }),
  })).optional(),
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
  twitterUrl: z.string().url({ message: "Please enter a valid X/Twitter URL." }).optional().or(z.literal('')),
}).refine(data => {
    if (data.electionType === 'state' || data.electionType === 'panchayat') {
        return !!data.state;
    }
    return true;
}, {
  message: "State is required",
  path: ["state"],
});


function AddLeaderPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [currentLeader, setCurrentLeader] = useState<Leader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchingLeaders, setMatchingLeaders] = useState<Leader[]>([]);
  const [isMatchingLeadersLoading, setIsMatchingLeadersLoading] = useState(true);
  const [manifestoForView, setManifestoForView] = useState<{url: string; name: string} | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      const adminAuth = localStorage.getItem('admin_auth') === 'true';
      if (user || adminAuth) {
        setIsAuthorized(true);
      } else {
        router.push('/login?redirect=/add-leader');
      }
    }
  }, [user, authLoading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      partyName: "",
      constituency: "",
      nativeAddress: "",
      state: "",
      district: "",
      age: undefined,
      previousElections: [],
      photoUrl: undefined,
      manifestoUrl: undefined,
      twitterUrl: "",
    },
  });

  useEffect(() => {
    const fetchMatchingLeaders = async () => {
      if (user) {
        setIsMatchingLeadersLoading(true);
        const allLeaders = await getLeaders();
        const { mpConstituency, mlaConstituency, panchayat, state } = user;
        
        const lowerMp = mpConstituency?.trim().toLowerCase();
        const lowerMla = mlaConstituency?.trim().toLowerCase();
        const lowerPanchayat = panchayat?.trim().toLowerCase();
        const userState = state?.trim();

        const locationBasedLeaders = allLeaders.filter(leader => {
          const leaderConstituency = leader.constituency.trim().toLowerCase();
          const leaderState = leader.location.state?.trim();

          if (userState && leaderState === userState) {
            return true;
          }
          if (leader.electionType === 'national' && lowerMp && leaderConstituency === lowerMp) {
            return true;
          }
          if (leader.electionType === 'state' && lowerMla && leaderConstituency === lowerMla) {
            return true;
          }
          if (leader.electionType === 'panchayat' && lowerPanchayat && leaderConstituency === lowerPanchayat) {
            return true;
          }
          return false;
        });
        
        const uniqueLeaders = Array.from(new Set(locationBasedLeaders.map(l => l.id))).map(id => locationBasedLeaders.find(l => l.id === id)!);
        setMatchingLeaders(uniqueLeaders);
        setIsMatchingLeadersLoading(false);
      } else {
        setIsMatchingLeadersLoading(false);
      }
    };
    if (isAuthorized) {
        fetchMatchingLeaders();
    }
  }, [user, isAuthorized]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setIsEditMode(true);
      setLeaderId(editId);
      const fetchLeaderData = async () => {
        try {
          const isAdmin = localStorage.getItem('admin_auth') === 'true';
          const leaderData = await getLeaderById(editId);
          if (leaderData) {
              if (!isAdmin && user && leaderData.addedByUserId !== user.id) {
                  toast({ variant: 'destructive', title: 'Unauthorized', description: "You are not allowed to edit this leader." });
                  router.push('/my-activities');
                  return;
              }
            setCurrentLeader(leaderData);
            form.reset({
              name: leaderData.name,
              partyName: leaderData.partyName,
              electionType: leaderData.electionType,
              constituency: leaderData.constituency,
              gender: leaderData.gender,
              age: leaderData.age,
              nativeAddress: leaderData.nativeAddress,
              state: leaderData.location.state || '',
              district: leaderData.location.district || '',
              previousElections: leaderData.previousElections || [],
              twitterUrl: leaderData.twitterUrl || '',
              photoUrl: undefined,
              manifestoUrl: undefined,
            });
          } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Leader not found.' });
            router.push('/rate-leader');
          }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load leader data.' });
        } finally {
            setIsLoading(false);
        }
      };
      if (isAuthorized) {
        fetchLeaderData();
      }
    } else {
        setIsLoading(false);
    }
  }, [searchParams, form, router, toast, user, isAuthorized]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "previousElections"
  });

  const electionType = form.watch('electionType');
  const selectedState = form.watch('state');
  
  const handleClear = () => {
    form.reset();
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Securely determine admin status at the time of submission
    const isAdminSubmission = localStorage.getItem('admin_auth') === 'true';

    if (!user && !isAdminSubmission) {
        toast({ variant: 'destructive', title: 'Authentication Required', description: 'You must be logged in to perform this action.' });
        router.push('/login?redirect=/add-leader');
        return;
    }

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

    let photoDataUrl = currentLeader?.photoUrl || '';
    if (values.photoUrl && values.photoUrl.length > 0) {
        try {
            photoDataUrl = await fileToDataUri(values.photoUrl[0]);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error uploading photo.' });
            return;
        }
    }

    let manifestoDataUrl = currentLeader?.manifestoUrl || '';
    if (values.manifestoUrl && values.manifestoUrl.length > 0) {
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
            district: values.district,
        },
        previousElections: values.previousElections || [],
        photoUrl: photoDataUrl,
        manifestoUrl: manifestoDataUrl,
        twitterUrl: values.twitterUrl,
    };

    try {
        if (isEditMode && leaderId) {
            // The backend function will handle status changes based on `isAdminSubmission`
            await updateLeader(leaderId, leaderPayload, user?.id ?? null, isAdminSubmission);
            
            // --- SECURE REDIRECTION LOGIC ---
            if (isAdminSubmission) {
                // This path is ONLY for admins
                toast({ title: t('addLeaderPage.updateSuccessMessage') });
                router.push('/admin/leaders');
            } else {
                // This path is for ALL non-admin users
                toast({ title: "Update Submitted", description: "Your changes have been submitted and are pending re-approval." });
                router.push('/my-activities');
            }
        } else {
            // This is for adding a NEW leader, which always defaults to 'pending' status
            await addLeader(leaderPayload, user?.id ?? null);
            toast({ title: t('addLeaderPage.successMessage'), description: "Your submission is pending admin approval." });
            form.reset();
            router.push('/rate-leader');
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'An error occurred', description: error instanceof Error ? error.message : "An unknown error occurred." });
    }
  }
  
  const FormSkeleton = () => (
    <div className="space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
         <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    </div>
  );

  const MatchingLeadersSkeleton = () => (
    <div className="space-y-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="border rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2 mt-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
          <div className="border-t pt-3 space-y-2">
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
          </div>
           <div className="border-t pt-3 flex justify-center">
              <Skeleton className="h-9 w-48 rounded-md" />
           </div>
        </div>
      ))}
    </div>
  );

  if (!isAuthorized) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
            <h1 className="font-headline text-3xl font-extrabold text-primary">{isEditMode ? t('addLeaderPage.editTitle') : t('addLeaderPage.title')}</h1>
            <p className="mt-2 text-muted-foreground">{isEditMode ? t('addLeaderPage.editDescription') : t('addLeaderPage.description')}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
                <div className="p-8 bg-card border rounded-lg shadow-sm">
                {isLoading ? <FormSkeleton /> : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* --- Row 1: Basic Info --- */}
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.nameLabel')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('addLeaderPage.namePlaceholder')} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="partyName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.partyNameLabel')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('addLeaderPage.partyNamePlaceholder')} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="electionType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.electionTypeLabel')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('addLeaderPage.selectElectionType')} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="national">{t('filterDashboard.national')}</SelectItem>
                                                    <SelectItem value="state">{t('filterDashboard.state')}</SelectItem>
                                                    <SelectItem value="panchayat">{t('filterDashboard.panchayat')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* --- Row 2: Location Details --- */}
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.stateLabel')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('addLeaderPage.selectState')} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {indianStates.map(state => (
                                                        <SelectItem key={state} value={state}>{state}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="constituency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.constituencyLabel')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('addLeaderPage.constituencyPlaceholder')} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="nativeAddress"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.nativeAddressLabel')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('addLeaderPage.nativeAddressPlaceholder')} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {/* --- Row 3: Personal Details --- */}
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="gender"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('addLeaderPage.genderLabel')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder={t('addLeaderPage.genderPlaceholder')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="male">{t('addLeaderPage.genderMale')}</SelectItem>
                                            <SelectItem value="female">{t('addLeaderPage.genderFemale')}</SelectItem>
                                            <SelectItem value="other">{t('addLeaderPage.genderOther')}</SelectItem>
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="age"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.ageLabel')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                type="number"
                                                placeholder={t('addLeaderPage.agePlaceholder')}
                                                {...field}
                                                onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)}
                                                value={field.value ?? ''}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            
                            {/* --- Previous Elections --- */}
                            <div className="space-y-4">
                            <div className="border-b pb-2">
                                <h3 className="text-lg font-medium">{t('addLeaderPage.previousElectionsTitle')}</h3>
                            </div>
                            <div className="space-y-4">
                                {fields.map((item, index) => (
                                <div key={item.id} className="p-4 border rounded-md space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 items-end">
                                        <FormField
                                        control={form.control}
                                        name={`previousElections.${index}.electionType`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-12 md:col-span-2">
                                            <FormLabel className="text-xs">{t('addLeaderPage.electionTypeLabel')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('addLeaderPage.selectElectionType')} />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                <SelectItem value="national">{t('filterDashboard.national')}</SelectItem>
                                                <SelectItem value="state">{t('filterDashboard.state')}</SelectItem>
                                                <SelectItem value="panchayat">{t('filterDashboard.panchayat')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                        <FormField
                                        control={form.control}
                                        name={`previousElections.${index}.state`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-12 md:col-span-2">
                                            <FormLabel className="text-xs">{t('addLeaderPage.stateLabel')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('addLeaderPage.selectState')} />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                {indianStates.map(state => (
                                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                        <FormField
                                        control={form.control}
                                        name={`previousElections.${index}.constituency`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-12 md:col-span-4">
                                            <FormLabel className="text-xs">{t('addLeaderPage.previousConstituencyLabel')}</FormLabel>
                                            <Input {...field} placeholder="e.g., Pune Assembly" />
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                        <FormField
                                        control={form.control}
                                        name={`previousElections.${index}.partyName`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-12 md:col-span-3">
                                            <FormLabel className="text-xs">{t('addLeaderPage.partyNameLabel')}</FormLabel>
                                            <Input {...field} placeholder="e.g., ABC Party" />
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="col-span-12 md:col-span-1"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2">
                                        <FormField
                                        control={form.control}
                                        name={`previousElections.${index}.status`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-6 md:col-span-2">
                                            <FormLabel className="text-xs">{t('addLeaderPage.statusLabel')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="winner">{t('addLeaderPage.winnerStatus')}</SelectItem>
                                                    <SelectItem value="loser">{t('addLeaderPage.loserStatus')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                        <FormField
                                        control={form.control}
                                        name={`previousElections.${index}.electionYear`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-6 md:col-span-2">
                                            <FormLabel className="text-xs">{t('addLeaderPage.electionYearLabel')}</FormLabel>
                                            <Input {...field} placeholder="YYYY" />
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                    </div>
                                </div>
                                ))}
                                <Button
                                type="button"
                                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                onClick={() => append({ electionType: '', state: '', constituency: '', status: 'winner', electionYear: '', partyName: '' })}
                                >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {fields.length === 0 ? t('addLeaderPage.addRecordsButton') : t('addLeaderPage.addMoreButton')}
                                </Button>
                            </div>
                            </div>

                            {/* --- Row 5: Files --- */}
                            <div className="grid md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="photoUrl"
                                    render={({ field: { onChange, value, ...rest } }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.photoUrlLabel')}</FormLabel>
                                            {isEditMode && currentLeader?.photoUrl && (
                                                <div className="mb-2">
                                                    <p className="text-sm text-muted-foreground">Current Photo:</p>
                                                    <Image src={currentLeader.photoUrl} alt="Current leader photo" width={80} height={80} className="rounded-md object-cover mt-1" />
                                                </div>
                                            )}
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => onChange(e.target.files)}
                                                    {...rest}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="manifestoUrl"
                                    render={({ field: { onChange, value, ...rest } }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.manifestoUrlLabel')}</FormLabel>
                                            {isEditMode && currentLeader?.manifestoUrl && (
                                                <div className="mb-2">
                                                     <Button 
                                                        type="button" 
                                                        variant="link" 
                                                        className="p-0 h-auto text-sm"
                                                        onClick={() => setManifestoForView({ url: currentLeader.manifestoUrl!, name: currentLeader.name })}
                                                      >
                                                        View Current Manifesto
                                                      </Button>
                                                </div>
                                            )}
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={(e) => onChange(e.target.files)}
                                                    {...rest}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="twitterUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('addLeaderPage.twitterUrlLabel')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('addLeaderPage.twitterUrlPlaceholder')} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={handleClear}>
                                    <RotateCw className="mr-2 h-4 w-4" />
                                    {t('addLeaderPage.clearButton')}
                                </Button>
                            <Button type="submit">
                                {isEditMode ? t('addLeaderPage.updateButton') : t('addLeaderPage.submitButton')}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
                </div>
            </div>

            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-primary">{t('addLeaderPage.leadersInYourAreaTitle')}</CardTitle>
                        <CardDescription>{t('addLeaderPage.leadersInYourAreaDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isMatchingLeadersLoading ? (
                            <MatchingLeadersSkeleton />
                        ) : matchingLeaders.length > 0 ? (
                            <ScrollArea className="h-[calc(100vh-280px)] pr-4">
                                <div className="space-y-4">
                                    {matchingLeaders.map(leader => (
                                        <LeaderCard key={leader.id} leader={leader} variant="compact" />
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No matching leaders found in your profile's constituencies.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
      <Footer />
    </div>

    <ManifestoDialog
        open={!!manifestoForView}
        onOpenChange={() => setManifestoForView(null)}
        manifestoUrl={manifestoForView?.url ?? null}
        leaderName={manifestoForView?.name ?? ''}
      />
    </>
  );
}

export default AddLeaderPage;
