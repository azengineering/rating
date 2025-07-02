
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, X } from 'lucide-react';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useLanguage } from '@/context/language-context';
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { firebaseEnabled } from "@/lib/firebase";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-4.73 1.9-3.41 0-6.19-2.84-6.19-6.32s2.78-6.32 6.19-6.32c1.93 0 3.22.74 4.21 1.66l2.77-2.77C18.04 2.89 15.65 2 12.48 2c-5.26 0-9.58 4.28-9.58 9.58s4.32 9.58 9.58 9.58c5.03 0 9.12-3.41 9.12-9.35 0-.64-.06-1.25-.16-1.84z"/>
    </svg>
);

export default function SignupPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { signup, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signup(values.email, values.password);
      toast({
        title: "Account Created!",
        description: "Please log in to continue.",
      });
      // The signup function in context will handle redirection
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    }
  }

  async function handleGoogleSignIn() {
    try {
        await signInWithGoogle();
        toast({
            title: "Account Created!",
            description: "Welcome to PolitiRate!",
        });
    } catch (error) {
        toast({
            title: "Google Sign-In Failed",
            description: error instanceof Error ? error.message : "Please try again later.",
            variant: "destructive",
        });
    }
  }

  return (
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
              <UserPlus className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-headline">{t('signupPage.title')}</CardTitle>
            <CardDescription className="pt-1">{t('signupPage.description')}</CardDescription>
          </CardHeader>
          <CardContent className="px-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('signupPage.emailLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} className="py-6" />
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
                      <FormLabel>{t('signupPage.passwordLabel')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="py-6" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('signupPage.confirmPasswordLabel')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="py-6" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full py-6 text-lg">{t('signupPage.signupButton')}</Button>
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
                        Sign up with Google
                    </Button>
                </>
            )}
          </CardContent>
          <CardFooter className="flex justify-center p-8 bg-secondary/30 rounded-b-xl">
            <p className="text-sm text-muted-foreground">
              {t('signupPage.loginPrompt')} <Link href="/login" className="text-primary hover:underline font-bold">{t('signupPage.loginLink')}</Link>
            </p>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
