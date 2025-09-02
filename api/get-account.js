import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        // Ensure the accounts table exists
        await sql`CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            used BOOLEAN NOT NULL
        );`;
    } catch (error) {
        console.error('Error creating table:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to connect to the database.' });
    }

    // Handle GET request to get an unused account
    if (req.method === 'GET') {
        try {
            const { rows: accounts } = await sql`SELECT * FROM accounts WHERE used = false ORDER BY id ASC LIMIT 1;`;
            
            if (accounts.length > 0) {
                const account = accounts[0];
                await sql`UPDATE accounts SET used = true WHERE id = ${account.id};`;
                return res.status(200).json({ status: 'ok', account: { username: account.username, password: account.password } });
            } else {
                return res.status(200).json({ status: 'out_of_stock', message: 'Out of stock.' });
            }
        } catch (error) {
            console.error('Error getting account:', error);
            return res.status(500).json({ status: 'error', message: 'An unexpected error occurred.' });
        }
    } else if (req.method === 'POST') {
        // Handle POST request to add accounts
        const { accounts: accountsText } = req.body;
        const lines = accountsText.split('\n');
        let successCount = 0;

        for (const line of lines) {
            const [username, password] = line.trim().split(':');
            if (username && password) {
                try {
                    await sql`INSERT INTO accounts (username, password, used) VALUES (${username}, ${password}, false);`;
                    successCount++;
                } catch (error) {
                    console.error('Error adding account:', error);
                }
            }
        }
        
        if (successCount > 0) {
            return res.status(200).json({ status: 'ok', successCount });
        } else {
            return res.status(400).json({ status: 'error', message: 'No accounts were added. Please check the format.' });
        }
    }

    return res.status(405).json({ status: 'error', message: 'Method not allowed.' });
}
