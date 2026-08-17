export interface NotificationData {
  id: number;
  text: string;
  time: string;
  unread: boolean;
}

const mockNotifs: NotificationData[] = [
  { id: 1, text: "Luna followed you", time: "2m ago", unread: true },
  { id: 2, text: "Digital Art Opening begins in 1 hour", time: "1h ago", unread: false },
  { id: 3, text: "Your space Neon Arcade reached 20 visitors!", time: "5h ago", unread: false }
];

export const NotificationService = {
  async getNotifications(): Promise<NotificationData[]> {
    // In a real app, this would query Supabase for the authenticated user's notifications.
    return [...mockNotifs];
  }
};
