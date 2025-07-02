
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useLanguage } from '@/context/language-context';

interface ManifestoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manifestoUrl: string | null;
  leaderName: string;
}

export default function ManifestoDialog({ open, onOpenChange, manifestoUrl, leaderName }: ManifestoDialogProps) {
  const { t } = useLanguage();

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };
  
  if (!manifestoUrl) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-2">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{t('manifestoDialog.title', { name: leaderName })}</DialogTitle>
          <DialogDescription>{t('manifestoDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow h-full w-full rounded-md overflow-hidden border">
          <iframe
            src={manifestoUrl}
            title={`Manifesto for ${leaderName}`}
            className="w-full h-full"
            frameBorder="0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
