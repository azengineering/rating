
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Wrench, Save, PowerOff, Loader2, ChevronLeft } from "lucide-react";
import { format, set, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from "react-day-picker";
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings, type SiteSettings } from '@/data/settings';
import { Skeleton } from '@/components/ui/skeleton';

export default function MaintenancePage() {
    const [settings, setSettings] = useState<Partial<SiteSettings>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();
    
    // Form state
    const [isActive, setIsActive] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [startTime, setStartTime] = useState('00:00');
    const [endTime, setEndTime] = useState('23:59');
    const [message, setMessage] = useState('');
    
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            const fetchedSettings = await getSiteSettings();
            setSettings(fetchedSettings);
            
            // Populate form state from fetched settings
            setIsActive(fetchedSettings.maintenance_active === 'true');
            setMessage(fetchedSettings.maintenance_message || 'The site is currently down for maintenance. Please check back later.');
            
            const start = fetchedSettings.maintenance_start ? parseISO(fetchedSettings.maintenance_start) : null;
            const end = fetchedSettings.maintenance_end ? parseISO(fetchedSettings.maintenance_end) : null;

            if (start) {
                setDateRange({ from: start, to: end || undefined });
                setStartTime(format(start, 'HH:mm'));
            } else {
                 setDateRange(undefined);
            }

            if (end) {
                setEndTime(format(end, 'HH:mm'));
            }

            setIsLoading(false);
        };
        fetchSettings();
    }, []);
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            let startDateTime: string | null = null;
            let endDateTime: string | null = null;

            if (dateRange?.from) {
                const [startHour, startMinute] = startTime.split(':').map(Number);
                startDateTime = set(dateRange.from, { hours: startHour, minutes: startMinute }).toISOString();
            }
            
            // Use dateRange.from for end date if range.to is not set
            const endDate = dateRange?.to || dateRange?.from;
            if (endDate) {
                const [endHour, endMinute] = endTime.split(':').map(Number);
                endDateTime = set(endDate, { hours: endHour, minutes: endMinute }).toISOString();
            }

            const newSettings = {
                maintenance_active: String(isActive),
                maintenance_start: startDateTime || '',
                maintenance_end: endDateTime || '',
                maintenance_message: message,
            };
            
            await updateSiteSettings(newSettings);
            
            toast({
                title: 'Settings Saved',
                description: 'Maintenance mode settings have been updated.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: 'Could not save the maintenance settings.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisableNow = async () => {
        setIsSaving(true);
        try {
            await updateSiteSettings({ maintenance_active: 'false' });
            setIsActive(false);
            toast({
                title: 'Maintenance Mode Disabled',
                description: 'The site is now live for all users.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Action Failed',
                description: 'Could not disable maintenance mode.',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32 ml-auto" />
                </CardFooter>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-headline">Site Maintenance</h1>
                <Button variant="outline" onClick={() => router.back()}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wrench />
                        Maintenance Mode Settings
                    </CardTitle>
                    <CardDescription>
                        Control when the site is publicly accessible. When active, only admins can access the site.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center space-x-4 rounded-md border p-4">
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">
                                Activate Maintenance Mode
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Turn this on to take the site offline for regular users.
                            </p>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={setIsActive}
                          aria-label="Toggle maintenance mode"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Maintenance Schedule (Optional)</Label>
                        <p className="text-sm text-muted-foreground">
                            Set a specific window for maintenance. If no dates are set, maintenance mode is active immediately when switched on.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal",!dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                                </PopoverContent>
                            </Popover>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    aria-label="Start time"
                                />
                                <span className="text-muted-foreground">-</span>
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    aria-label="End time"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="maintenance-message">Maintenance Message</Label>
                        <Textarea
                            id="maintenance-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter the message to be displayed to users..."
                            rows={4}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="destructive" onClick={handleDisableNow} disabled={isSaving || !isActive}>
                        <PowerOff className="mr-2" />
                        Disable Now
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                        Save Settings
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
