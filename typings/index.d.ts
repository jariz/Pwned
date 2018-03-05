declare module 'timeout-as-promise' {
    function delay<T>(timeout: number, resolveWith?: T): Promise<T | null>
    export default delay
}

declare module '1password' {
    import EventEmitter = NodeJS.EventEmitter;

    type ItemOptions = {
        title: string | null,
        username: string | null,
        password: string | null,
        url: string | null,
        notes: string | null
    }

    type LockType = 'overview' | 'keys' | 'details' | 'all'

    class Keychain extends EventEmitter {
        items: { [uuid: string]: Item };
        profileName: string;
        unlocked: boolean;

        load(path: string, callback: (err: Error) => void): void;

        unlock(password: string): void;

        lock(): void;

        rescheduleAutoLock(): void;

        changePassword(currentPassword: string, newPassword: string): void;

        createItem(options: ItemOptions): Item;

        addItem(item: Item): void;

        getItem(uuid: string): Item;

        findItems(query: string): Item[];

        eachItem(callback: (item: Item) => void): void;

        exportProfile(): string;

        exportBands(): { (filename: string): string };
    }

    class ItemDetailsField {
        type: 'T' | 'P'
        name: string;
        value: string;
        designation: 'username' | 'password';
    }

    class ItemDetails {
        fields?: ItemDetailsField[]
        notesPlain?: string;
    }

    class ItemKeys {
        encryption: Buffer;
        hmac: Buffer;
    }

    class ItemOverview {
        title: string;
        ainfo?: string;
        url?: string;
        URLS?: { l: 'website', u: string }[]
        ps?: number;
    }

    export class Item {
        keychain: Keychain;
        detailsUnlocked: boolean;
        overviewUnlocked: boolean;
        keysUnlocked: boolean;
        encrypted: any;
        category: string;
        uuid: string;
        updated: number;
        tx: number;
        created: number;
        hmac: Buffer;

        details: ItemDetails;
        overview: ItemOverview;

        load(rawData: any): void;

        lock(type?: LockType): void;

        unlock(type?: LockType): void;

        encrypt(type?: LockType): void;

        toJSON(): any;

        match(query: string): boolean
    }

    export default Keychain;
}