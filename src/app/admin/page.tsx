
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserCheck, MessageSquare, Calendar as CalendarIcon, RotateCcw, Loader2 } from "lucide-react";
import { getUserCount } from "@/data/users";
import { getLeaderCount, getRatingCount } from "@/data/leaders";
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from "react-day-picker";
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { indianStates } from '@/data/locations';


interface Stats {
    userCount: number;
    leaderCount: number;
    ratingCount: number;
}

export default function AdminDashboard() {
  const [totalStats, setTotalStats] = useState<Stats | null>(null);
  const [filteredStats, setFilteredStats] = useState<Stats | null>(null);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [selectedState, setSelectedState] = useState<string>('all-states');
  const [constituency, setConstituency] = useState<string>('');
  const [isTotalLoading, setIsTotalLoading] = useState(true);
  const [isFilteredLoading, setIsFilteredLoading] = useState(false);

  // Fetch total stats on initial load
  useEffect(() => {
    const fetchTotalStats = async () => {
      setIsTotalLoading(true);
      const [userCount, leaderCount, ratingCount] = await Promise.all([
        getUserCount(),
        getLeaderCount(),
        getRatingCount(),
      ]);
      setTotalStats({ userCount, leaderCount, ratingCount });
      setIsTotalLoading(false);
    };
    fetchTotalStats();
  }, []);
  
  const handleFilter = async () => {
    if (!date?.from && !date?.to && selectedState === 'all-states' && !constituency.trim()) {
        handleReset();
        return;
    }

    setIsFilteredLoading(true);
    setFilteredStats(null); // Clear previous results

    const filters = {
        startDate: date?.from ? format(date.from, 'yyyy-MM-dd') + 'T00:00:00.000Z' : undefined,
        endDate: date?.to ? format(date.to, 'yyyy-MM-dd') + 'T23:59:59.999Z' : undefined,
        state: selectedState === 'all-states' ? undefined : selectedState,
        constituency: constituency.trim() || undefined,
    };
    
    const [userCount, leaderCount, ratingCount] = await Promise.all([
      getUserCount(filters),
      getLeaderCount(filters),
      getRatingCount(filters),
    ]);
    
    setFilteredStats({ userCount, leaderCount, ratingCount });
    setIsFilteredLoading(false);
  };
  
  const handleReset = () => {
    setDate(undefined);
    setSelectedState('all-states');
    setConstituency('');
    setFilteredStats(null);
  };

  const statCardsData = [
    { title: 'Users', icon: Users, color: 'text-blue-500', key: 'userCount' as keyof Stats },
    { title: 'Leaders', icon: UserCheck, color: 'text-green-500', key: 'leaderCount' as keyof Stats },
    { title: 'Ratings', icon: MessageSquare, color: 'text-orange-500', key: 'ratingCount' as keyof Stats },
  ];
  
  const StatCard = ({ title, value, icon: Icon, color, loading }: { title: string, value: number, icon: React.ElementType, color: string, loading: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-muted-foreground ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
            <Skeleton className="h-8 w-1/4" />
        ) : (
            <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        
        <Card>
            <CardHeader>
                <CardTitle>Filter Statistics</CardTitle>
                <CardDescription>Select filters to view data for a specific period, location, or constituency.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="grid gap-2 lg:col-span-2">
                        <Label>Date Range</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                date.to ? (
                                    <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date range</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="state-filter">State</Label>
                        <Select value={selectedState} onValueChange={setSelectedState}>
                            <SelectTrigger id="state-filter" className="bg-background">
                            <SelectValue placeholder="All States" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-states">All States</SelectItem>
                                {indianStates.map(state => (
                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="constituency-filter">Constituency</Label>
                        <Input 
                            id="constituency-filter"
                            value={constituency}
                            onChange={(e) => setConstituency(e.target.value)}
                            placeholder="Constituency name"
                            className="bg-background"
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <Button onClick={handleFilter} disabled={isFilteredLoading} className="w-full">
                            {isFilteredLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Filter
                        </Button>
                        <Button onClick={handleReset} variant="outline" disabled={isFilteredLoading} size="icon">
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Separator />

        <div className="space-y-4">
            <h2 className="text-2xl font-semibold font-headline">Overall Statistics</h2>
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {statCardsData.map(stat => (
                    <StatCard 
                        key={stat.title}
                        title={`Total ${stat.title}`}
                        value={totalStats?.[stat.key] ?? 0}
                        icon={stat.icon}
                        color={stat.color}
                        loading={isTotalLoading}
                    />
                ))}
            </div>
        </div>
        
        {(isFilteredLoading || filteredStats) && (
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold font-headline">
                    Filtered Results
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {statCardsData.map(stat => (
                        <StatCard 
                            key={stat.title}
                            title={`New ${stat.title}`}
                            value={filteredStats?.[stat.key] ?? 0}
                            icon={stat.icon}
                            color={stat.color}
                            loading={isFilteredLoading}
                        />
                    ))}
                </div>
            </div>
        )}

    </div>
  );
}
