
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getUnreadMessages, markMessageAsRead, type AdminMessage } from '@/data/users';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { MailWarning, Mail } from 'lucide-react';

export default function AdminMessageManager() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const fetchMessages = async () => {
      if (user) {
        const unreadMessages = await getUnreadMessages(user.id);
        setMessages(unreadMessages);
        setCurrentMessageIndex(0);
      } else {
        setMessages([]);
      }
    };
    fetchMessages();
  }, [user]);

  const handleAcknowledge = async () => {
    const currentMessage = messages[currentMessageIndex];
    if (currentMessage) {
      await markMessageAsRead(currentMessage.id);
    }
    // Move to the next message or close if it's the last one
    if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    } else {
      setMessages([]); // All messages acknowledged
    }
  };

  const currentMessage = messages[currentMessageIndex];
  if (!user || !currentMessage) {
    return null;
  }

  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MailWarning className="text-amber-500" />
            Message from Admin
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left py-4">
            {currentMessage.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleAcknowledge}>Acknowledge</Button>
          <AlertDialogAction asChild>
            <a href="mailto:support@politirate.com" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Support
            </a>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
