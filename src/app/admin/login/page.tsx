
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, X, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Admin' && password === 'Admin') {
      localStorage.setItem('admin_auth', 'true');
      router.push('/admin');
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid username or password.',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <Card className="w-full max-w-sm shadow-xl rounded-xl relative">
        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" onClick={() => router.push('/')}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
        </Button>
        <CardHeader className="text-center p-8">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Admin Panel</CardTitle>
          <CardDescription className="pt-1">Please login to continue</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Default: Admin"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Default: Admin"
                className="h-12"
              />
            </div>
            <Button type="submit" size="lg" className="w-full text-base">
              Login
            </Button>
          </form>
        </CardContent>
         <CardFooter className="flex justify-center p-6 bg-secondary/30 rounded-b-xl border-t">
            <Link href="/" className="text-sm text-primary hover:underline font-medium flex items-center gap-2">
                <Home className="h-4 w-4" />
                Return to main site
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
