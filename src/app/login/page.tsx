
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scale, X, Ban, Mail } from 'lucide-react';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/context/auth-context';
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { firebaseEnabled } from "@/lib/firebase";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

interface BlockInfo {
  reason: string;
  until: string | null;
}

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-4.73 1.9-3.41 0-6.19-2.84-6.19-6.32s2.78-6.32 6.19-6.32c1.93 0 3.22.74 4.21 1.66l2.77-2.77C18.04 2.89 15.65 2 12.48 2c-5.26 0-9.58 4.28-9.58 9.58s4.32 9.58 9.58 9.58c5.03 0 9.12-3.41 9.12-9.35 0-.64-.06-1.25-.16-1.84z"/>
    </svg>
);

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const redirectPath = searchParams.get('redirect');
      await login(values.email, values.password, redirectPath);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('BLOCKED::')) {
          const [_, reason, until] = error.message.split('::');
          setBlockInfo({ reason, until: until !== 'null' ? until : null });
      } else {
        toast({
          title: "Login Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
          variant: "destructive",
        });
      }
    }
  }

  async function handleGoogleSignIn() {
    try {
        const redirectPath = searchParams.get('redirect');
        await signInWithGoogle(redirectPath);
        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('BLOCKED::')) {
            const [_, reason, until] = error.message.split('::');
            setBlockInfo({ reason, until: until !== 'null' ? until : null });
        } else {
            toast({
                title: "Google Sign-In Failed",
                description: error instanceof Error ? error.message : "Please try again later.",
                variant: "destructive",
            });
        }
    }
  }

  const BlockedDialog = () => {
    if (!blockInfo) return null;
    
    const blockedUntilDate = blockInfo.until ? new Date(blockInfo.until).toLocaleString() : 'Permanent';

    return (
      <AlertDialog open={!!blockInfo} onOpenChange={() => setBlockInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Ban className="text-destructive" /> Account Blocked</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left py-4 space-y-2 text-sm text-muted-foreground">
                <p>Your account has been blocked by an administrator.</p>
                <p><strong>Reason:</strong> {blockInfo.reason}</p>
                <p><strong>Blocked Until:</strong> {blockedUntilDate}</p>
                <p>If you believe this is a mistake, please contact our support team.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setBlockInfo(null)}>Acknowledge</Button>
            <AlertDialogAction asChild>
                <a href="mailto:support@politirate.com" className="flex items-center gap-2">
                    <Mail /> Contact Support
                </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <>
    <BlockedDialog />
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow flex items-center justify-center container mx-auto px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Card className="w-full max-w-md shadow-2xl border-border/20 rounded-xl relative">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" onClick={() => router.back()}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
          <CardHeader className="text-center p-8">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
              <Scale className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-headline">{t('loginPage.title')}</CardTitle>
            <CardDescription className="pt-1">{t('loginPage.description')}</CardDescription>
          </CardHeader>
          <CardContent className="px-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('loginPage.emailLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} className="py-6"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('loginPage.passwordLabel')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="py-6"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full py-6 text-lg">
                  {t('loginPage.loginButton')}
                </Button>
              </form>
            </Form>
            {firebaseEnabled && (
                <>
                    <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                    </div>
                    <Button variant="outline" className="w-full py-6 text-lg" onClick={handleGoogleSignIn}>
                        <GoogleIcon className="mr-2 h-5 w-5"/>
                        Sign in with Google
                    </Button>
                </>
            )}
          </CardContent>
          <CardFooter className="flex justify-center p-8 bg-secondary/30 rounded-b-xl">
            <p className="text-sm text-muted-foreground">
              {t('loginPage.signupPrompt')} <Link href="/signup" className="text-primary hover:underline font-bold">{t('signupPage.signupLink')}</Link>
            </p>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
    </>
  );
}
