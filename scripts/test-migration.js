/**
 * test-migration.js
 * Test script to verify migration functionality and data integrity
 */

const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Import BE Models
const Job = require('../model/job');
const User = require('../model/user');
const InterviewTemplate = require('../model/interviewTemplate');
const Application = require('../model/application'); // Interview Session
const Response = require('../model/response'); // Interview Response

class MigrationTester {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview-assistant';
    }

    async connect() {
        try {
            await mongoose.connect(this.mongoUri);
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }

    async testDataCounts() {
        console.log('\n📊 Testing Data Counts...');

        try {
            // Get Supabase counts
            const supabaseCounts = {
                users: await this.getSupabaseCount('users'),
                jobs: await this.getSupabaseCount('jobs'),
                templates: await this.getSupabaseCount('interview_templates'),
                sessions: await this.getSupabaseCount('interview_sessions'),
                responses: await this.getSupabaseCount('interview_responses')
            };

            // Get MongoDB counts
            const mongoCounts = {
                users: await User.countDocuments({ isDeleted: false }),
                jobs: await Job.countDocuments({ isDeleted: false }),
                templates: await InterviewTemplate.countDocuments({ isDeleted: false }),
                sessions: await Application.countDocuments({ isDeleted: false }),
                responses: await Response.countDocuments({ isDeleted: false })
            };

            console.log('\nData Count Comparison:');
            console.log('======================');
            Object.keys(supabaseCounts).forEach(entity => {
                const supaCount = supabaseCounts[entity];
                const mongoCount = mongoCounts[entity];
                const status = supaCount === mongoCount ? '✅' : '⚠️';

                console.log(`${entity.toUpperCase()}: Supabase(${supaCount}) → MongoDB(${mongoCount}) ${status}`);
            });

            return { supabaseCounts, mongoCounts };

        } catch (error) {
            console.error('❌ Error testing data counts:', error);
            throw error;
        }
    }

    async getSupabaseCount(tableName) {
        const { count, error } = await this.supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .eq('is_deleted', false);

        if (error) throw error;
        return count;
    }

    async testSampleDataIntegrity() {
        console.log('\n🔍 Testing Sample Data Integrity...');

        try {
            // Test Users
            const { data: supaUser } = await this.supabase
                .from('users')
                .select('*')
                .eq('is_deleted', false)
                .limit(1)
                .single();

            if (supaUser) {
                const mongoUser = await User.findOne({ email: supaUser.email });
                if (mongoUser) {
                    console.log('✅ User data integrity verified');
                    console.log(`   Sample: ${supaUser.email} → ${mongoUser.email}`);
                } else {
                    console.log('⚠️ User data integrity issue');
                }
            }

            // Test Jobs
            const { data: supaJob } = await this.supabase
                .from('jobs')
                .select('*')
                .eq('is_deleted', false)
                .limit(1)
                .single();

            if (supaJob) {
                const mongoJob = await Job.findOne({ title: supaJob.title });
                if (mongoJob) {
                    console.log('✅ Job data integrity verified');
                    console.log(`   Sample: ${supaJob.title} → ${mongoJob.title}`);
                } else {
                    console.log('⚠️ Job data integrity issue');
                }
            }

            // Test Interview Sessions
            const { data: supaSession } = await this.supabase
                .from('interview_sessions')
                .select('*')
                .eq('is_deleted', false)
                .limit(1)
                .single();

            if (supaSession) {
                const mongoSession = await InterviewSession.findOne({
                    title: supaSession.title
                });
                if (mongoSession) {
                    console.log('✅ Session data integrity verified');
                    console.log(`   Sample: ${supaSession.title} → ${mongoSession.title}`);
                } else {
                    console.log('⚠️ Session data integrity issue');
                }
            }

        } catch (error) {
            console.error('❌ Error testing data integrity:', error);
        }
    }

    async testRelationships() {
        console.log('\n🔗 Testing Data Relationships...');

        try {
            // Test Job-Session relationship
            const sessionWithJob = await Application.findOne({ job: { $exists: true } })
                .populate('job');

            if (sessionWithJob && sessionWithJob.job) {
                console.log('✅ Job-Session relationship verified');
                console.log(`   Session "${sessionWithJob.title}" → Job "${sessionWithJob.job.title}"`);
            } else {
                console.log('⚠️ Job-Session relationship issue');
            }

            // Test Session-Response relationship
            const responseWithSession = await Response.findOne({ sessionId: { $exists: true } });

            if (responseWithSession) {
                const session = await Application.findById(responseWithSession.sessionId);
                if (session) {
                    console.log('✅ Session-Response relationship verified');
                    console.log(`   Response Q${responseWithSession.questionNumber} → Session "${session.title}"`);
                } else {
                    console.log('⚠️ Session-Response relationship issue');
                }
            }

            // Test User-Job relationship
            const jobWithUser = await Job.findOne({ addedBy: { $exists: true } });

            if (jobWithUser) {
                const user = await User.findById(jobWithUser.addedBy);
                if (user) {
                    console.log('✅ User-Job relationship verified');
                    console.log(`   Job "${jobWithUser.title}" → User "${user.email}"`);
                } else {
                    console.log('⚠️ User-Job relationship issue');
                }
            }

        } catch (error) {
            console.error('❌ Error testing relationships:', error);
        }
    }

    async testAPIEndpoints() {
        console.log('\n🌐 Testing API Endpoints...');

        try {
            const axios = require('axios');
            const baseUrl = process.env.APP_URL || 'http://localhost:3000';

            // Test health endpoint
            try {
                const response = await axios.get(`${baseUrl}/health`);
                if (response.status === 200) {
                    console.log('✅ Health endpoint working');
                }
            } catch (error) {
                console.log('⚠️ Health endpoint not responding');
            }

            // Test jobs endpoint (without auth)
            try {
                const response = await axios.get(`${baseUrl}/client/v1/job`);
                console.log(`✅ Jobs API endpoint responding (status: ${response.status})`);
            } catch (error) {
                if (error.response?.status === 401) {
                    console.log('✅ Jobs API endpoint requires authentication (expected)');
                } else {
                    console.log('⚠️ Jobs API endpoint error:', error.message);
                }
            }

        } catch (error) {
            console.error('❌ Error testing API endpoints:', error);
        }
    }

    async testIndexes() {
        console.log('\n📇 Testing Database Indexes...');

        try {
            const collections = [
                { name: 'users', model: User },
                { name: 'jobs', model: Job },
                { name: 'interviewtemplates', model: InterviewTemplate },
                { name: 'applications', model: Application },
                { name: 'responses', model: Response }
            ];

            for (const collection of collections) {
                const indexes = await mongoose.connection.db
                    .collection(collection.name)
                    .getIndexes();

                const indexCount = Object.keys(indexes).length;
                console.log(`✅ ${collection.name}: ${indexCount} indexes`);

                // Log important indexes
                Object.keys(indexes).forEach(indexName => {
                    if (indexName !== '_id_') {
                        console.log(`   - ${indexName}`);
                    }
                });
            }

        } catch (error) {
            console.error('❌ Error testing indexes:', error);
        }
    }

    async runPerformanceTest() {
        console.log('\n⚡ Running Performance Tests...');

        try {
            const startTime = Date.now();

            // Test query performance
            const userQuery = User.find({ isDeleted: false }).limit(100);
            const jobQuery = Job.find({ status: 'active' }).limit(50);
            const sessionQuery = Application.find({ status: 'completed' })
                .populate('job user')
                .limit(25);

            await Promise.all([userQuery, jobQuery, sessionQuery]);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`✅ Performance test completed in ${duration}ms`);

            if (duration < 1000) {
                console.log('🚀 Excellent performance!');
            } else if (duration < 3000) {
                console.log('👍 Good performance');
            } else {
                console.log('⚠️ Consider optimizing queries or adding indexes');
            }

        } catch (error) {
            console.error('❌ Error in performance test:', error);
        }
    }

    async generateReport() {
        console.log('\n📝 Generating Migration Report...');

        try {
            const { supabaseCounts, mongoCounts } = await this.testDataCounts();

            const report = {
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                database: {
                    supabase: process.env.SUPABASE_URL,
                    mongodb: this.mongoUri
                },
                migration: {
                    status: 'completed',
                    data_counts: {
                        supabase: supabaseCounts,
                        mongodb: mongoCounts
                    },
                    success_rate: this.calculateSuccessRate(supabaseCounts, mongoCounts)
                }
            };

            const fs = require('fs');
            const reportPath = `./migration-report-${Date.now()}.json`;
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

            console.log(`📄 Report saved to: ${reportPath}`);

            return report;

        } catch (error) {
            console.error('❌ Error generating report:', error);
        }
    }

    calculateSuccessRate(supabaseCounts, mongoCounts) {
        const entities = Object.keys(supabaseCounts);
        let successCount = 0;

        entities.forEach(entity => {
            if (supabaseCounts[entity] === mongoCounts[entity]) {
                successCount++;
            }
        });

        return Math.round((successCount / entities.length) * 100);
    }

    async run() {
        try {
            console.log('🧪 Starting Migration Test Suite...');
            await this.connect();

            await this.testDataCounts();
            await this.testSampleDataIntegrity();
            await this.testRelationships();
            await this.testIndexes();
            await this.runPerformanceTest();
            await this.testAPIEndpoints();
            await this.generateReport();

            console.log('\n🎉 Migration test suite completed!');

        } catch (error) {
            console.error('💥 Test suite failed:', error);
            process.exit(1);
        } finally {
            await this.disconnect();
        }
    }
}

// CLI execution
if (require.main === module) {
    const tester = new MigrationTester();
    tester.run().catch(console.error);
}

module.exports = MigrationTester;
