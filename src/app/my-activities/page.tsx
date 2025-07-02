
"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/context/auth-context';
import withAuth from '@/components/with-auth';
import { getActivitiesForUser, getLeadersAddedByUser, type UserActivity, type Leader } from '@/data/leaders';
import ActivityCard from '@/components/activity-card';
import LeaderCard from '@/components/leader-card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareText, UserPlus, UserCog, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import RatingDialog from '@/components/rating-dialog';
import ProfileDialog from '@/components/profile-dialog';
import { useRouter } from 'next/navigation';

function MyActivitiesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [addedLeaders, setAddedLeaders] = useState<Leader[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(true);

  const [isRatingDialogOpen, setRatingDialogOpen] = useState(false);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<UserActivity | null>(null);

  const fetchActivities = async () => {
      if (user) {
          setIsLoadingActivities(true);
          const userActivities = await getActivitiesForUser(user.id);
          setActivities(userActivities);
          setIsLoadingActivities(false);
      }
  };

  const fetchAddedLeaders = async () => {
      if (user) {
          setIsLoadingLeaders(true);
          const leaders = await getLeadersAddedByUser(user.id);
          setAddedLeaders(leaders);
          setIsLoadingLeaders(false);
      }
  };
  
  useEffect(() => {
    fetchActivities();
    fetchAddedLeaders();
  }, [user]);

  const handleEditRating = (activity: UserActivity) => {
    setEditingActivity(activity);
    setRatingDialogOpen(true);
  };
  
  const handleRatingSuccess = (updatedLeader: Leader) => {
    setRatingDialogOpen(false);
    setEditingActivity(null);
    // Refresh activities to show updated rating/comment
    fetchActivities();
  };

  const handleEditLeader = (leaderId: string) => {
    router.push(`/add-leader?edit=${leaderId}`);
  };

  const ActivitySkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  );

  const LeaderListSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex flex-col space-y-3">
          <Skeleton className="h-[125px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );

  const ProfileInfo = ({ label, value }: {label: string, value: string | number | undefined}) => (
    <div>
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <p className="text-base font-medium">{value || '-'}</p>
    </div>
  );

  return (
    <>
      <div className="flex flex-col min-h-screen bg-secondary/50">
        <Header />
        <main className="flex-grow px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary">{t('myActivitiesPage.title')}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                {t('myActivitiesPage.dashboardDescription')}
                </p>
            </div>

            <Tabs defaultValue="ratings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ratings">{t('myActivitiesPage.ratingsTab')}</TabsTrigger>
                <TabsTrigger value="added-leaders">{t('myActivitiesPage.addedLeadersTab')}</TabsTrigger>
                <TabsTrigger value="profile">{t('myActivitiesPage.profileTab')}</TabsTrigger>
              </TabsList>

              <TabsContent value="ratings" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('myActivitiesPage.ratingsTabTitle')}</CardTitle>
                    <CardDescription>{t('myActivitiesPage.ratingsTabDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingActivities ? (
                      <ActivitySkeleton />
                    ) : activities.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activities.map((activity) => (
                          <ActivityCard key={activity.leaderId} activity={activity} onEdit={() => handleEditRating(activity)} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 px-4 rounded-lg bg-background border-2 border-dashed border-border">
                        <MessageSquareText className="w-12 h-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold font-headline">{t('myActivitiesPage.noActivitiesTitle')}</h3>
                        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                          {t('myActivitiesPage.noActivitiesDescription')}
                        </p>
                        <Button asChild className="mt-6">
                            <Link href="/rate-leader">{t('hero.findLeader')}</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="added-leaders" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('myActivitiesPage.addedLeadersTabTitle')}</CardTitle>
                    <CardDescription>{t('myActivitiesPage.addedLeadersTabDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingLeaders ? (
                      <LeaderListSkeleton />
                    ) : addedLeaders.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {addedLeaders.map((leader) => (
                          <LeaderCard
                            key={leader.id}
                            leader={leader}
                            isEditable={true}
                            onEdit={() => handleEditLeader(leader.id)}
                          />
                        ))}
                      </div>
                    ) : (
                       <div className="text-center py-16 px-4 rounded-lg bg-background border-2 border-dashed border-border">
                        <UserPlus className="w-12 h-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold font-headline">{t('myActivitiesPage.noAddedLeadersTitle')}</h3>
                        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                           {t('myActivitiesPage.noAddedLeadersDescription')}
                        </p>
                        <Button asChild className="mt-6">
                            <Link href="/add-leader">{t('hero.addNewLeader')}</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="profile" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <UserCog className="w-6 h-6 text-primary" />
                        {t('myActivitiesPage.profileTabTitle')}
                      </CardTitle>
                      <CardDescription>{t('myActivitiesPage.profileTabDescription')}</CardDescription>
                    </div>
                    <Button onClick={() => setProfileDialogOpen(true)}>
                      <Edit /> {t('profileDialog.editButton')}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ProfileInfo label={t('profileDialog.nameLabel')} value={user?.name} />
                        <ProfileInfo label={t('profileDialog.genderLabel')} value={user?.gender} />
                        <ProfileInfo label={t('profileDialog.ageLabel')} value={user?.age} />
                    </div>
                    <Separator />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ProfileInfo label={t('profileDialog.stateLabel')} value={user?.state} />
                        <ProfileInfo label={t('profileDialog.mpConstituencyLabel')} value={user?.mpConstituency} />
                        <ProfileInfo label={t('profileDialog.mlaConstituencyLabel')} value={user?.mlaConstituency} />
                        <ProfileInfo label={t('profileDialog.panchayatLabel')} value={user?.panchayat} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </main>
        <Footer />
      </div>

      {editingActivity && (
        <RatingDialog
          leader={editingActivity.leader}
          open={isRatingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          onRatingSuccess={handleRatingSuccess}
          initialRating={editingActivity.rating}
          initialComment={editingActivity.comment}
          initialSocialBehaviour={editingActivity.socialBehaviour}
        />
      )}

      <ProfileDialog open={isProfileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </>
  );
}

export default withAuth(MyActivitiesPage);
