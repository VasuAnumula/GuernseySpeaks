
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search, Send } from 'lucide-react';
import { getUsers } from '@/services/userService';
import { getOrCreateConversation, sendMessage } from '@/services/messageService';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  preselectedUserId?: string;
  preselectedUserInfo?: { displayName: string; avatarUrl?: string };
}

export function NewConversationDialog({
  open,
  onOpenChange,
  currentUser,
  preselectedUserId,
  preselectedUserInfo,
}: NewConversationDialogProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // If preselected user is provided, use it
  useEffect(() => {
    if (preselectedUserId && preselectedUserInfo) {
      setSelectedUser({
        uid: preselectedUserId,
        displayName: preselectedUserInfo.displayName,
        avatarUrl: preselectedUserInfo.avatarUrl,
      } as User);
    }
  }, [preselectedUserId, preselectedUserInfo]);

  // Search users when query changes
  useEffect(() => {
    if (!searchQuery.trim() || selectedUser) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoadingUsers(true);
      try {
        const allUsers = await getUsers();
        const filtered = allUsers.filter(
          (u) =>
            u.uid !== currentUser.uid &&
            (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setUsers(filtered.slice(0, 10));
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, currentUser.uid, selectedUser]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery('');
    setUsers([]);
  };

  const handleSend = async () => {
    if (!selectedUser || !message.trim()) return;

    setSending(true);
    try {
      const conversation = await getOrCreateConversation(
        currentUser.uid,
        {
          displayName: currentUser.displayName || currentUser.name || 'User',
          avatarUrl: currentUser.avatarUrl || undefined,
        },
        selectedUser.uid,
        {
          displayName: selectedUser.displayName || selectedUser.name || 'User',
          avatarUrl: selectedUser.avatarUrl || undefined,
        }
      );

      await sendMessage(conversation.id, currentUser.uid, message.trim());

      toast({
        title: 'Message Sent',
        description: `Your message to ${selectedUser.displayName || selectedUser.name} has been sent.`,
      });

      onOpenChange(false);
      router.push(`/messages/${conversation.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setSelectedUser(null);
      setSearchQuery('');
      setMessage('');
      setUsers([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Start a private conversation with another user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label>To:</Label>
            {selectedUser ? (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedUser.avatarUrl || undefined} />
                  <AvatarFallback>
                    {(selectedUser.displayName || selectedUser.name || 'U')
                      .substring(0, 1)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 font-medium">
                  {selectedUser.displayName || selectedUser.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                  disabled={sending || !!preselectedUserId}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a user..."
                  className="pl-9"
                  disabled={sending}
                />
                {loadingUsers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}

                {users.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {users.map((user) => (
                      <button
                        key={user.uid}
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback>
                            {(user.displayName || user.name || 'U')
                              .substring(0, 1)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.displayName || user.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              rows={4}
              maxLength={1000}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !selectedUser || !message.trim()}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
