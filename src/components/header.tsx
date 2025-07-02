
'use client';

import { Scale, Menu, Globe, User, LogOut, UserCog, Settings, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useLanguage, type Language } from '@/context/language-context';
import { useAuth } from '@/context/auth-context';
import ProfileDialog from './profile-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function Header() {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);


  const navLinks = [
    { href: '/', label: t('header.home') },
    { href: '/about', label: t('header.about') },
    { href: '/my-activities', label: t('header.myActivities') },
  ];

  const handleActivitiesClick = () => {
    if (user) {
        router.push('/my-activities');
    } else {
        setMobileMenuOpen(false); // Close mobile menu if it's open
        setShowLoginDialog(true);
    }
  };

  const LanguageSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('header.language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setLanguage('en')}>
          {t('header.english')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage('hi')}>
          {t('header.hindi')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const UserAccountNav = () => (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-11 w-11 rounded-full">
            <Avatar className="h-11 w-11">
              <AvatarFallback>{user?.name?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setProfileDialogOpen(true)}>
             <UserCog className="mr-2 h-4 w-4" />
             <span>{t('header.myProfile')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/my-activities">
              <User className="mr-2 h-4 w-4" />
              <span>{t('header.myActivities')}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
              <Link href="/account-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('header.accountSettings')}</span>
              </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); logout(); }}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('header.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProfileDialog open={isProfileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </>
  );

  const MobileNav = () => (
    <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
          <Button variant="ghost" className="md:hidden">
              <Menu />
              <span className="sr-only">Open menu</span>
          </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col p-0">
          <div className="flex items-center justify-between border-b p-4">
               <SheetClose asChild>
                   <Link href="/" className="flex items-center gap-2">
                      <Scale className="w-8 h-8 text-primary" />
                      <span className="text-2xl font-bold font-headline text-primary">PolitiRate</span>
                  </Link>
               </SheetClose>
              <SheetTitle className="sr-only">Menu</SheetTitle>
          </div>
          
          <div className="flex-grow overflow-y-auto">
              {user && (
                <Collapsible className="border-b">
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-secondary/50 [&[data-state=open]>svg]:rotate-180">
                      <div className="flex items-center gap-3">
                          <Avatar>
                              <AvatarFallback>{user.name?.[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col text-left">
                              <span className="font-semibold">{user.name}</span>
                              <span className="text-sm text-muted-foreground">{user.email}</span>
                          </div>
                      </div>
                      <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 bg-secondary/30 pb-4">
                        <SheetClose asChild>
                            <button onClick={() => setProfileDialogOpen(true)} className="flex w-full items-center gap-2 py-2 px-4 pl-12 text-left text-base font-medium hover:text-primary transition-colors hover:bg-secondary">
                                <UserCog className="h-4 w-4" />
                                <span>{t('header.myProfile')}</span>
                            </button>
                        </SheetClose>
                        <SheetClose asChild>
                            <Link href="/account-settings" className="flex w-full items-center gap-2 py-2 px-4 pl-12 text-base font-medium hover:text-primary transition-colors hover:bg-secondary">
                               <Settings className="h-4 w-4" />
                               <span>{t('header.accountSettings')}</span>
                            </Link>
                        </SheetClose>
                  </CollapsibleContent>
                </Collapsible>
              )}
              
              <nav className="flex flex-col gap-1 p-4">
                  {navLinks.map(link => (
                    <SheetClose asChild key={link.href}>
                      {link.href === '/my-activities' ? (
                          <button onClick={handleActivitiesClick} className="w-full text-left text-base font-medium hover:text-primary transition-colors p-2 rounded-md hover:bg-secondary">
                              {link.label}
                          </button>
                      ) : (
                          <Link href={link.href} className="block text-base font-medium hover:text-primary transition-colors p-2 rounded-md hover:bg-secondary">
                             {link.label}
                          </Link>
                      )}
                    </SheetClose>
                  ))}
              </nav>
          </div>

          <div className="border-t mt-auto p-4 space-y-6">
              <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">{t('header.language')}</p>
                  <RadioGroup defaultValue={language} onValueChange={(value) => setLanguage(value as Language)} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="en" id="lang-en-mobile" />
                          <Label htmlFor="lang-en-mobile">{t('header.english')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hi" id="lang-hi-mobile" />
                          <Label htmlFor="lang-hi-mobile">{t('header.hindi')}</Label>
                      </div>
                  </RadioGroup>
              </div>

              <div>
                  {user ? (
                      <SheetClose asChild>
                          <Button onClick={logout} className="w-full" variant="outline">
                              <LogOut className="mr-2 h-4 w-4" />
                              {t('header.logout')}
                          </Button>
                      </SheetClose>
                  ) : (
                      <SheetClose asChild>
                          <Link href="/login" className="w-full">
                              <Button className="w-full">{t('header.loginSignUp')}</Button>
                          </Link>
                      </SheetClose>
                  )}
              </div>
          </div>
      </SheetContent>
    </Sheet>
);

  return (
    <>
      <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-40 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Scale className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold font-headline text-primary">PolitiRate</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navLinks.map(link => (
                  link.href === '/my-activities' ? (
                      <button
                          key={link.href}
                          onClick={handleActivitiesClick}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                          {link.label}
                      </button>
                  ) : (
                      <Link key={link.href} href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                          {link.label}
                      </Link>
                  )
              ))}
            </nav>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                  {user ? (
                    <UserAccountNav />
                  ) : (
                    <Link href="/login">
                      <Button>{t('header.loginSignUp')}</Button>
                    </Link>
                  )}
                  <LanguageSelector />
              </div>
              <MobileNav />
            </div>
          </div>
        </div>
      </header>
      
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('auth.requiredTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('auth.activitiesLoginRequired')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('auth.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/login?redirect=/my-activities')}>
              {t('auth.login')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
