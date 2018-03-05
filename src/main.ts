import Server from './Server';
import { pki } from 'node-forge'
import * as readline from 'readline';
import { Key } from './types';
import { fakeClientPublicKey, fakeServerPrivateKey } from './fakeKeys';
import chalk from 'chalk';

// declare var __DEV__: boolean;

if (process.env.NODE_ENV === 'production') {
    const rl = readline.createInterface({
        input: process.stdin,
    });
    
    rl.prompt();
    
    let pem = '';
    rl.on('line', line => {
        pem += (line + '\r\n');
        if (line === '-----END PUBLIC KEY-----') {
            rl.close();
            try {
                generateKeysAndBoot(pki.publicKeyFromPem(pem));
            } catch (ex) {
                console.error(ex);
                process.exit(1)
                return
            }
        }
    })
} else {
    console.log(chalk`{yellow WARNING:} Using fake keys because we're in development mode.`)
    const server = new Server();
    server.start(pki.privateKeyFromPem(fakeServerPrivateKey), pki.publicKeyFromPem(fakeClientPublicKey));
}

function generateKeysAndBoot(clientPublicKey: Key) {
    pki.rsa.generateKeyPair({ bits: 2048, workers: 2 }, (err, pair) => {
        if (err) {
            console.error(err);
            process.exit(1);
            return
        }
        console.log(pki.publicKeyToPem(pair.publicKey));
        const server = new Server();
        server.start(pair.privateKey, clientPublicKey);
    })
}