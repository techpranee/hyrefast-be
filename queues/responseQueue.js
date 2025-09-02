const Queue = require('bull');

// Enhanced Redis connection config with proper timeouts
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    
    // INCREASED CONNECTION TIMEOUTS
    connectTimeout: 30000,        // 30 seconds (default is 10s)
    commandTimeout: 20000,        // 20 seconds for commands
    lazyConnect: true,            // Connect only when needed
    maxRetriesPerRequest: 3,      // Retry failed requests
    retryDelayOnFailover: 100,    // Delay between retries
    
    // CONNECTION POOL SETTINGS
    family: 4,                    // Use IPv4
    keepAlive: true,              // Keep connections alive
    maxRetriesPerRequest: 5,      // More retries
    
    // RECONNECTION SETTINGS
    enableOfflineQueue: false,    // Don't queue commands when offline
    reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
    }
};

// Create the response processing queue with enhanced settings
const responseQueue = new Queue('response processing', {
    redis: redisConfig,
    
    // ENHANCED QUEUE SETTINGS
    settings: {
        stalledInterval: 5 * 60 * 1000,  // Check for stalled jobs every 5 minutes
        maxStalledCount: 3,               // Max times a job can be stalled
        lockDuration: 10 * 60 * 1000,     // Job lock duration: 10 minutes
        lockRenewTime: 5 * 60 * 1000,     // Renew lock every 5 minutes
        delayedDebounce: 1000             // Delay between delayed job checks
    },
    
    defaultJobOptions: {
        removeOnComplete: 20,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        // INCREASED JOB TIMEOUT
        timeout: 15 * 60 * 1000,  // 15 minutes (was likely too short before)
        
        // JOB PROGRESS SETTINGS
        jobId: undefined,
        delay: 0,
        priority: 0
    }
});
