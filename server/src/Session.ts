import WebSocket from 'ws';
import Vault from './Vault';
import chalk from 'chalk';
import serializeError from 'serialize-error';
import { cipher as forgeCipher, util, random, Bytes } from 'node-forge';
import { inspect } from 'util';

/**
 * Session is responsible for coordinating updates in state etc back to the client
 */
export class Session {
    vault: Vault | null = null;

    constructor(private websocket: WebSocket, public key: Bytes) {
        websocket.on('message', (data: WebSocket.Data) => {
            if (typeof data === 'string') {
                const { message, iv } = JSON.parse(data);
                const decipher = forgeCipher.createDecipher('AES-CBC', this.key);
                decipher.start({ iv });
                decipher.update(util.createBuffer(util.decode64(message), 'raw'));
                decipher.finish();
                const result = decipher.output.toString();
                
                if (!result) {
                    console.log(chalk`{yellow [Session]} decryption failure!\r\n{dim ${data}}`);
                    return;
                }
                
                const { type, payload } = JSON.parse(result.toString());
                console.log(chalk`{yellow [Session]} receive: {cyan ${type}}`, inspect(payload, false, 4, true));
                // TODO validate message objects!
                switch (type) {
                    case 'handshake':
                        this.vault = new Vault(payload.path);
                        this.bindEvents();
                        break;
                    case 'unlock':
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
            if (this.vault) {
                this.vault.destroy();
            }
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
            if (payload instanceof Error) {
                payload = serializeError(payload)
                delete payload.stack
            }
            console.log(chalk`{yellow [Session]} send: {cyan ${type}}`, inspect(payload, false, 4, true));
            try {
                const cipher = forgeCipher.createCipher('AES-CBC', this.key);

                const iv = random.getBytesSync(16);
                cipher.start({ iv });
                const encoded = JSON.stringify({
                    type,
                    payload
                })
                cipher.update(util.createBuffer(encoded, 'raw'));
                cipher.finish();
                const message = util.encode64(cipher.output.getBytes());
                
                this.websocket.send(JSON.stringify({
                    iv,
                    message
                }))
            } catch (ex) {
                console.log(chalk`{red ERR!}`, ex);
            }

        })
    }
}