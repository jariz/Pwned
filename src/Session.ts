import WebSocket from 'ws';
import Vault from './Vault';
import chalk from 'chalk';
import * as util from 'util';
import { Key } from './types';

/**
 * Session is responsible for coordinating updates in state etc back to the client
 */
export class Session {
    vault: Vault | null = null;

    constructor(private websocket: WebSocket, public serverPrivateKey: Key, private clientPublicKey: Key) {
        websocket.on('message', (data: WebSocket.Data) => {
            if (typeof data === 'string') {
                const { type, payload } = JSON.parse(serverPrivateKey.decrypt(data));
                console.log(chalk`{yellow [Session]} receive: {cyan ${type}}`, util.inspect(payload, false, 4, true));
                // TODO validate message objects!
                switch (type) {
                    case 'handshake':
                        this.vault = new Vault(payload.path);
                        this.bindEvents();
                        break;
                    case 'unlock':
                        // todo: don't send password down the line, use keychain instead for temp storage
                        if (this.vault) {
                            this.vault.unlock(payload.password);
                        }
                        break;
                    default:
                        console.log(chalk`{yellow [Session]} received invalid message type from socket: {cyan ${type}}`);
                        break;
                }
            } else {
                console.log(chalk`{yellow [Session]} received invalid data from socket`, data);
            }
        })

        websocket.on('close', () => {
            // delete vault from memory
            delete this.vault;
        })
    }

    bindEvents() {
        this.bindEvent('itemsUpdate');
        this.bindEvent('loadError');
        this.bindEvent('loadSuccess');
        this.bindEvent('unlockError');
        this.bindEvent('unlockSuccess');
    }

    private bindEvent(type: string) {
        if (!this.vault) {
            return
        }

        // binds an event from vault and 'forwards' it to socket
        this.vault.on(type, (payload: any) => {
            console.log(chalk`{yellow [Session]} send: {cyan ${type}}`, util.inspect(payload, false, 4, true));
            this.websocket.send(this.clientPublicKey.encrypt(JSON.stringify({
                type,
                payload
            })))
        })
    }
}