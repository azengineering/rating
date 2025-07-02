
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, set, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { getNotifications, addNotification, updateNotification, deleteNotification, type SiteNotification } from '@/data/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Bell, PlusCircle, Edit, Trash2, CalendarIcon, Loader2, ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

const notificationSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty.'),
    dateRange: z.object({
        from: z.date().optional(),
        to: z.date().optional(),
    }).optional(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    isActive: z.boolean(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<SiteNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingNotification, setEditingNotification] = useState<SiteNotification | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<NotificationFormData>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            message: '',
            dateRange: { from: undefined, to: undefined },
            startTime: '00:00',
            endTime: '23:59',
            isActive: true,
        },
    });

    const fetchAllNotifications = async () => {
        setIsLoading(true);
        const data = await getNotifications();
        setNotifications(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchAllNotifications();
    }, []);

    const handleOpenDialog = (notification: SiteNotification | null = null) => {
        setEditingNotification(notification);
        if (notification) {
            const start = notification.startTime ? parseISO(notification.startTime) : null;
            const end = notification.endTime ? parseISO(notification.endTime) : null;
            form.reset({
                message: notification.message,
                dateRange: { from: start || undefined, to: end || undefined },
                startTime: start ? format(start, 'HH:mm') : '00:00',
                endTime: end ? format(end, 'HH:mm') : '23:59',
                isActive: notification.isActive,
            });
        } else {
            form.reset({
                message: '',
                dateRange: { from: new Date(), to: undefined },
                startTime: '00:00',
                endTime: '23:59',
                isActive: true,
            });
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (data: NotificationFormData) => {
        setIsSubmitting(true);
        try {
            const { dateRange, startTime, endTime } = data;
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            
            let startDateTime: string | null = null;
            if (dateRange?.from) {
                startDateTime = set(dateRange.from, { hours: startHour, minutes: startMinute }).toISOString();
            }

            let endDateTime: string | null = null;
            const endDate = dateRange?.to || dateRange?.from;
            if (endDate) {
                endDateTime = set(endDate, { hours: endHour, minutes: endMinute }).toISOString();
            }
            
            const payload = {
                message: data.message,
                isActive: data.isActive,
                startTime: startDateTime,
                endTime: endDateTime,
            };

            if (editingNotification) {
                await updateNotification(editingNotification.id, payload);
                toast({ title: 'Notification Updated' });
            } else {
                await addNotification(payload);
                toast({ title: 'Notification Added' });
            }
            
            setIsDialogOpen(false);
            await fetchAllNotifications();
        } catch (error) {
            toast({ variant: 'destructive', title: 'An error occurred', description: 'Could not save the notification.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        await deleteNotification(id);
        toast({ variant: 'destructive', title: 'Notification Deleted' });
        await fetchAllNotifications();
    };

    const TableSkeleton = () => (
         <div className="border rounded-md p-4">
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
        </div>
    );
    
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        return format(parseISO(dateString), 'MMM dd, yyyy, hh:mm a');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-headline">Manage Notifications</h1>
                <Button variant="outline" onClick={() => router.back()}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Bell /> Site Notifications</CardTitle>
                        <CardDescription>Create, edit, and manage site-wide announcements.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <PlusCircle className="mr-2" /> Add New
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? <TableSkeleton /> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Message</TableHead>
                                    <TableHead>Starts</TableHead>
                                    <TableHead>Ends</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notifications.length > 0 ? notifications.map(n => (
                                    <TableRow key={n.id}>
                                        <TableCell className="max-w-md truncate">{n.message}</TableCell>
                                        <TableCell>{formatDate(n.startTime)}</TableCell>
                                        <TableCell>{formatDate(n.endTime)}</TableCell>
                                        <TableCell>
                                            <span className={cn('px-2 py-1 text-xs rounded-full', n.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                                                {n.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(n)}><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action will permanently delete this notification.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(n.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No notifications created yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingNotification ? 'Edit' : 'Add'} Notification</DialogTitle>
                        <DialogDescription>Set the message and schedule for your notification.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                            <FormField control={form.control} name="message" render={({ field }) => (
                                <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="dateRange" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date Range (Optional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value?.from ? (field.value.to ? (<>{format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}</>) : (format(field.value.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar initialFocus mode="range" selected={field.value} onSelect={field.onChange} numberOfMonths={2} />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <div className="flex items-center gap-2">
                                    <FormField control={form.control} name="startTime" render={({ field }) => (
                                        <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="endTime" render={({ field }) => (
                                        <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </div>
                             <FormField control={form.control} name="isActive" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Activate Notification</FormLabel>
                                        <FormDescription>Turn this on to make the notification visible on the site.</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                             <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                                    Save Notification
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
