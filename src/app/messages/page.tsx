
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, PenSquare } from 'lucide-react';
import { subscribeToConversations } from '@/services/messageService';
import type { Conversation } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { NewConversationDialog } from '@/components/messages/new-conversation-dialog';

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newConversationOpen, setNewConversationOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/messages');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = subscribeToConversations(user.uid, (newConversations) => {
      setConversations(newConversations);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading || !user) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  const getOtherParticipant = (conversation: Conversation) => {
    const otherUid = conversation.participants.find((uid) => uid !== user.uid);
    if (otherUid && conversation.participantInfo[otherUid]) {
      return conversation.participantInfo[otherUid];
    }
    return { displayName: 'Unknown User' };
  };

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-2xl">Messages</CardTitle>
                  <CardDescription>Your private conversations</CardDescription>
                </div>
              </div>
              <Button onClick={() => setNewConversationOpen(true)}>
                <PenSquare className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start a conversation by clicking "New Message" or visiting a user's profile.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conversation) => {
                  const otherParticipant = getOtherParticipant(conversation);
                  const lastMessageTime = conversation.lastMessage?.sentAt
                    ? conversation.lastMessage.sentAt instanceof Date
                      ? conversation.lastMessage.sentAt
                      : (conversation.lastMessage.sentAt as any).toDate()
                    : null;

                  const isUnread =
                    conversation.lastMessage &&
                    conversation.lastMessage.senderId !== user.uid;

                  return (
                    <Link
                      key={conversation.id}
                      href={`/messages/${conversation.id}`}
                      className={`block p-4 hover:bg-muted/50 transition-colors ${
                        isUnread ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherParticipant.avatarUrl} />
                          <AvatarFallback>
                            {otherParticipant.displayName.substring(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium truncate ${isUnread ? 'text-primary' : ''}`}>
                              {otherParticipant.displayName}
                            </p>
                            {lastMessageTime && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(lastMessageTime, { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p className={`text-sm truncate ${isUnread ? 'font-medium' : 'text-muted-foreground'}`}>
                              {conversation.lastMessage.senderId === user.uid ? 'You: ' : ''}
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                        {isUnread && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        currentUser={user}
      />
    </MainLayout>
  );
}
