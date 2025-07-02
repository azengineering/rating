
'use client';

import Image from 'next/image';
import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Leader as LeaderType, RatingDistribution, SocialBehaviourDistribution } from '@/data/leaders';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Twitter, Eye, Edit, ChevronDown, FileText, Info, BarChart, Users, HeartHandshake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/language-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/context/auth-context';
import RatingDialog from './rating-dialog';
import ReviewsDialog from './reviews-dialog';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import ManifestoDialog from './manifesto-dialog';
import { TooltipProvider, Tooltip as TooltipComponent, TooltipTrigger as TooltipTriggerComponent, TooltipContent as TooltipContentComponent } from './ui/tooltip';
import { Dialog, DialogContent as DialogPrimitiveContent, DialogHeader as DialogPrimitiveHeader, DialogTitle as DialogPrimitiveTitle, DialogDescription as DialogPrimitiveDescription } from '@/components/ui/dialog';
import { getRatingDistribution, getSocialBehaviourDistribution } from '@/data/leaders';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';

const RATING_COLORS: { [key: string]: string } = {
  "5": "#16a34a", // green-600
  "4": "#4ade80", // green-400
  "3": "#facc15", // yellow-400
  "2": "#fb923c", // orange-400
  "1": "#f87171", // red-400
};

const SOCIAL_BEHAVIOUR_COLORS: { [key: string]: string } = {
  'Social Worker': '#3b82f6', // blue-500
  'Honest': '#22c55e', // green-500
  'Humble': '#84cc16', // lime-500
  'Average': '#a8a29e', // stone-400
  'Aggressive': '#f97316', // orange-500
  'Corrupt': '#ef4444', // red-500
  'Fraud': '#8b5cf6', // violet-500
  'Criminal': '#4f46e5', // indigo-600
};

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card className="bg-secondary/50 p-4">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-background rounded-lg">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
        </div>
    </Card>
);

const LeaderAnalyticsDialog = ({ leader, open, onOpenChange }: { leader: LeaderType, open: boolean, onOpenChange: (open: boolean) => void }) => {
  const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution[]>([]);
  const [socialDistribution, setSocialDistribution] = useState<SocialBehaviourDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      Promise.all([
        getRatingDistribution(leader.id),
        getSocialBehaviourDistribution(leader.id)
      ]).then(([ratingData, socialData]) => {
        setRatingDistribution(ratingData);
        setSocialDistribution(socialData);
        setIsLoading(false);
      });
    }
  }, [open, leader.id]);

  const ratingChartData = useMemo(() => {
    const fullDistribution = [
      { rating: 5, name: '5 Stars', value: 0 },
      { rating: 4, name: '4 Stars', value: 0 },
      { rating: 3, name: '3 Stars', value: 0 },
      { rating: 2, name: '2 Stars', value: 0 },
      { rating: 1, name: '1 Star', value: 0 },
    ];
    ratingDistribution.forEach(d => {
      const item = fullDistribution.find(fd => fd.rating === d.rating);
      if (item) item.value = d.count;
    });
    return fullDistribution.filter(item => item.value > 0);
  }, [ratingDistribution]);

  const socialChartData = useMemo(() => socialDistribution.map(d => ({ ...d, value: d.count })), [socialDistribution]);

  const ratingChartConfig = ratingChartData.reduce((acc, item) => {
    acc[item.name.replace(" ", "-")] = { label: item.name, color: RATING_COLORS[String(item.rating)] };
    return acc;
  }, {} as ChartConfig);

  const socialChartConfig = socialChartData.reduce((acc, item) => {
    acc[item.name.replace(" ", "-")] = { label: item.name, color: SOCIAL_BEHAVIOUR_COLORS[item.name] || '#a8a29e' };
    return acc;
  }, {} as ChartConfig);
  
  const topTrait = socialDistribution.length > 0 ? socialDistribution[0].name : 'N/A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitiveContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogPrimitiveHeader className="p-6 pb-0 flex-shrink-0">
          <DialogPrimitiveTitle className="font-headline text-2xl">Performance Analytics: {leader.name}</DialogPrimitiveTitle>
        </DialogPrimitiveHeader>
        <ScrollArea className="flex-grow">
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-96"><Skeleton className="h-full w-full" /></div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="Total Reviews" value={leader.reviewCount} icon={Users} />
                    <StatCard title="Average Rating" value={leader.rating.toFixed(1)} icon={Star} />
                    <StatCard title="Most Common Trait" value={topTrait} icon={HeartHandshake} />
                </div>
                <Separator />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-center">Rating Distribution</CardTitle></CardHeader>
                    <CardContent>
                      {ratingChartData.length > 0 ? (
                        <ChartContainer config={ratingChartConfig} className="mx-auto aspect-square h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                              <Pie data={ratingChartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={2}>
                                {ratingChartData.map((entry) => (<Cell key={entry.name} fill={RATING_COLORS[String(entry.rating)]} />))}
                              </Pie>
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      ) : <p className="text-muted-foreground text-center pt-16">No rating data available.</p>}
                    </CardContent>
                  </Card>
                   <Card>
                    <CardHeader><CardTitle className="text-center">Social Behaviour Analysis</CardTitle></CardHeader>
                    <CardContent>
                      {socialChartData.length > 0 ? (
                        <ChartContainer config={socialChartConfig} className="mx-auto aspect-square h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                              <Pie data={socialChartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={2}>
                                  {socialChartData.map((entry) => (<Cell key={entry.name} fill={SOCIAL_BEHAVIOUR_COLORS[entry.name] || '#a8a29e'} />))}
                              </Pie>
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      ) : <p className="text-muted-foreground text-center pt-16">No social behaviour data available.</p>}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogPrimitiveContent>
    </Dialog>
  );
};


interface LeaderCardProps {
  leader: LeaderType;
  isEditable?: boolean;
  onEdit?: () => void;
  variant?: 'default' | 'compact';
}

export default function LeaderCard({ leader: initialLeader, isEditable = false, onEdit, variant = 'default' }: LeaderCardProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [leader, setLeader] = useState(initialLeader);
  const [isRatingDialogOpen, setRatingDialogOpen] = useState(false);
  const [isReviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [isLoginAlertOpen, setLoginAlertOpen] = useState(false);
  const [isManifestoDialogOpen, setManifestoDialogOpen] = useState(false);
  const [isAnalyticsOpen, setAnalyticsOpen] = useState(false);

  const genderText = leader.gender.charAt(0).toUpperCase() + leader.gender.slice(1);
  const isCompact = variant === 'compact';

  const handleRateClick = () => {
    if (user) {
      setRatingDialogOpen(true);
    } else {
      setLoginAlertOpen(true);
    }
  };

  const handleRatingSuccess = (updatedLeader: LeaderType) => {
    setLeader(updatedLeader);
  };
  
  const electionPerformance = useMemo(() => {
    if (!leader.previousElections || leader.previousElections.length === 0) {
      return null;
    }
    const total = leader.previousElections.length;
    const wins = leader.previousElections.filter(e => e.status === 'winner').length;
    const losses = total - wins;
    return {
      total,
      wins,
      losses,
      data: [
        { name: 'Wins', value: wins, color: '#22c55e' }, // green-500
        { name: 'Losses', value: losses, color: '#ef4444' }, // red-500
      ],
    };
  }, [leader.previousElections]);

  const NameComponent = () => (
    <h2 className={cn("font-headline font-bold text-xl", isCompact && "text-base")}>
        {leader.name}
    </h2>
  );

  return (
    <>
      <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg rounded-xl border">
        <CardContent className={cn("p-4 flex-grow flex flex-col", isCompact && "p-3")}>
          <div className="flex gap-4 items-start mb-4">
              <Image
                  src={leader.photoUrl || 'https://placehold.co/400x400.png'}
                  alt={`Portrait of ${leader.name}`}
                  width={isCompact ? 48 : 64}
                  height={isCompact ? 48 : 64}
                  className="rounded-full border-2 border-primary/50 object-cover"
                  data-ai-hint={`${leader.gender} indian politician`}
              />
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {isCompact ? (
                        <Link href={`/rate-leader?candidateName=${encodeURIComponent(leader.name)}`} className="hover:underline hover:text-primary transition-colors">
                          <NameComponent />
                        </Link>
                      ) : (
                        <NameComponent />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isEditable && (
                        <>
                          <Badge variant={leader.status === 'approved' ? 'default' : (leader.status === 'rejected' ? 'destructive' : 'secondary')} className={cn('capitalize', leader.status === 'approved' && 'bg-green-600')}>
                            {leader.status}
                          </Badge>
                          {leader.adminComment && (
                            <TooltipProvider>
                              <TooltipComponent>
                                <TooltipTriggerComponent asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTriggerComponent>
                                <TooltipContentComponent>
                                  <p className="font-semibold">Admin Comment:</p>
                                  <p className="max-w-xs">{leader.adminComment}</p>
                                </TooltipContentComponent>
                              </TooltipComponent>
                            </TooltipProvider>
                          )}
                          {onEdit && (
                            <Button variant="ghost" size="icon" className={cn("h-8 w-8", isCompact && "h-7 w-7")} onClick={onEdit}>
                              <Edit className="h-4 w-4 text-primary" />
                              <span className="sr-only">Edit Leader</span>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <p className={cn("text-sm text-muted-foreground", isCompact && "text-xs")}>
                      {genderText}, {leader.age} yrs old
                  </p>
                  <div className="flex items-center gap-1 text-blue-600 mt-1">
                      <Star className="w-4 h-4 fill-current text-amber-500" />
                      <span className={cn("font-bold text-primary text-sm", isCompact && "text-xs")}>{leader.rating.toFixed(1)}</span>
                       <button
                          onClick={() => !isCompact && leader.reviewCount > 0 && setReviewsDialogOpen(true)}
                          className={cn("flex items-center gap-1 text-primary text-xs ml-1 hover:underline disabled:no-underline disabled:cursor-default", isCompact && "pointer-events-none")}
                          disabled={leader.reviewCount === 0}
                          aria-label={`View ${leader.reviewCount} reviews`}
                        >
                          <span>({leader.reviewCount} {t('leaderCard.reviews')})</span>
                          {!isCompact && leader.reviewCount > 0 && <Eye className="h-3 w-3" />}
                        </button>
                  </div>
              </div>
          </div>
          
          <div className="flex justify-between items-center flex-grow">
            <div className={cn("space-y-2 text-sm border-t pt-4 flex-grow", isCompact && "space-y-1 text-xs pt-2")}>
                <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">Party:</span>
                    <p className="font-semibold text-foreground truncate">{leader.partyName}</p>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-semibold capitalize text-foreground">{t(`filterDashboard.${leader.electionType}`)}</p>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">State:</span>
                    <p className="font-semibold text-foreground">{leader.location.state}</p>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">Constituency:</span>
                    <p className="font-semibold text-foreground truncate">{leader.constituency}</p>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">{t('leaderCard.addressLabel')}:</span>
                    <p className="font-semibold text-foreground truncate">{leader.nativeAddress}</p>
                </div>
            </div>
             {!isCompact && (
              <div className="pl-2">
                <TooltipProvider>
                  <TooltipComponent>
                    <TooltipTriggerComponent asChild>
                       <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAnalyticsOpen(true)}
                          className="rounded-full h-20 w-20 hover:bg-primary/10"
                          disabled={leader.reviewCount === 0}
                          aria-label="View Performance Analytics"
                      >
                          <svg
                              className="h-14 w-14"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <defs>
                                  <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                                  </linearGradient>
                              </defs>
                              <path
                                  d="M21.21 15.89A10 10 0 1 1 8.11 2.99"
                                  stroke="url(#icon-gradient)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                              />
                              <path
                                  d="M22 12A10 10 0 0 0 12 2v10z"
                                  stroke="url(#icon-gradient)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                              />
                          </svg>
                      </Button>
                    </TooltipTriggerComponent>
                    <TooltipContentComponent>
                      <p>View Performance Analytics</p>
                    </TooltipContentComponent>
                  </TooltipComponent>
                </TooltipProvider>
              </div>
            )}
          </div>

          {!isCompact && (
            <div className="border-t pt-4 mt-auto">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-4">
                        {leader.manifestoUrl && (
                            <Button 
                                variant="link" 
                                className="p-0 h-auto font-medium" 
                                onClick={() => setManifestoDialogOpen(true)}
                              >
                                Manifesto
                              </Button>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button
                                    disabled={!leader.previousElections || leader.previousElections.length === 0}
                                    className="font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                                >
                                    Election Records
                                </button>
                            </AlertDialogTrigger>
                           <AlertDialogContent className="sm:max-w-3xl">
                              <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Election History for <span className="text-primary font-bold">{leader.name}</span>
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This table shows the past election participation records available for this leader.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              
                              <div className="max-h-[40vh] overflow-y-auto">
                                  <Table>
                                      <TableHeader>
                                          <TableRow>
                                              <TableHead>Year</TableHead>
                                              <TableHead>Election</TableHead>
                                              <TableHead>Party</TableHead>
                                              <TableHead>Constituency</TableHead>
                                              <TableHead>Status</TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {leader.previousElections.map((election, index) => (
                                              <TableRow key={index}>
                                                  <TableCell>{election.electionYear}</TableCell>
                                                  <TableCell className="capitalize">{election.electionType}</TableCell>
                                                  <TableCell>{election.partyName}</TableCell>
                                                  <TableCell>{election.constituency}</TableCell>
                                                  <TableCell>
                                                    {election.status === 'winner' ? (
                                                        <Badge className="capitalize bg-green-600 hover:bg-green-700 text-primary-foreground border-transparent">
                                                            {election.status}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="capitalize">
                                                            {election.status}
                                                        </Badge>
                                                    )}
                                                  </TableCell>
                                              </TableRow>
                                          ))}
                                      </TableBody>
                                  </Table>
                              </div>

                              {electionPerformance && (
                                <Collapsible className="mt-4">
                                  <CollapsibleTrigger asChild>
                                      <Button variant="link" className="text-primary p-0 h-auto flex items-center gap-1 data-[state=open]:font-bold text-sm">
                                          View Performance Analysis
                                          <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                                      </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-4 animate-in fade-in-0 zoom-in-95">
                                      <Card className="bg-secondary/30">
                                          <CardHeader>
                                              <CardTitle className="text-center text-xl font-headline">Performance Analysis</CardTitle>
                                          </CardHeader>
                                          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                              <div className="w-full h-52">
                                                  <ResponsiveContainer width="100%" height="100%">
                                                      <PieChart>
                                                          <Pie
                                                              data={electionPerformance.data}
                                                              dataKey="value"
                                                              nameKey="name"
                                                              cx="50%"
                                                              cy="50%"
                                                              outerRadius={80}
                                                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                                          >
                                                              {electionPerformance.data.map((entry) => (
                                                                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                                              ))}
                                                          </Pie>
                                                          <Tooltip
                                                              cursor={{ fill: 'hsla(var(--muted))' }}
                                                              contentStyle={{
                                                                  background: 'hsl(var(--background))',
                                                                  borderRadius: 'var(--radius)',
                                                                  border: '1px solid hsl(var(--border))'
                                                              }}
                                                          />
                                                          <Legend iconType="circle" />
                                                      </PieChart>
                                                  </ResponsiveContainer>
                                              </div>
                                              <div className="space-y-4">
                                                  <p className="text-lg font-bold text-center md:text-left">Total Elections Fought: {electionPerformance.total}</p>
                                                  <Separator />
                                                  <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                                                    <p className="flex items-center gap-2 text-lg"><span className="w-3 h-3 rounded-full bg-green-500"></span> <span className="font-bold">{electionPerformance.wins}</span> Wins</p>
                                                    <p className="flex items-center gap-2 text-lg"><span className="w-3 h-3 rounded-full bg-red-500"></span> <span className="font-bold">{electionPerformance.losses}</span> Losses</p>
                                                  </div>
                                              </div>
                                          </CardContent>
                                      </Card>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}

                              <AlertDialogFooter>
                                  <AlertDialogCancel>Close</AlertDialogCancel>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                     {leader.twitterUrl && (
                        <a href={leader.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <Twitter className="h-4 w-4" />
                            <span className="sr-only">X/Twitter Profile</span>
                        </a>
                    )}
                </div>
            </div>
          )}
        </CardContent>

        {!isCompact && (
        <CardFooter className="p-2 bg-secondary/50 border-t flex justify-center">
            <Button size="sm" className="transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px" onClick={handleRateClick}>
                <Star className="mr-2 h-4 w-4" /> {t('leaderCard.addRatingAndComment')}
            </Button>
        </CardFooter>
        )}
      </Card>

      {!isCompact && user && (
          <RatingDialog
              leader={leader}
              open={isRatingDialogOpen}
              onOpenChange={setRatingDialogOpen}
              onRatingSuccess={handleRatingSuccess}
          />
      )}

      {!isCompact && (
        <ReviewsDialog 
          leader={leader} 
          open={isReviewsDialogOpen} 
          onOpenChange={setReviewsDialogOpen}
          onAddReview={() => {
              setReviewsDialogOpen(false);
              setRatingDialogOpen(true);
          }}
        />
      )}

      <LeaderAnalyticsDialog 
        leader={leader}
        open={isAnalyticsOpen}
        onOpenChange={setAnalyticsOpen}
      />

      <ManifestoDialog
        open={isManifestoDialogOpen}
        onOpenChange={setManifestoDialogOpen}
        manifestoUrl={leader.manifestoUrl ?? null}
        leaderName={leader.name}
      />

      {!isCompact && (
        <AlertDialog open={isLoginAlertOpen} onOpenChange={setLoginAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>{t('auth.requiredTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('auth.rateLoginRequired')}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>{t('auth.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push(`/login?redirect=${pathname}`)}>
                    {t('auth.login')}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
