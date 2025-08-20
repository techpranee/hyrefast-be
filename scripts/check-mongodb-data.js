/**
 * check-mongodb-data.js
 * Check what data is currently in MongoDB after migration
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

async function checkMongoData() {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Check each collection
        const userCount = await User.countDocuments();
        const jobCount = await Job.countDocuments();
        const applicationCount = await Application.countDocuments();
        const responseCount = await Response.countDocuments();
        const templateCount = await InterviewTemplate.countDocuments();

        console.log('\n📊 Current MongoDB Data:');
        console.log('========================');
        console.log(`Users: ${userCount}`);
        console.log(`Jobs: ${jobCount}`);
        console.log(`Applications: ${applicationCount}`);
        console.log(`Responses: ${responseCount}`);
        console.log(`Templates: ${templateCount}`);

        // Check user types
        const applicants = await User.countDocuments({ userType: 1 });
        const recruiters = await User.countDocuments({ userType: 2 });
        console.log('\n👥 User Types:');
        console.log(`Applicants (userType: 1): ${applicants}`);
        console.log(`Recruiters (userType: 2): ${recruiters}`);

        // Sample data
        console.log('\n📋 Sample Data:');

        const sampleUser = await User.findOne();
        if (sampleUser) {
            console.log('\nSample User:', {
                _id: sampleUser._id,
                name: sampleUser.name,
                email: sampleUser.email,
                userType: sampleUser.userType
            });
        }

        const sampleJob = await Job.findOne();
        if (sampleJob) {
            console.log('\nSample Job:', {
                _id: sampleJob._id,
                title: sampleJob.title,
                description: sampleJob.description
            });
        }

        const sampleApplication = await Application.findOne();
        if (sampleApplication) {
            console.log('\nSample Application:', {
                _id: sampleApplication._id,
                user: sampleApplication.user,
                job: sampleApplication.job,
                title: sampleApplication.title
            });
        }

    } catch (error) {
        console.error('❌ Error checking MongoDB data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkMongoData().catch(console.error);
