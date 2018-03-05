import dotenv from 'dotenv';
import WebSocket from 'ws';
import { Session } from './Session';
import chalk from 'chalk';
import { IncomingMessage } from 'http';

dotenv.config();

// declare var __DEV__: boolean;

export class Server {
    port: number = process.env.PORT ? parseInt(process.env.PORT!, 10) : 5151;
    host = '127.0.0.1'
    sessions: Session[] = [];

    public start() {
        const { host, port } = this;
        const wss = new WebSocket.Server({
            host,
            port
        });

        console.log(chalk`Server listening on {cyan ${host}}:{cyan ${port.toString()}}!`);

        wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
            console.log(chalk`Accepted new connection from {cyan ${request.connection.remoteAddress!}}`)
            this.sessions.push(new Session(ws));
        });
    }
}

export default Server;