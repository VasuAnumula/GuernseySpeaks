"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useNotifications } from '@/contexts/notification-context';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Bell, MessageCircle, Reply, ThumbsUp, Megaphone, Check, Loader2 } from 'lucide-react';
import type { NotificationType } from '@/types';

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/notifications');
    }
  }, [user, authLoading, router]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'post_comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'comment_reply':
        return <Reply className="h-5 w-5 text-purple-500" />;
      case 'post_like':
        return <ThumbsUp className="h-5 w-5 text-orange-500" />;
      case 'system':
        return <Megaphone className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

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

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-2xl">Notifications</CardTitle>
                  <CardDescription>
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                  </CardDescription>
                </div>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark all as read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No notifications yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  When someone interacts with your posts, you'll see it here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const createdAt = notification.createdAt instanceof Date
                    ? notification.createdAt
                    : (notification.createdAt as any).toDate();

                  return (
                    <Link
                      key={notification.id}
                      href={notification.link}
                      onClick={() => handleNotificationClick(notification.id)}
                      className={`block p-4 hover:bg-muted/50 transition-colors ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm mt-0.5 ${!notification.read ? 'font-medium' : 'text-muted-foreground'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(createdAt, { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="flex-shrink-0 mt-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          </div>
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
    </MainLayout>
  );
}
