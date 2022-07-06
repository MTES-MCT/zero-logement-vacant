import { differenceInMilliseconds } from 'date-fns';
import * as duration from 'duration-fns';


export const dateSort = (d1?: Date, d2?: Date) => d1 ? (d2 ? differenceInMilliseconds(d1, d2) : 1) : (d2 ? -1 : 0)

export const durationSort = (d1?: Duration, d2?: Duration) => d1 ? (d2 ? duration.toMilliseconds(d1) - duration.toMilliseconds(d2) : 1) : (d2 ? -1 : 0)
