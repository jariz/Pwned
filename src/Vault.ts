import { EventEmitter } from 'events';
import Keychain from '1password';
import { BreachItem, BreachItemStatus } from './types';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { difference } from 'lodash';
import delay from 'timeout-as-promise'

type HashingResult = {
    uuid: string,
    hash: Buffer | string
}

/**
 * Vault is responsible for 1password vault management and breach status checking
 */
export default class Vault extends EventEmitter {
    keychain: Keychain;
    private _items: BreachItem[] = [];

    get items(): BreachItem[] {
        return this._items;
    }

    set items(newItems: BreachItem[]) {
        const diff = difference(newItems, this.items);
        this.emit('itemsUpdate', diff);
        this._items = newItems;
    }

    constructor(path: string) {
        super();
        this.keychain = new Keychain();
        this.keychain.load(path, error => {
            if (error) {
                this.emit('loadError', error)
            } else {
                this.emit('loadSuccess');
            }
        });
    }

    async unlock(master: string) {
        try {
            this.keychain.unlock(master);
        } catch (ex) {
            this.emit('unlockError', ex);
            return
        }

        if (!this.keychain.unlocked) {
            this.emit('unlockError', new Error('Invalid master password'));
        } else {
            const items = Object.keys(this.keychain.items)
                .map(key => this.keychain.items[key])
                .filter(item => item.category === '001')

            this.items = items
                .map(item => {
                    item.unlock();
                    const { overview: { title, ainfo, ps, url }, uuid } = item
                    return {
                        uuid,
                        title,
                        username: ainfo,
                        url,
                        passwordStrength: ps,
                        status: BreachItemStatus.Fetching,
                        breaches: null,
                    }
                });

            this.emit('unlockSuccess');

            const fetchers = items.map(item => () => (
                new Promise<HashingResult>(((resolve, reject) => {
                    try {
                        item.unlock();
                        const hash = crypto.createHash('sha1');
                        if (!item.details.fields) {
                            reject(new Error(`${item.uuid} did not contain any fields`));
                            return
                        }
                        const password = item.details.fields.find(field => field.designation === 'password');
                        if (!password) {
                            reject(new Error(`Could not find password for '${item.uuid}'`));
                            return
                        }

                        hash.on('readable', () => {
                            const data = hash.read();
                            if (data) {
                                resolve({
                                    hash: data,
                                    uuid: item.uuid
                                })
                            }
                        })

                        hash.write(password.value)
                        hash.end();
                        item.lock();
                    } catch (ex) {
                        reject(ex);
                    }
                }))
                    .then((result: HashingResult) => {
                        let hash: string;
                        if (result.hash instanceof Buffer) {
                            hash = result.hash.toString('hex')
                        } else {
                            hash = result.hash;
                        }

                        return fetch('https://api.pwnedpasswords.com/range/' + (hash.substring(0, 5)))
                            .then(response => response.text())
                            .then(body => {
                                const match = body.split('\n').find(line => hash.substring(0, 5) + line.substring(0, 35) === hash)

                                let breaches = 0;
                                if (match) {
                                    breaches = parseInt(match.substring(36), 10);
                                }
                                this.setItem({
                                    uuid: result.uuid,
                                    status: BreachItemStatus.Done,
                                    breaches
                                })

                                // put a little cooldown between requests as to not destroy troy hunt's server...
                                return delay(500);
                            })
                    })
                    .catch(() => {
                        this.setItem({
                            uuid: item.uuid,
                            status: BreachItemStatus.Error
                        })
                    })
            ))
            
            for (const fetcher of fetchers) {
                await fetcher()
            }
        }
    }

    private setItem(partialItem: Partial<BreachItem>) {
        // updates existing/adds items
        // does a shallow merge but only when it already exists (duh..)
        const oldItem = this.items.find(item => item.uuid === partialItem.uuid);
        if (oldItem) {
            this.items = this.items.map(curr => {
                if (curr.uuid === partialItem.uuid) {
                    return {
                        ...curr,
                        ...partialItem
                    }
                } else {
                    return curr
                }
            })
        } else {
            // assume it's not partial if adding
            this.items = [...this.items, partialItem as BreachItem];
        }
    }
}