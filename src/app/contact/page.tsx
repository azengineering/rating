
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Phone, Twitter, Linkedin, Youtube, Send, Info, Loader2, Facebook } from 'lucide-react';

import { getSiteSettings, type SiteSettings } from '@/data/settings';
import { createSupportTicket } from '@/data/support';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';

import Header from '@/components/header';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const contactFormSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    email: z.string().email('Please enter a valid email.'),
    subject: z.string().min(3, 'Subject must be at least 3 characters.'),
    message: z.string().min(10, 'Message must be at least 10 characters.'),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const ContactInfoItem = ({ icon, title, text, href, hoverColor }: { icon: React.ReactNode, title: string, text: string | null, href?: string, hoverColor: string }) => {
    if (!text) return null;

    const isHttpLink = typeof text === 'string' && text.startsWith('http');

    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`group flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors ${hoverColor}`}>
            <div className="p-3 bg-background rounded-full group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div>
                <h4 className="font-semibold text-foreground">{title}</h4>
                {!isHttpLink && (
                  <p className="text-sm text-muted-foreground truncate group-hover:text-primary">{text}</p>
                )}
            </div>
        </a>
    );
};

export default function ContactPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { toast } = useToast();
    const [settings, setSettings] = useState<Partial<SiteSettings>>({});
    const [isLoading, setIsLoading] = useState(true);

    const form = useForm<ContactFormData>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: { name: '', email: '', subject: '', message: '' },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            const fetchedSettings = await getSiteSettings();
            setSettings(fetchedSettings);
            setIsLoading(false);
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (user) {
            form.reset({
                ...form.getValues(),
                name: user.name || '',
                email: user.email,
            });
        }
    }, [user, form]);
    
    const onSubmit = async (data: ContactFormData) => {
        try {
            await createSupportTicket({
                user_id: user?.id || null,
                user_name: data.name,
                user_email: data.email,
                subject: data.subject,
                message: data.message,
            });
            toast({
                title: 'Message Sent!',
                description: "Thank you for reaching out. We'll get back to you soon.",
            });
            form.reset({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: 'Could not send your message. Please try again later.',
            });
        }
    };
    
    const ContactSkeleton = () => (
        <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
    );
    
    return (
        <div className="flex flex-col min-h-screen bg-secondary/50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-12">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold font-headline text-primary">{t('contactPage.title')}</h1>
                    <p className="mt-2 max-w-2xl mx-auto text-lg text-muted-foreground">{t('contactPage.description')}</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <Card className="lg:col-span-2 shadow-lg">
                        <CardHeader>
                            <CardTitle>{t('contactPage.formTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('contactPage.nameLabel')}</FormLabel><FormControl><Input {...field} readOnly={!!user} /></FormControl><FormMessage/></FormItem>)}/>
                                        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>{t('contactPage.emailLabel')}</FormLabel><FormControl><Input {...field} readOnly={!!user} /></FormControl><FormMessage/></FormItem>)}/>
                                    </div>
                                    <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>{t('contactPage.subjectLabel')}</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>
                                    <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel>{t('contactPage.messageLabel')}</FormLabel><FormControl><Textarea {...field} rows={6}/></FormControl><FormMessage/></FormItem>)}/>
                                    <div className="flex justify-end">
                                        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                                            {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2"/>} {t('contactPage.submitButton')}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    
                    <div className="space-y-8">
                        <Card className="shadow-lg">
                             <CardHeader>
                                <CardTitle>{t('contactPage.infoTitle')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoading ? <ContactSkeleton/> : (
                                    <>
                                        <ContactInfoItem icon={<Mail className="h-5 w-5 text-red-500"/>} title="Email Support" text={settings.contact_email} href={`mailto:${settings.contact_email}`} hoverColor="hover:shadow-red-500/10"/>
                                        <ContactInfoItem icon={<Phone className="h-5 w-5 text-green-500"/>} title="Call Us" text={settings.contact_phone} href={`tel:${settings.contact_phone}`} hoverColor="hover:shadow-green-500/10"/>
                                        <ContactInfoItem icon={<Twitter className="h-5 w-5 text-sky-500"/>} title="Follow on X" text={settings.contact_twitter} href={settings.contact_twitter} hoverColor="hover:shadow-sky-500/10"/>
                                        <ContactInfoItem icon={<Linkedin className="h-5 w-5 text-blue-600"/>} title="Connect on LinkedIn" text={settings.contact_linkedin} href={settings.contact_linkedin} hoverColor="hover:shadow-blue-600/10"/>
                                        <ContactInfoItem icon={<Youtube className="h-5 w-5 text-red-600"/>} title="Watch on YouTube" text={settings.contact_youtube} href={settings.contact_youtube} hoverColor="hover:shadow-red-600/10"/>
                                        <ContactInfoItem icon={<Facebook className="h-5 w-5 text-blue-800"/>} title="Like us on Facebook" text={settings.contact_facebook} href={settings.contact_facebook} hoverColor="hover:shadow-blue-800/10"/>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                         <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>{t('contactPage.noteTitle')}</AlertTitle>
                            <AlertDescription>{t('contactPage.noteDescription')}</AlertDescription>
                        </Alert>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
