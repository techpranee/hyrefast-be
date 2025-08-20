/**
 * migrate-supabase-to-mongodb.js
 * Migration script to move data from Supabase to MongoDB using BE models
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

// Configure Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configure MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview-assistant';

class SupabaseToMongoMigration {
    constructor() {
        this.stats = {
            users: { total: 0, migrated: 0, errors: 0 },
            jobs: { total: 0, migrated: 0, errors: 0 },
            templates: { total: 0, migrated: 0, errors: 0 },
            sessions: { total: 0, migrated: 0, errors: 0 },
            responses: { total: 0, migrated: 0, errors: 0 }
        };
        this.userMapping = new Map(); // Map Supabase user IDs to MongoDB _ids
        this.jobMapping = new Map();
        this.templateMapping = new Map();
        this.sessionMapping = new Map();
    }

    async connect() {
        try {
            await mongoose.connect(mongoUri);
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

    async migrateUsers() {
        console.log('\n📄 Migrating Users...');

        try {
            const { data: supabaseUsers, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) throw error;

            this.stats.users.total = supabaseUsers.length;
            console.log(`Found ${supabaseUsers.length} users in Supabase`);

            for (const supaUser of supabaseUsers) {
                try {
                    // Check if user already exists
                    const existingUser = await User.findOne({ email: supaUser.email });

                    let mongoUser;
                    if (existingUser) {
                        console.log(`User ${supaUser.email} already exists, updating...`);

                        // Update existing user with interview-related fields
                        mongoUser = await User.findByIdAndUpdate(
                            existingUser._id,
                            {
                                profileData: supaUser.profile_data,
                                lastLoginAt: supaUser.last_login_at ? new Date(supaUser.last_login_at) : undefined,
                                isActive: supaUser.is_active !== false,
                                isVerified: supaUser.is_verified || false,
                                verifiedAt: supaUser.verified_at ? new Date(supaUser.verified_at) : undefined,
                                updatedAt: new Date(supaUser.updated_at || Date.now())
                            },
                            { new: true }
                        );
                    } else {
                        // Create new user with verification data
                        user = new User({
                            name: dataToCreate.name,
                            email: dataToCreate.email,
                            mobileNo: dataToCreate.mobileNo,
                            profileData: dataToCreate.profileData,
                            userType: this.mapUserType(supaUser.user_type || supaUser.role),
                            isActive: supaUser.is_active !== false,
                            isVerified: supaUser.is_verified || false,
                            verifiedAt: supaUser.verified_at ? new Date(supaUser.verified_at) : undefined,
                            lastLoginAt: supaUser.last_login_at ? new Date(supaUser.last_login_at) : undefined,
                            createdAt: new Date(supaUser.created_at || Date.now()),
                            updatedAt: new Date(supaUser.updated_at || Date.now()),
                            password: 'migrated_user' // Will be reset by users
                        });

                        await user.save();
                    }

                    // Store mapping for future reference
                    this.userMapping.set(supaUser.id, user._id.toString());
                    this.stats.users.migrated++;

                    if (this.stats.users.migrated % 50 === 0) {
                        console.log(`Migrated ${this.stats.users.migrated}/${this.stats.users.total} users`);
                    }

                } catch (userError) {
                    console.error(`Error migrating user ${supaUser.email}:`, userError.message);
                    this.stats.users.errors++;
                }
            }

            console.log(`✅ Users migration completed: ${this.stats.users.migrated} migrated, ${this.stats.users.errors} errors`);

        } catch (error) {
            console.error('❌ Error in users migration:', error);
            throw error;
        }
    }

    async migrateJobs() {
        console.log('\n💼 Migrating Jobs...');

        try {
            const { data: supabaseJobs, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('is_deleted', false);

            if (error) throw error;

            this.stats.jobs.total = supabaseJobs.length;
            console.log(`Found ${supabaseJobs.length} jobs in Supabase`);

            for (const supaJob of supabaseJobs) {
                try {
                    const mongoUserId = this.userMapping.get(supaJob.recruiter_id || supaJob.added_by);

                    const mongoJob = new Job({
                        title: supaJob.title,
                        description: supaJob.description,
                        requirements: supaJob.requirements || [],
                        location: supaJob.location,
                        jobType: supaJob.job_type || 'full-time',
                        experienceLevel: supaJob.experience_level || 'mid-level',
                        salary: supaJob.salary ? {
                            min: supaJob.salary.min,
                            max: supaJob.salary.max,
                            currency: supaJob.salary.currency || 'USD'
                        } : undefined,
                        status: supaJob.status || 'active',

                        // Interview Assistant specific fields
                        interviewTemplateId: null, // Will be updated later if templates exist
                        interviewConfig: supaJob.interview_config || {},
                        publicLinkSettings: supaJob.public_link_settings || {},
                        preRequisites: supaJob.pre_requisites || [],

                        addedBy: mongoUserId || supaJob.added_by,
                        updatedBy: mongoUserId || supaJob.updated_by,
                        createdAt: new Date(supaJob.created_at || Date.now()),
                        updatedAt: new Date(supaJob.updated_at || Date.now())
                    });

                    await mongoJob.save();
                    this.jobMapping.set(supaJob.id, mongoJob._id.toString());
                    this.stats.jobs.migrated++;

                    if (this.stats.jobs.migrated % 25 === 0) {
                        console.log(`Migrated ${this.stats.jobs.migrated}/${this.stats.jobs.total} jobs`);
                    }

                } catch (jobError) {
                    console.error(`Error migrating job ${supaJob.title}:`, jobError.message);
                    this.stats.jobs.errors++;
                }
            }

            console.log(`✅ Jobs migration completed: ${this.stats.jobs.migrated} migrated, ${this.stats.jobs.errors} errors`);

        } catch (error) {
            console.error('❌ Error in jobs migration:', error);
            throw error;
        }
    }

    async migrateInterviewTemplates() {
        console.log('\n📋 Migrating Interview Templates...');

        try {
            const { data: templates, error } = await supabase
                .from('interview_templates')
                .select('*')
                .eq('is_deleted', false);

            if (error) throw error;

            this.stats.templates.total = templates.length;
            console.log(`Found ${templates.length} interview templates in Supabase`);

            for (const template of templates) {
                try {
                    const mongoUserId = this.userMapping.get(template.created_by || template.added_by);

                    const mongoTemplate = new InterviewTemplate({
                        title: template.title,
                        description: template.description,
                        jobRole: template.job_role || template.role,
                        questions: template.questions || [],
                        isPublic: template.is_public || false,

                        addedBy: mongoUserId || template.created_by,
                        updatedBy: mongoUserId || template.updated_by,
                        createdAt: new Date(template.created_at || Date.now()),
                        updatedAt: new Date(template.updated_at || Date.now())
                    });

                    await mongoTemplate.save();
                    this.templateMapping.set(template.id, mongoTemplate._id.toString());
                    this.stats.templates.migrated++;

                } catch (templateError) {
                    console.error(`Error migrating template ${template.title}:`, templateError.message);
                    this.stats.templates.errors++;
                }
            }

            console.log(`✅ Templates migration completed: ${this.stats.templates.migrated} migrated, ${this.stats.templates.errors} errors`);

        } catch (error) {
            console.error('❌ Error in templates migration:', error);
            throw error;
        }
    }

    async migrateInterviewSessions() {
        console.log('\n🎬 Migrating Interview Sessions...');

        try {
            const { data: sessions, error } = await supabase
                .from('interview_sessions')
                .select('*')
                .eq('is_deleted', false);

            if (error) throw error;

            this.stats.sessions.total = sessions.length;
            console.log(`Found ${sessions.length} interview sessions in Supabase`);

            for (const session of sessions) {
                try {
                    const candidateId = this.userMapping.get(session.candidate_id);
                    const recruiterId = this.userMapping.get(session.recruiter_id);
                    const jobId = this.jobMapping.get(session.job_id);
                    const templateId = this.templateMapping.get(session.template_id);

                    const mongoSession = new Application({
                        user: candidateId, // candidate
                        job: jobId,
                        templateId: templateId,

                        title: session.title,
                        status: session.status || 'pending',
                        scheduledAt: session.scheduled_at ? new Date(session.scheduled_at) : undefined,
                        startedAt: session.started_at ? new Date(session.started_at) : undefined,
                        completedAt: session.completed_at ? new Date(session.completed_at) : undefined,

                        currentQuestion: session.current_question || 0,
                        totalQuestions: session.total_questions || 0,
                        voiceEnabled: session.voice_enabled !== false,
                        aiModel: session.ai_model || 'default',

                        candidateAnalysisStatus: session.candidate_analysis_status || 'pending',
                        candidateAnalysisData: session.candidate_analysis_data || {},
                        transcriptionCoveragePercentage: session.transcription_coverage_percentage || 0,
                        overall_score: session.overall_score || {},

                        addedBy: recruiterId || session.created_by,
                        updatedBy: recruiterId || session.updated_by,
                        createdAt: new Date(session.created_at || Date.now()),
                        updatedAt: new Date(session.updated_at || Date.now())
                    });

                    await mongoSession.save();
                    this.sessionMapping.set(session.id, mongoSession._id.toString());
                    this.stats.sessions.migrated++;

                    if (this.stats.sessions.migrated % 25 === 0) {
                        console.log(`Migrated ${this.stats.sessions.migrated}/${this.stats.sessions.total} sessions`);
                    }

                } catch (sessionError) {
                    console.error(`Error migrating session ${session.id}:`, sessionError.message);
                    this.stats.sessions.errors++;
                }
            }

            console.log(`✅ Sessions migration completed: ${this.stats.sessions.migrated} migrated, ${this.stats.sessions.errors} errors`);

        } catch (error) {
            console.error('❌ Error in sessions migration:', error);
            throw error;
        }
    }

    async migrateInterviewResponses() {
        console.log('\n💬 Migrating Interview Responses...');

        try {
            const { data: responses, error } = await supabase
                .from('interview_responses')
                .select('*')
                .eq('is_deleted', false);

            if (error) throw error;

            this.stats.responses.total = responses.length;
            console.log(`Found ${responses.length} interview responses in Supabase`);

            for (const response of responses) {
                try {
                    const sessionId = this.sessionMapping.get(response.session_id);

                    const mongoResponse = new Response({
                        sessionId: sessionId,
                        questionNumber: response.question_number,
                        questionText: response.question_text,
                        responseText: response.response_text,
                        responseAudioUrl: response.audio_url,
                        responseVideoUrl: response.video_url,
                        responseDuration: response.response_duration,
                        transcriptionText: response.transcription,

                        aiAnalysis: response.ai_analysis || {},

                        // Legacy fields for backward compatibility
                        job: response.job || '',
                        question: response.question_text || '',
                        user: response.user || '',
                        score: response.score || '',

                        addedBy: response.created_by,
                        updatedBy: response.updated_by,
                        createdAt: new Date(response.created_at || Date.now()),
                        updatedAt: new Date(response.updated_at || Date.now())
                    });

                    await mongoResponse.save();
                    this.stats.responses.migrated++;

                    if (this.stats.responses.migrated % 100 === 0) {
                        console.log(`Migrated ${this.stats.responses.migrated}/${this.stats.responses.total} responses`);
                    }

                } catch (responseError) {
                    console.error(`Error migrating response ${response.id}:`, responseError.message);
                    this.stats.responses.errors++;
                }
            }

            console.log(`✅ Responses migration completed: ${this.stats.responses.migrated} migrated, ${this.stats.responses.errors} errors`);

        } catch (error) {
            console.error('❌ Error in responses migration:', error);
            throw error;
        }
    }

    mapUserType(supabaseUserType) {
        const typeMapping = {
            'admin': 1,
            'recruiter': 2,
            'candidate': 3,
            'user': 4
        };
        return typeMapping[supabaseUserType] || 4;
    }

    printFinalStats() {
        console.log('\n📊 Migration Summary:');
        console.log('========================');

        Object.entries(this.stats).forEach(([entity, stats]) => {
            console.log(`${entity.toUpperCase()}: ${stats.migrated}/${stats.total} migrated (${stats.errors} errors)`);
        });

        const totalMigrated = Object.values(this.stats).reduce((sum, stats) => sum + stats.migrated, 0);
        const totalErrors = Object.values(this.stats).reduce((sum, stats) => sum + stats.errors, 0);

        console.log('========================');
        console.log(`TOTAL: ${totalMigrated} records migrated, ${totalErrors} errors`);

        if (totalErrors === 0) {
            console.log('🎉 Migration completed successfully!');
        } else {
            console.log(`⚠️ Migration completed with ${totalErrors} errors. Please review the logs.`);
        }
    }

    async run() {
        try {
            console.log('🚀 Starting Supabase to MongoDB Migration...');
            await this.connect();

            // Run migrations in dependency order
            await this.migrateUsers();
            await this.migrateJobs();
            await this.migrateInterviewTemplates();
            await this.migrateInterviewSessions();
            await this.migrateInterviewResponses();

            this.printFinalStats();

        } catch (error) {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        } finally {
            await this.disconnect();
        }
    }
}

// CLI execution
if (require.main === module) {
    const migration = new SupabaseToMongoMigration();
    migration.run().catch(console.error);
}

module.exports = SupabaseToMongoMigration;
