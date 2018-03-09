import Server from './Server';
import * as readline from 'readline';
import { fakeKey } from './fakeKey';
import chalk from 'chalk';

process.on('unhandledRejection', err => {
    console.error(chalk`{red ERR!}`, err)
    process.exit(1)
})

if (process.env.NODE_ENV === 'production') {
    const rl = readline.createInterface({
        input: process.stdin,
    });

    rl.prompt();

    rl.on('line', line => {
        rl.close();
        boot(line);
    })
} else {
    console.log(chalk`{yellow WARNING:} Using fake keys because we're in development mode.`)
    boot(fakeKey)
}

function boot(key: string) {
    const server = new Server();
    server.start(key);
}