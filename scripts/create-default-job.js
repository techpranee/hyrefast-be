/**
 * create-default-job.js
 * Creates a default job for migration purposes
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('../model/job');

// Configure MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview-assistant';

async function createDefaultJob() {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Check if default job already exists
        const existingJob = await Job.findOne({ title: 'Migration Default Job' });

        if (existingJob) {
            console.log('Default job already exists:', existingJob._id);
            console.log('Job ID for migration:', existingJob._id.toString());
            return existingJob._id;
        }

        // Create default job
        const defaultJob = new Job({
            title: 'Migration Default Job',
            description: 'Default job created for migration from Supabase',
            requirements: ['Experience migrating from Supabase to MongoDB'],
            last_date: '2024-12-31',
            salary: 'Not specified',
            employmentType: 'full-time',
            location: 'Remote',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await defaultJob.save();
        console.log('✅ Default job created:', defaultJob._id);
        console.log('Job ID for migration:', defaultJob._id.toString());

        return defaultJob._id;

    } catch (error) {
        console.error('❌ Error creating default job:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// CLI execution
if (require.main === module) {
    createDefaultJob().catch(console.error);
}

module.exports = createDefaultJob;
