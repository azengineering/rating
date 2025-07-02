import type { Leader } from '@/data/leaders';
import LeaderCard from './leader-card';
import { useLanguage } from '@/context/language-context';

interface FeaturedLeadersProps {
  leaders: Leader[];
}

export default function FeaturedLeaders({ leaders }: FeaturedLeadersProps) {
  const { t } = useLanguage();
  if (!leaders.length) return null;

  return (
    <section className="py-16 md:py-24 bg-secondary/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold">{t('featuredLeaders.heading')}</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            {t('featuredLeaders.subheading')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {leaders.map((leader) => (
            <LeaderCard key={leader.id} leader={leader} />
          ))}
        </div>
      </div>
    </section>
  );
}
