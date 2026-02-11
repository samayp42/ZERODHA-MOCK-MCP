
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
function executeTool(toolName, params, sessionId) {
    console.log(`[EXECUTE] Tool: ${toolName}, Params:`, params, `Session: ${sessionId}`);
    const { id, account } = getSession(sessionId);

    switch (toolName) {
        case 'init':
            // Reset account for this session if requested explicitly
            console.log(`[INIT] Resetting account for session: ${id}`);
            sessions.set(id, createAccount());
            return {
                sessionId: id,
                message: 'New account created! Balance reset to 100,000',
                balance: 100000
            };

        case 'get-portfolio':
            const totalValue = account.balance + account.holdings.reduce((sum, h) => sum + (h.qty * h.price), 0);
            return {
                balance: account.balance,
                holdings: account.holdings,
                total_value: totalValue
            };

        case 'get-holdings':
            return { holdings: account.holdings };

        case 'get-orders':
            return { orders: account.orders };

        case 'place-order':
            const order = {
                id: generateId(),
                symbol: params.symbol,
                qty: params.qty,
                type: params.type, // BUY/SELL
                price: params.price || 0,
                status: 'COMPLETE',
                time: new Date().toISOString()
            };

            account.orders.push(order);

            if (params.type === 'BUY') {
                const holding = account.holdings.find(h => h.symbol === params.symbol);
                if (holding) {
                    holding.qty += params.qty;
                } else {
                    account.holdings.push({
                        symbol: params.symbol,
                        qty: params.qty,
                        price: params.price
                    });
                }
                account.balance -= params.qty * params.price;
            }

            return { success: true, order };

        case 'get-quote':
            const mockPrices = {
                'TCS': 3456, 'RELIANCE': 2845, 'INFY': 1523, 'HDFC': 1678, 'WIPRO': 456
            };
            return {
                symbol: params.symbol,
                price: mockPrices[params.symbol] || 1000
            };

        default:
            console.error(`[ERROR] Unknown tool: ${toolName}`);
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
                                name: 'get-portfolio',
                                description: 'Get current balance, holdings, and total portfolio value.',
                                inputSchema: { type: 'object', properties: {} }
                            },
                            {
                                name: 'get-holdings',
                                description: 'Get list of stocks currently owned.',
                                inputSchema: { type: 'object', properties: {} }
                            },
                            {
                                name: 'get-orders',
                                description: 'Get history of all orders placed.',
                                inputSchema: { type: 'object', properties: {} }
                            },
                            {
                                name: 'place-order',
                                description: 'Place a buy or sell order for a stock.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        symbol: { type: 'string', description: 'Stock symbol (e.g. TCS)' },
                                        qty: { type: 'number', description: 'Quantity to buy/sell' },
                                        type: { type: 'string', enum: ['BUY', 'SELL'], description: 'Order type' },
                                        price: { type: 'number', description: 'Limit price (optional)' }
                                    },
                                    required: ['symbol', 'qty', 'type']
                                }
                            },
                            {
                                name: 'get-quote',
                                description: 'Get simulated live price for a stock.',
                                inputSchema: {
                                    type: 'object',
                                    properties: { symbol: { type: 'string', description: 'Stock symbol' } },
                                    required: ['symbol']
                                }
                            }
                        ]
                    }
                });
            }

            // 5. LIST RESOURCES (Return empty list to satisfy client)
            if (method === 'resources/list') {
                // console.log('[MCP] Resources list requested');
                return res.json({
                    jsonrpc: '2.0',
                    id,
                    result: { resources: [] }
                });
            }

            // 6. LIST PROMPTS (Return empty list to satisfy client)
            if (method === 'prompts/list') {
                // console.log('[MCP] Prompts list requested');
                return res.json({
                    jsonrpc: '2.0',
                    id,
                    result: { prompts: [] }
                });
            }

            // 7. CALL TOOL
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
