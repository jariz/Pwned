export type Partial<T> = {
    [P in keyof T]?: T[P];
};

export enum BreachItemStatus {
    Fetching = 'fetching',
    Error = 'error',
    Done = 'done'
}

// specialized item that we'll emit to our client.
// ... basically a stripped down version of Item with some added fields
export type BreachItem = {
    title: string,
    username?: string,
    url?: string,
    status: BreachItemStatus,
    breaches: number | null,
    passwordStrength?: number,
    uuid: string
}