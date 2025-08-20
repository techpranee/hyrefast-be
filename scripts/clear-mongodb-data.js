/**
 * clear-mongodb-data.js
 * Clear incorrect migration data before running the proper migration
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../model/user');
const Job = require('../model/job');
const Application = require('../model/application');
const Response = require('../model/response');
const InterviewTemplate = require('../model/interviewTemplate');

// Configure MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview-assistant';

async function clearMongoData() {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        console.log('\n🧹 Clearing existing migration data...');

        // Clear all collections except keep the default job for now
        const userCount = await User.countDocuments();
        const jobCount = await Job.countDocuments();
        const applicationCount = await Application.countDocuments();
        const responseCount = await Response.countDocuments();
        const templateCount = await InterviewTemplate.countDocuments();

        console.log('Current counts before clearing:');
        console.log(`Users: ${userCount}, Jobs: ${jobCount}, Applications: ${applicationCount}, Responses: ${responseCount}, Templates: ${templateCount}`);

        // Clear all data
        await User.deleteMany({});
        await Job.deleteMany({});
        await Application.deleteMany({});
        await Response.deleteMany({});
        await InterviewTemplate.deleteMany({});

        console.log('✅ All collections cleared');

        // Verify clearing
        const finalCounts = {
            users: await User.countDocuments(),
            jobs: await Job.countDocuments(),
            applications: await Application.countDocuments(),
            responses: await Response.countDocuments(),
            templates: await InterviewTemplate.countDocuments()
        };

        console.log('\nFinal counts after clearing:', finalCounts);

    } catch (error) {
        console.error('❌ Error clearing MongoDB data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

clearMongoData().catch(console.error);
