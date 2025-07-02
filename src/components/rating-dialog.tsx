
'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Leader } from '@/data/leaders';
import { submitRatingAndComment } from '@/data/leaders';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface RatingDialogProps {
  leader: Leader;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRatingSuccess: (updatedLeader: Leader) => void;
  initialRating?: number | null;
  initialComment?: string | null;
  initialSocialBehaviour?: string | null;
}

export default function RatingDialog({ leader, open, onOpenChange, onRatingSuccess, initialRating = 0, initialComment = '', initialSocialBehaviour = null }: RatingDialogProps) {
  const [rating, setRating] = useState(initialRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialComment || '');
  const [socialBehaviour, setSocialBehaviour] = useState<string | null>(initialSocialBehaviour);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      setRating(initialRating || 0);
      setComment(initialComment || '');
      setSocialBehaviour(initialSocialBehaviour || null);
    } else {
      // Reset after a short delay to allow the dialog to close smoothly
      setTimeout(() => {
        setRating(0);
        setHoverRating(0);
        setComment('');
        setSocialBehaviour(null);
      }, 200);
    }
  }, [open, initialRating, initialComment, initialSocialBehaviour]);

  const socialBehaviourOptions = [
    { value: 'social-worker', label: t('ratingDialog.socialBehaviourOptions.socialWorker') },
    { value: 'honest', label: t('ratingDialog.socialBehaviourOptions.honest') },
    { value: 'corrupt', label: t('ratingDialog.socialBehaviourOptions.corrupt') },
    { value: 'criminal', label: t('ratingDialog.socialBehaviourOptions.criminal') },
    { value: 'aggressive', label: t('ratingDialog.socialBehaviourOptions.aggressive') },
    { value: 'humble', label: t('ratingDialog.socialBehaviourOptions.humble') },
    { value: 'fraud', label: t('ratingDialog.socialBehaviourOptions.fraud') },
    { value: 'average', label: t('ratingDialog.socialBehaviourOptions.average') },
  ];

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: t('ratingDialog.errorTitle'),
        description: t('ratingDialog.errorDescriptionRating'),
      });
      return;
    }
    if (!socialBehaviour) {
      toast({
        variant: 'destructive',
        title: t('ratingDialog.errorTitle'),
        description: t('ratingDialog.errorDescriptionBehaviour'),
      });
      return;
    }
    if (!comment || comment.trim().length === 0) {
      toast({
        variant: 'destructive',
        title: t('ratingDialog.errorTitle'),
        description: t('ratingDialog.errorDescriptionComment'),
      });
      return;
    }

    if (!user) {
       toast({
        variant: 'destructive',
        title: t('auth.requiredTitle'),
        description: t('auth.rateLoginRequired'),
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const updatedLeader = await submitRatingAndComment(leader.id, user.id, rating, comment, socialBehaviour);
      if (updatedLeader) {
        toast({
          title: t('ratingDialog.successTitle'),
          description: t('ratingDialog.successDescription').replace('{leaderName}', leader.name),
        });
        onRatingSuccess(updatedLeader);
        onOpenChange(false);
      } else {
        throw new Error('Failed to update leader rating.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('ratingDialog.submitErrorTitle'),
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('ratingDialog.title').replace('{leaderName}', '')}
            <span className="font-bold text-primary">{leader.name}</span>
          </DialogTitle>
          <DialogDescription>
            {t('ratingDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
           <div className="space-y-2">
              <Label className="font-bold text-foreground">{t('ratingDialog.ratingLabel')}</Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-10 w-10 cursor-pointer transition-colors',
                      (hoverRating >= star || rating >= star)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-muted-foreground'
                    )}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
           </div>
           <div className="space-y-2 max-w-sm">
            <Label htmlFor="social-behaviour" className="font-bold text-foreground">{t('ratingDialog.socialBehaviourLabel')}</Label>
            <Select value={socialBehaviour ?? ''} onValueChange={(value) => setSocialBehaviour(value === '' ? null : value)}>
              <SelectTrigger id="social-behaviour">
                <SelectValue placeholder={t('ratingDialog.socialBehaviourPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {socialBehaviourOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label htmlFor="comment" className="font-bold text-foreground">{t('ratingDialog.commentLabel')}</Label>
            <Textarea
              id="comment"
              placeholder={t('ratingDialog.commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('ratingDialog.cancelButton')}</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('ratingDialog.submittingButton') : t('ratingDialog.submitButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
