import { json } from '@sveltejs/kit';

export async function GET() {
    try {
        // Basic health check - you can add more sophisticated checks here
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            version: process.env.npm_package_version || '0.0.2'
        };

        return json(health, {
            status: 200,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });
    } catch (error) {
        return json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        }, {
            status: 503
        });
    }
}