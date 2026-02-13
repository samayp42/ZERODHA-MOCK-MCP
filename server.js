import express from 'express';
import handler from './api/mcp.js';

const app = express();
const port = 3000;

app.use(express.json());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${req.ip}`);
    next();
});

app.get('/health', (req, res) => res.send('OK'));

app.use(async (req, res) => {
    try {
        await handler(req, res);
    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

import os from 'os';

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (non-127.0.0.1) and non-ipv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const server = app.listen(port, '0.0.0.0', () => {
    const localIp = getLocalIp();
    const localUrl = `http://localhost:${port}`;
    const netUrl = `http://${localIp}:${port}`;

    console.log('\n');
    console.log('  ============================================================');
    console.log('  |                 ZERODHA MOCK MCP SERVER                  |');
    console.log('  ============================================================');
    console.log('  |                                                          |');
    console.log(`  |  STATUS:  Online                                         |`);
    console.log(`  |  PORT:    ${port.toString().padEnd(47)}|`);
    console.log('  |                                                          |');
    console.log('  ------------------------------------------------------------');
    console.log('  |  ACCESS LINKS:                                           |');
    console.log('  |                                                          |');
    console.log(`  |  [Local]    ${localUrl.padEnd(45)}|`);
    console.log(`  |  [Network]  ${netUrl.padEnd(45)}|`);
    console.log('  |                                                          |');
    console.log('  ============================================================');
    console.log('\n');
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`\n  [ERROR] Port ${port} is already in use!`);
        console.error(`  Please stop the other server instance first.\n`);
        process.exit(1);
    } else {
        console.error(e);
    }
});
