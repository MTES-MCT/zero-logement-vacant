export const ROOM_COUNT_VALUES = ['1', '2', '3', '4', 'gte5'] as const;

export type RoomCount = (typeof ROOM_COUNT_VALUES)[number];
