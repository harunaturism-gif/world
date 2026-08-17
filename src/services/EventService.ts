export interface EventData {
  eventId: string;
  name: string;
  roomId: string;
  startsAt: string;
}

const mockEvents: EventData[] = [
  { eventId: 'e1', name: 'Digital Art Opening', roomId: 'gallery-01', startsAt: 'Tomorrow 8PM' }
];

export const EventService = {
  async getEvents(): Promise<EventData[]> {
    return [...mockEvents];
  }
};
