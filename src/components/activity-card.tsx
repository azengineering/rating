
import Image from 'next/image';
import { Star, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import type { UserActivity } from '@/data/leaders';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { Badge } from '@/components/ui/badge';

const LinkRenderer = ({ text }: { text: string | null }) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, index) =>
        urlRegex.test(part) ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
};

export default function ActivityCard({ activity, onEdit }: ActivityCardProps) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4 p-4 bg-card">
        <Avatar className="h-10 w-10 border-2 border-primary/50">
          <AvatarImage src={activity.leaderPhotoUrl || 'https://placehold.co/400x400.png'} alt={activity.leaderName} data-ai-hint="politician" />
          <AvatarFallback>{activity.leaderName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-grow flex items-center justify-between">
          <CardTitle className="text-lg font-headline">{activity.leaderName}</CardTitle>
          <p className="text-xs text-muted-foreground whitespace-nowrap pl-4">
            {formatDistanceToNow(new Date(activity.updatedAt), { addSuffix: true })}
          </p>
        </div>
      </CardHeader>
      
      {activity.comment && (
        <CardContent className="p-4 pt-0">
          <blockquote className="border-l-2 pl-3 text-sm italic text-foreground break-words">
            “<LinkRenderer text={activity.comment} />”
          </blockquote>
        </CardContent>
      )}

      <CardFooter className="bg-secondary/50 p-3 flex justify-between items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-5 w-5',
                  i < activity.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'
                )}
              />
            ))}
          </div>
          {activity.socialBehaviour && (
            <Badge variant="secondary" className="capitalize">{activity.socialBehaviour.replace('-', ' ')}</Badge>
          )}
        </div>
        <Button onClick={onEdit} variant="ghost" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          {t('myActivitiesPage.editRatingButton')}
        </Button>
      </CardFooter>
    </Card>
  );
}
