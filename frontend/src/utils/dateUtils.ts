import { add, differenceInMilliseconds } from 'date-fns';


export const dateSort = (d1?: Date, d2?: Date) => d1 ? (d2 ? differenceInMilliseconds(d1, d2) : 1) : (d2 ? -1 : 0)

export const durationSort = (d1?: Duration, d2?: Duration) => d1 ? (d2 ? dateSort(add(new Date, d1), add(new Date(), d2)) : 1) : (d2 ? -1 : 0)
