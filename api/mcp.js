
// In-memory storage (resets on cold starts, perfect for testing)
const sessions = new Map();

// Generate random user ID
function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

// Create fresh mock account
function createAccount() {
    return {
        balance: 100000,
        holdings: [
            { symbol: 'TCS', qty: 10, price: 3400 },
            { symbol: 'RELIANCE', qty: 5, price: 2800 },
            { symbol: 'INFY', qty: 15, price: 1500 }
        ],
        orders: []
    };
}

// Helper: Ensure session exists
function getSession(id) {
    if (!id) id = 'demo-session'; // Default session for simple usage
    if (!sessions.has(id)) {
        console.log(`[SESSION] Creating new session: ${id}`);
        sessions.set(id, createAccount());
    }
    return { id, account: sessions.get(id) };
}

// Main logic
// Market State (Shared across sessions for consistency)
const marketState = {
    stocks: {
        'TCS': { price: 3450.00, trend: 'UP' },
        'RELIANCE': { price: 2850.00, trend: 'FLAT' },
        'INFY': { price: 1520.00, trend: 'DOWN' },
        'HDFC': { price: 1680.00, trend: 'UP' },
        'WIPRO': { price: 460.00, trend: 'DOWN' },
        'TATAMOTORS': { price: 980.00, trend: 'UP' }
    },
    lastUpdate: Date.now(),
    news: [
        { headline: "TCS bags $1B deal from UK insurer", sentiment: "POSITIVE", symbol: "TCS" },
        { headline: "Reliance expected to post weak quarterly results", sentiment: "NEGATIVE", symbol: "RELIANCE" },
        { headline: "Tech sector rally continues as Nasdaq surges", sentiment: "POSITIVE", symbol: "INFY" },
        { headline: "Auto sales drop 5% in March", sentiment: "NEGATIVE", symbol: "TATAMOTORS" }
    ]
};

// Simulate market movement
function updateMarket() {
    const now = Date.now();
    if (now - marketState.lastUpdate > 5000) { // Update every 5 seconds
        for (const symbol in marketState.stocks) {
            const move = (Math.random() - 0.5) * 10; // Random move +/- 5
            marketState.stocks[symbol].price = parseFloat((marketState.stocks[symbol].price + move).toFixed(2));
            marketState.stocks[symbol].trend = move > 0 ? 'UP' : 'DOWN';
        }
        marketState.lastUpdate = now;
        console.log('[MARKET] Prices updated');
    }
}

// Main logic
function executeTool(toolName, params, sessionId) {
    updateMarket(); // Ensure prices are fresh
    console.log(`[EXECUTE] Tool: ${toolName}, Params:`, params, `Session: ${sessionId}`);
    const { id, account } = getSession(sessionId);

    switch (toolName) {
        case 'init':
            console.log(`[INIT] Resetting account for session: ${id}`);
            sessions.set(id, createAccount());
            return {
                message: 'Account reset successful. Market is open.',
                balance: 100000,
                market_status: 'OPEN'
            };

        case 'get-account':
            return {
                id: id,
                balance: account.balance,
                currency: 'INR',
                status: 'ACTIVE'
            };

        case 'get-holdings':
            // Calculate current value dynamically
            const holdingsWithVal = account.holdings.map(h => {
                const currentPrice = marketState.stocks[h.symbol]?.price || h.price;
                return {
                    ...h,
                    current_price: currentPrice,
                    pnl: parseFloat(((currentPrice - h.price) * h.qty).toFixed(2))
                };
            });
            return { holdings: holdingsWithVal };

        case 'get-orders':
            return { orders: account.orders };

        case 'get-history':
            const histSymbol = params.symbol.toUpperCase();
            if (!marketState.stocks[histSymbol]) return { error: 'Symbol not found' };

            const days = params.days || 30;
            const history = [];
            let currentClose = marketState.stocks[histSymbol].price;

            // Generate data working backwards
            for (let i = 0; i < days; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);

                const volatility = currentClose * 0.02; // 2% daily volatility
                const change = (Math.random() - 0.5) * volatility;
                const prevClose = currentClose - change;

                const open = prevClose;
                const close = currentClose;
                const high = Math.max(open, close) + (Math.random() * volatility * 0.5);
                const low = Math.min(open, close) - (Math.random() * volatility * 0.5);

                history.push({
                    date: date.toISOString().split('T')[0],
                    open: parseFloat(open.toFixed(2)),
                    high: parseFloat(high.toFixed(2)),
                    low: parseFloat(low.toFixed(2)),
                    close: parseFloat(close.toFixed(2)),
                    volume: Math.floor(Math.random() * 1000000) + 50000
                });

                currentClose = prevClose;
            }
            return { symbol: histSymbol, history: history.reverse() };

        case 'place-order':
            const symbol = params.symbol.toUpperCase();
            const qty = parseInt(params.qty);
            const side = params.side || params.type; // Support both for compatibility
            const price = marketState.stocks[symbol]?.price || params.price || 0;

            if (!marketState.stocks[symbol]) {
                return { status: 'REJECTED', reason: 'Symbol not found' };
            }

            const orderValue = qty * price;

            if (side === 'BUY') {
                if (account.balance < orderValue) {
                    return { status: 'REJECTED', reason: 'Insufficient funds' };
                }
                account.balance -= orderValue;

                const existing = account.holdings.find(h => h.symbol === symbol);
                if (existing) {
                    // Average price calculation
                    const totalCost = (existing.qty * existing.price) + orderValue;
                    existing.qty += qty;
                    existing.price = parseFloat((totalCost / existing.qty).toFixed(2));
                } else {
                    account.holdings.push({ symbol, qty, price });
                }
            } else if (side === 'SELL') {
                const existing = account.holdings.find(h => h.symbol === symbol);
                if (!existing || existing.qty < qty) {
                    return { status: 'REJECTED', reason: 'Insufficient holdings' };
                }
                account.balance += orderValue;
                existing.qty -= qty;
                if (existing.qty === 0) {
                    account.holdings = account.holdings.filter(h => h.symbol !== symbol);
                }
            }

            const orderId = generateId();
            account.orders.push({ id: orderId, symbol, qty, side, price, time: new Date().toISOString() });

            return {
                status: 'COMPLETE',
                order_id: orderId,
                executed_price: price,
                message: `${side} order for ${qty} ${symbol} executed at ${price}`
            };

        case 'get-quote':
            const stock = marketState.stocks[params.symbol.toUpperCase()];
            if (!stock) return { error: 'Symbol not found' };
            return {
                symbol: params.symbol.toUpperCase(),
                price: stock.price,
                trend: stock.trend,
                depth: {
                    buy: [{ price: (stock.price * 0.999).toFixed(2), qty: 100 }],
                    sell: [{ price: (stock.price * 1.001).toFixed(2), qty: 150 }]
                }
            };

        case 'get-market-news':
            return {
                headlines: marketState.news,
                sentiment: "MIXED"
            };

        case 'get-market-status':
            // Get top gainer/loser
            const sorted = Object.entries(marketState.stocks).sort(([, a], [, b]) => b.price - a.price);
            return {
                status: 'OPEN',
                index_level: 18500 + Math.random() * 100,
                top_gainer: sorted[0][0],
                top_loser: sorted[sorted.length - 1][0],
                active_symbols: Object.keys(marketState.stocks)
            };

        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}

// Main handler
export default function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-id');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const body = req.body || {};
        // Log less verbosely to avoid cluttering if spamming happen
        // console.log(`[REQUEST] ${req.method} Body:`, JSON.stringify(body).substring(0, 200));

        // --- STANDARD MCP PROTOCOL (JSON-RPC 2.0) ---
        if (body.jsonrpc === '2.0') {
            const { method, params, id } = body;

            // 1. INITIALIZE
            if (method === 'initialize') {
                console.log('[MCP] Initialize requested');
                return res.json({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {},
                            resources: {}, // Advertise resource capability (empty)
                            prompts: {}    // Advertise prompts capability (empty)
                        },
                        serverInfo: { name: 'zerodha-mock', version: '1.0.0' }
                    }
                });
            }

            // 2. INITIALIZED NOTIFICATION
            if (method === 'notifications/initialized') {
                console.log('[MCP] Initialized notification received');
                return res.json({ jsonrpc: '2.0', id, result: {} });
            }

            // 3. PING
            if (method === 'ping') {
                // console.log('[MCP] Ping received');
                return res.json({ jsonrpc: '2.0', id, result: {} });
            }

            // 4. LIST TOOLS
            if (method === 'tools/list') {
                console.log('[MCP] Tools list requested');
                return res.json({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        tools: [
                            {
                                name: 'init',
                                description: 'Reset session and create new account. Use this to start fresh.',
                                inputSchema: { type: 'object', properties: {} }
                            },
                            {
                                name: 'get-account',
                                description: 'Get current available balance and funds.',
                                inputSchema: { type: 'object', properties: {} }
                            },
                            {
                                name: 'get-holdings',
                                description: 'Get list of stocks currently owned in portfolio.',
                                inputSchema: { type: 'object', properties: {} }
                            },
                            {
                                name: 'get-orders',
                                description: 'Get history of all orders placed.',
                                inputSchema: { type: 'object', properties: {} }
                            },
                            {
                                name: 'get-history',
                                description: 'Get historical OHLC price data for analysis.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        symbol: { type: 'string', description: 'Stock symbol' },
                                        days: { type: 'number', description: 'Number of days (default 30)' }
                                    },
                                    required: ['symbol']
                                }
                            },
                            {
                                name: 'place-order',
                                description: 'Place a buy or sell order for a stock.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        symbol: { type: 'string', description: 'Stock symbol (e.g. TCS, RELIANCE)' },
                                        qty: { type: 'number', description: 'Quantity to buy/sell' },
                                        side: { type: 'string', enum: ['BUY', 'SELL'], description: 'Order side' },
                                        price: { type: 'number', description: 'Limit price (0 for market)' }
                                    },
                                    required: ['symbol', 'qty', 'side']
                                }
                            },
                            {
                                name: 'get-quote',
                                description: 'Get live price and depth for a stock.',
                                inputSchema: {
                                    type: 'object',
                                    properties: { symbol: { type: 'string', description: 'Stock symbol' } },
                                    required: ['symbol']
                                }
                            },
                            {
                                name: 'get-market-news',
                                description: 'Get latest financial news headlines and market sentiment.',
                                inputSchema: { type: 'object', properties: {} }
                            },
                            {
                                name: 'get-market-status',
                                description: 'Get overall market status, top gainers/losers, and index levels.',
                                inputSchema: { type: 'object', properties: {} }
                            }
                        ]
                    }
                });
            }

            // 5. LIST RESOURCES
            if (method === 'resources/list') {
                return res.json({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        resources: [
                            {
                                uri: 'market://alerts',
                                name: 'Market Alerts',
                                description: 'Real-time market alerts and significant events summary',
                                mimeType: 'text/plain'
                            }
                        ]
                    }
                });
            }

            // 6. READ RESOURCE
            if (method === 'resources/read') {
                if (params.uri === 'market://alerts') {
                    const alerts = marketState.news.map(n => `[${n.sentiment}] ${n.symbol}: ${n.headline}`).join('\n');
                    return res.json({
                        jsonrpc: '2.0',
                        id,
                        result: {
                            contents: [{
                                uri: 'market://alerts',
                                mimeType: 'text/plain',
                                text: `=== MARKET ALERTS ===\n${alerts}\n=====================`
                            }]
                        }
                    });
                }
                return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Resource not found' } });
            }

            // 7. LIST PROMPTS (Return empty list to satisfy client)
            if (method === 'prompts/list') {
                // console.log('[MCP] Prompts list requested');
                return res.json({
                    jsonrpc: '2.0',
                    id,
                    result: { prompts: [] }
                });
            }

            // 8. CALL TOOL
            if (method === 'tools/call') {
                try {
                    console.log(`[MCP] calling tool: ${params.name}`);
                    const result = executeTool(params.name, params.arguments || {}, 'demo-session');

                    return res.json({
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                            isError: false
                        }
                    });
                } catch (err) {
                    console.error('[MCP] Tool execution error:', err);
                    return res.json({
                        jsonrpc: '2.0',
                        id,
                        error: { code: -32603, message: err.message }
                    });
                }
            }

            console.warn('[MCP] Method not found:', method);
            return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
        }

        // --- SIMPLE CUSTOM PROTOCOL (Original) ---
        const sessionId = req.headers['x-session-id'] || body.sessionId;
        const { tool, params: simpleParams } = body;

        if (!tool) {
            // console.warn('[Custom] Missing tool parameter');
            return res.status(400).json({ error: 'Missing tool parameter' });
        }

        console.log(`[Custom] calling tool: ${tool}`);
        const result = executeTool(tool, simpleParams || {}, sessionId);
        res.json(result);

    } catch (error) {
        console.error('[Handler] Unexpected error:', error);
        res.status(500).json({ error: error.message });
    }
}
