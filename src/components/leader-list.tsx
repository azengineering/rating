import type { Leader } from '@/data/leaders';
import LeaderCard from './leader-card';
import { Gavel, PlusCircle } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LeaderListProps {
  leaders: Leader[];
}

export default function LeaderList({ leaders }: LeaderListProps) {
  const { t } = useLanguage();

  if (leaders.length === 0) {
    return (
      <div className="text-center py-16 px-4 rounded-lg bg-secondary border-2 border-dashed border-border">
        <Gavel className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold font-headline">{t('leaderList.noLeaders')}</h3>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          {t('leaderList.noLeadersDesc')}
        </p>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          {t('leaderList.addLeaderPrompt')}
        </p>
        <Button asChild className="mt-6">
          <Link href="/add-leader">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('hero.addNewLeader')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {leaders.map((leader) => (
        <LeaderCard key={leader.id} leader={leader} />
      ))}
    </div>
  );
}
