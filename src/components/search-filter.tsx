'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';
import { Label } from '@/components/ui/label';
import { RotateCw, Search } from 'lucide-react';

type ElectionType = 'national' | 'state' | 'panchayat' | '';

interface SearchFilterProps {
  onSearch: (filters: { electionType: ElectionType; searchTerm: string; candidateName: string; }) => void;
}

export default function SearchFilter({ onSearch }: SearchFilterProps) {
  const [electionType, setElectionType] = useState<ElectionType>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const { t } = useLanguage();

  const handleSearchClick = () => {
    onSearch({ electionType, searchTerm, candidateName });
  };

  const handleResetClick = () => {
    setElectionType('');
    setSearchTerm('');
    setCandidateName('');
    onSearch({ electionType: '', searchTerm: '', candidateName: '' });
  };

  const getPlaceholder = () => {
    if (!electionType) return t('searchFilter.placeholder.default');
    return t(`searchFilter.placeholder.${electionType}`);
  }

  return (
    <div className="p-6 bg-secondary/50 rounded-lg mb-8 border border-border">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="grid gap-2">
          <Label htmlFor="candidate-name" className="font-semibold">
            {t('searchFilter.candidateNameLabel')}
          </Label>
          <Input
            id="candidate-name"
            placeholder={t('searchFilter.candidateNamePlaceholder')}
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            className="bg-background"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="election-type" className="font-semibold">
            {t('searchFilter.electionTypeLabel')}
          </Label>
          <Select value={electionType} onValueChange={(value) => setElectionType(value as ElectionType)}>
            <SelectTrigger id="election-type" className="bg-background">
              <SelectValue placeholder={t('searchFilter.electionTypePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="national">{t('searchFilter.national')}</SelectItem>
              <SelectItem value="state">{t('searchFilter.state')}</SelectItem>
              <SelectItem value="panchayat">{t('searchFilter.panchayat')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2">
           <Label htmlFor="search-term" className="font-semibold">
            {t('searchFilter.constituencyLabel')}
          </Label>
          <Input
            id="search-term"
            placeholder={getPlaceholder()}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-background"
          />
        </div>
        
        <div className="flex gap-2">
            <Button onClick={handleResetClick} variant="outline">
                <RotateCw className="mr-2 h-4 w-4" />
                {t('searchFilter.resetButton')}
            </Button>
            <Button onClick={handleSearchClick}>
                <Search className="mr-2 h-4 w-4" />
                {t('searchFilter.searchButton')}
            </Button>
        </div>
      </div>
    </div>
  );
}
