
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { getSupportTicketStats, getSupportTickets, updateTicketStatus, type SupportTicket, type TicketStatus, type SupportTicketStats } from '@/data/support';
import { getSiteSettings, updateSiteSettings, type SiteSettings } from '@/data/settings';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Loader2, Save, Mail, Eye, Inbox, History, CheckCircle, XCircle, Search, RotateCw, BarChart, Clock, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';

const contactFormSchema = z.object({
  contact_email: z.string().email().or(z.literal('')),
  contact_phone: z.string().optional(),
  contact_twitter: z.string().url().or(z.literal('')),
  contact_linkedin: z.string().url().or(z.literal('')),
  contact_youtube: z.string().url().or(z.literal('')),
  contact_facebook: z.string().url().or(z.literal('')),
});

type ContactFormData = z.infer<typeof contactFormSchema>;
type settableSiteSettings = Omit<SiteSettings, 'maintenance_active' | 'maintenance_start' | 'maintenance_end' | 'maintenance_message'>;

export default function SiteContactsPage() {
    const router = useRouter();
    const { toast } = useToast();

    // State for tickets
    const [openTickets, setOpenTickets] = useState<SupportTicket[]>([]);
    const [inProgressTickets, setInProgressTickets] = useState<SupportTicket[]>([]);
    const [resolvedTickets, setResolvedTickets] = useState<SupportTicket[]>([]);
    const [closedTickets, setClosedTickets] = useState<SupportTicket[]>([]);
    const [isLoadingTickets, setIsLoadingTickets] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // State for ticket analytics
    const [ticketStats, setTicketStats] = useState<SupportTicketStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    // State for ticket dialog
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('open');

    // State for contact info
    const [isSavingContacts, setIsSavingContacts] = useState(false);

    const contactForm = useForm<ContactFormData>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: {
            contact_email: '', contact_phone: '', contact_twitter: '', contact_linkedin: '', contact_youtube: '', contact_facebook: ''
        },
    });

    const fetchTickets = async (query?: string) => {
        setIsLoadingTickets(true);
        const allTickets = await getSupportTickets({ searchQuery: query });
        setOpenTickets(allTickets.filter(t => t.status === 'open'));
        setInProgressTickets(allTickets.filter(t => t.status === 'in-progress'));
        setResolvedTickets(allTickets.filter(t => t.status === 'resolved'));
        setClosedTickets(allTickets.filter(t => t.status === 'closed'));
        setIsLoadingTickets(false);
    };

    const fetchContactInfo = async () => {
        const settings = await getSiteSettings();
        contactForm.reset({
            contact_email: settings.contact_email || '',
            contact_phone: settings.contact_phone || '',
            contact_twitter: settings.contact_twitter || '',
            contact_linkedin: settings.contact_linkedin || '',
            contact_youtube: settings.contact_youtube || '',
            contact_facebook: settings.contact_facebook || '',
        });
    };
    
    const fetchStats = async () => {
        setIsLoadingStats(true);
        const stats = await getSupportTicketStats();
        setTicketStats(stats);
        setIsLoadingStats(false);
    };

    useEffect(() => {
        fetchTickets();
        fetchContactInfo();
        fetchStats();
    }, []);

    const onContactSubmit = async (data: ContactFormData) => {
        setIsSavingContacts(true);
        try {
            await updateSiteSettings(data as settableSiteSettings);
            toast({ title: "Contact Information Saved" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not update contact information." });
        } finally {
            setIsSavingContacts(false);
        }
    };
    
    const handleSearch = () => {
        fetchTickets(searchQuery);
    };

    const handleReset = () => {
        setSearchQuery('');
        fetchTickets();
    };

    const handleViewTicket = (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setAdminNotes(ticket.admin_notes || '');
        setSelectedStatus(ticket.status);
    };
    
    const handleUpdateTicket = async () => {
        if (!selectedTicket) return;
        setIsUpdatingTicket(true);
        try {
            await updateTicketStatus(selectedTicket.id, selectedStatus, adminNotes);
            toast({ title: 'Ticket Updated' });
            setSelectedTicket(null);
            await fetchTickets(searchQuery); // Refetch with current search query
            await fetchStats(); // Refetch stats
        } catch (error) {
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the ticket status." });
        } finally {
            setIsUpdatingTicket(false);
        }
    }
    
    const statusConfig: Record<TicketStatus, { variant: 'destructive' | 'secondary' | 'default' | 'outline', icon: React.ElementType, name: string }> = {
        'open': { variant: 'destructive', icon: Inbox, name: 'Open' },
        'in-progress': { variant: 'secondary', icon: History, name: 'In Progress' },
        'resolved': { variant: 'default', icon: CheckCircle, name: 'Resolved' },
        'closed': { variant: 'outline', icon: XCircle, name: 'Closed' }
    };
    
    const TicketTable = ({ tickets }: { tickets: SupportTicket[] }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Ticket Raised</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tickets.length > 0 ? tickets.map(ticket => (
                    <TableRow key={ticket.id}>
                        <TableCell><div className="font-medium">{ticket.user_name}</div><div className="text-sm text-muted-foreground">{ticket.user_email}</div></TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>
                            <div className="font-medium">{format(new Date(ticket.created_at), 'PP')}</div>
                            <div className="text-sm text-muted-foreground">{format(new Date(ticket.created_at), 'p')}</div>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{format(new Date(ticket.updated_at), 'PP')}</div>
                            <div className="text-sm text-muted-foreground">{format(new Date(ticket.updated_at), 'p')}</div>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewTicket(ticket)}><Eye className="h-4 w-4"/></Button>
                        </TableCell>
                    </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No tickets in this category.</TableCell></TableRow>}
            </TableBody>
        </Table>
    );

    const TableSkeleton = () => (
         <div className="border rounded-md p-4"><div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div></div>
    );
    
    const chartConfig: ChartConfig = {
        open: { label: 'Open', color: 'hsl(var(--destructive))' },
        inProgress: { label: 'In-Progress', color: 'hsl(var(--accent))' },
        resolved: { label: 'Resolved', color: 'hsl(var(--chart-2))' },
        closed: { label: 'Closed', color: 'hsl(var(--muted-foreground))' },
    };

    const chartData = ticketStats ? [
        { name: 'open', value: ticketStats.open, fill: "var(--color-open)" },
        { name: 'inProgress', value: ticketStats.inProgress, fill: "var(--color-inProgress)" },
        { name: 'resolved', value: ticketStats.resolved, fill: "var(--color-resolved)" },
        { name: 'closed', value: ticketStats.closed, fill: "var(--color-closed)" },
    ].filter(item => item.value > 0) : [];

    const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );

     const AnalyticsSkeleton = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-[300px] w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-headline">Contact Management</h1>
                <Button variant="outline" onClick={() => router.back()}><ChevronLeft className="mr-2 h-4 w-4" />Back to Tools</Button>
            </div>
            <Tabs defaultValue="tickets">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
                    <TabsTrigger value="info">Contact Information</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tickets" className="mt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>User Support Tickets</CardTitle>
                            <CardDescription>Manage and respond to all user-submitted inquiries.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center gap-2 mb-4">
                                <Input
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button onClick={handleSearch} disabled={isLoadingTickets}>
                                    <Search className="mr-2 h-4 w-4" />
                                    Search
                                </Button>
                                <Button onClick={handleReset} variant="outline" disabled={isLoadingTickets} size="icon">
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                            </div>
                             <Tabs defaultValue="open">
                                <TabsList className="grid w-full grid-cols-4">
                                     <TabsTrigger value="open">
                                        <Inbox className="mr-2 h-4 w-4"/>Open <Badge variant="secondary" className="ml-2">{openTickets.length}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="in-progress">
                                        <History className="mr-2 h-4 w-4"/>In Progress <Badge variant="secondary" className="ml-2">{inProgressTickets.length}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="resolved">
                                        <CheckCircle className="mr-2 h-4 w-4"/>Resolved <Badge variant="secondary" className="ml-2">{resolvedTickets.length}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="closed">
                                        <XCircle className="mr-2 h-4 w-4"/>Closed <Badge variant="secondary" className="ml-2">{closedTickets.length}</Badge>
                                    </TabsTrigger>
                                </TabsList>
                                <div className="mt-4">
                                     {isLoadingTickets ? <TableSkeleton /> : (
                                        <>
                                            <TabsContent value="open"><TicketTable tickets={openTickets} /></TabsContent>
                                            <TabsContent value="in-progress"><TicketTable tickets={inProgressTickets} /></TabsContent>
                                            <TabsContent value="resolved"><TicketTable tickets={resolvedTickets} /></TabsContent>
                                            <TabsContent value="closed"><TicketTable tickets={closedTickets} /></TabsContent>
                                        </>
                                    )}
                                </div>
                             </Tabs>
                        </CardContent>
                    </Card>

                     <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart/> Ticket Analytics</CardTitle>
                            <CardDescription>An overview of support ticket statistics.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingStats ? <AnalyticsSkeleton /> : ticketStats ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                                    <div className="min-h-[300px] flex items-center justify-center">
                                        {chartData.length > 0 ? (
                                            <ChartContainer config={chartConfig} className="w-full h-full aspect-square">
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <PieChart>
                                                        <Tooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
                                                        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                                                          {chartData.map((entry) => (
                                                            <Cell key={`cell-${entry.name}`} fill={entry.fill as string} />
                                                          ))}
                                                        </Pie>
                                                        <Legend content={<ChartLegendContent />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </ChartContainer>
                                        ) : (
                                            <div className="text-center text-muted-foreground">
                                                <Inbox className="h-12 w-12 mx-auto" />
                                                <p className="mt-2">No ticket data available for analytics.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <StatCard title="Total Tickets" value={ticketStats.total} icon={Ticket} />
                                        <StatCard title="Open" value={ticketStats.open} icon={Inbox} />
                                        <StatCard title="In Progress" value={ticketStats.inProgress} icon={History} />
                                        <StatCard title="Avg. Resolution" value={`${ticketStats.avgResolutionHours?.toFixed(1) ?? 'N/A'} hrs`} icon={Clock} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">Could not load statistics.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="info" className="mt-6">
                    <Form {...contactForm}>
                    <form onSubmit={contactForm.handleSubmit(onContactSubmit)}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Mail/> Public Contact Information</CardTitle>
                                <CardDescription>This information will be displayed on the public "Contact Us" page.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <FormField control={contactForm.control} name="contact_email" render={({ field }) => (<FormItem><FormLabel>Support Email</FormLabel><FormControl><Input {...field} placeholder="support@example.com"/></FormControl><FormMessage/></FormItem>)}/>
                                <FormField control={contactForm.control} name="contact_phone" render={({ field }) => (<FormItem><FormLabel>Support Phone (Optional)</FormLabel><FormControl><Input {...field} placeholder="+91 12345 67890"/></FormControl><FormMessage/></FormItem>)}/>
                                <FormField control={contactForm.control} name="contact_twitter" render={({ field }) => (<FormItem><FormLabel>X/Twitter URL (Optional)</FormLabel><FormControl><Input {...field} placeholder="https://x.com/yourhandle"/></FormControl><FormMessage/></FormItem>)}/>
                                <FormField control={contactForm.control} name="contact_linkedin" render={({ field }) => (<FormItem><FormLabel>LinkedIn URL (Optional)</FormLabel><FormControl><Input {...field} placeholder="https://linkedin.com/in/yourprofile"/></FormControl><FormMessage/></FormItem>)}/>
                                <FormField control={contactForm.control} name="contact_youtube" render={({ field }) => (<FormItem><FormLabel>YouTube Channel URL (Optional)</FormLabel><FormControl><Input {...field} placeholder="https://youtube.com/c/yourchannel"/></FormControl><FormMessage/></FormItem>)}/>
                                <FormField control={contactForm.control} name="contact_facebook" render={({ field }) => (<FormItem><FormLabel>Facebook Page URL (Optional)</FormLabel><FormControl><Input {...field} placeholder="https://facebook.com/yourpage"/></FormControl><FormMessage/></FormItem>)}/>
                            </CardContent>
                            <CardFooter className="flex justify-end">
                                <Button type="submit" disabled={isSavingContacts}>{isSavingContacts ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}Save Information</Button>
                            </CardFooter>
                        </Card>
                    </form>
                    </Form>
                </TabsContent>
            </Tabs>
            
            <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Ticket from: {selectedTicket?.user_name}</DialogTitle>
                        <DialogDescription>Subject: {selectedTicket?.subject}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-secondary rounded-lg border">
                            <Label className="font-semibold">User's Message</Label>
                            <p className="text-sm mt-1">{selectedTicket?.message}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as TicketStatus)}>
                                    <SelectTrigger>
                                        <div className="flex items-center gap-2">
                                            {React.createElement(statusConfig[selectedStatus].icon, { className: "h-4 w-4" })}
                                            <span>{statusConfig[selectedStatus].name}</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(statusConfig).map(([status, { icon, name }]) => (
                                            <SelectItem key={status} value={status}>
                                                <div className="flex items-center gap-2">
                                                    {React.createElement(icon, { className: "h-4 w-4" })}
                                                    <span>{name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Admin Notes (internal)</Label>
                            <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={4} placeholder="Add notes about this ticket..."/>
                        </div>
                    </div>
                     {selectedTicket && (
                        <>
                          <Separator className="my-2"/>
                          <div className="px-1 text-xs text-muted-foreground space-y-1">
                              <p>Ticket created: {format(new Date(selectedTicket.created_at), 'PPpp')}</p>
                              <p>Last update: {format(new Date(selectedTicket.updated_at), 'PPpp')}</p>
                          </div>
                        </>
                      )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedTicket(null)}>Cancel</Button>
                        <Button onClick={handleUpdateTicket} disabled={isUpdatingTicket}>
                            {isUpdatingTicket && <Loader2 className="animate-spin mr-2"/>} Update Ticket
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

