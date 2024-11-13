import { join } from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import mysql from 'mysql2/promise';
import serveStatic from 'serve-static';

import shopify from './shopify.js';
import webhooks from './webhooks.js';

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const STATIC_PATH =
	process.env.NODE_ENV === 'production'
		? `${process.cwd()}/frontend/dist`
		: `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
	shopify.config.auth.callbackPath,
	shopify.auth.callback(),
	shopify.redirectToShopifyOrAppRoot()
);
app.post(
	shopify.config.webhooks.path,
	// @ts-ignore
	shopify.processWebhooks({ webhookHandlers: webhooks })
);

// All endpoints after this point will require an active session
//app.use('/api/*', shopify.validateAuthenticatedSession());

app.use(express.json());

const pool = mysql.createPool({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'boa_ideas_db',
});

app.get('/api/get', async (req, res) => {

	const customerId = req.query.customerId;

	if (!customerId) {
		return res.status(400).json({ error: "Customer ID is required" });
	}

	try {
		const query = `SELECT * FROM saved_carts WHERE customer_gid = ?`;
		const values = [customerId];

		const result = await pool.query(query, values);

		if(result[0].length ===0){
			res.json({ message: 'Cart not found', timestamp: new Date().toISOString(), cart: result[0] });
		}
		res.json({ message: 'Fetch cart successful', timestamp: new Date().toISOString(), cart: result[0][0].cart_data });
	} catch (error) {
		console.log(error);
	}
});

app.post('/api/save', async (req, res) => {

	try {
		const { customerId, cart } = req.body;

		if (!customerId || !Array.isArray(cart)) {
			return res.status(400).json({ error: 'Invalid request data' });
		}

		const cartData = JSON.stringify(cart);

		const query = `
            INSERT INTO saved_carts (customer_gid, cart_data)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                cart_data = VALUES(cart_data);
        `;

		await pool.execute(query, [customerId, cartData]);
		res.status(200).json({ message: 'Cart saved successfully' });
	} catch (err) {
		console.error('Error handling request:', err);
		res.status(500).json({ err: 'Internal server error' });
	}

});



app.use(serveStatic(STATIC_PATH, { index: false }));

app.use('/*', shopify.ensureInstalledOnShop(), async (_req, res) => {
	return res.set('Content-Type', 'text/html').send(readFileSync(join(STATIC_PATH, 'index.html')));
});

app.listen(PORT);
