/**
 * migrate-supabase-to-mongodb-corrected.js
 * Migration script to move data from Supabase to MongoDB using BE models
 * Based on actual Supabase schema analysis
 */

const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Import BE Models
const Job = require('../model/job');
const User = require('../model/user');
const InterviewTemplate = require('../model/interviewTemplate');
const InterviewSession = require('../model/interviewSession');
const InterviewResponse = require('../model/interviewResponse');
const CandidateVerification = require('../model/candidateVerification');

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

// Default Job ID (create this first with create-default-job.js)
const DEFAULT_JOB_ID = '68998c698d4182b80c0d4345';

class SupabaseToMongoMigration {
    constructor() {
        this.stats = {
            users: { total: 0, migrated: 0, errors: 0 },
            templates: { total: 0, migrated: 0, errors: 0 },
            sessions: { total: 0, migrated: 0, errors: 0 },
            responses: { total: 0, migrated: 0, errors: 0 },
            verifications: { total: 0, migrated: 0, errors: 0 }
        };
        this.userMapping = new Map(); // Map Supabase user IDs to MongoDB _ids
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
        console.log('\n📄 Migrating Users (from profiles)...');

        try {
            const { data: supabaseProfiles, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) throw error;

            this.stats.users.total = supabaseProfiles.length;
            console.log(`Found ${supabaseProfiles.length} profiles in Supabase`);

            for (const profile of supabaseProfiles) {
                try {
                    // Check if user already exists
                    const existingUser = await User.findOne({ email: profile.email });

                    let mongoUser;
                    if (existingUser) {
                        console.log(`User ${profile.email} already exists, updating...`);

                        mongoUser = await User.findByIdAndUpdate(
                            existingUser._id,
                            {
                                name: profile.full_name || existingUser.name,
                                profileData: profile,
                                isActive: true,
                                isVerified: true,
                                verifiedAt: new Date(profile.created_at),
                                lastLoginAt: new Date(profile.updated_at),
                                updatedAt: new Date(profile.updated_at || Date.now())
                            },
                            { new: true }
                        );
                    } else {
                        // Create new user
                        mongoUser = new User({
                            name: profile.full_name || 'Unknown',
                            email: profile.email,
                            mobileNo: profile.phone_number,
                            password: 'migrated_user', // Will be reset by users
                            userType: 1, // Default to Applicant (was 3)
                            isActive: true,
                            isVerified: true,
                            verifiedAt: new Date(profile.created_at),
                            profileData: profile,
                            lastLoginAt: new Date(profile.updated_at),
                            createdAt: new Date(profile.created_at),
                            updatedAt: new Date(profile.updated_at || Date.now())
                        });

                        await mongoUser.save();
                    }

                    // Store mapping for future reference
                    this.userMapping.set(profile.id, mongoUser._id.toString());
                    this.stats.users.migrated++;

                    if (this.stats.users.migrated % 10 === 0) {
                        console.log(`Migrated ${this.stats.users.migrated}/${this.stats.users.total} users`);
                    }

                } catch (userError) {
                    console.error(`Error migrating user ${profile.email}:`, userError.message);
                    this.stats.users.errors++;
                }
            }

            console.log(`✅ Users migration completed: ${this.stats.users.migrated} migrated, ${this.stats.users.errors} errors`);

        } catch (error) {
            console.error('❌ Error in users migration:', error);
            throw error;
        }
    }

    async migrateInterviewTemplates() {
        console.log('\n📋 Migrating Interview Templates...');

        try {
            const { data: templates, error } = await supabase
                .from('interview_templates')
                .select('*');

            if (error) throw error;

            this.stats.templates.total = templates.length;
            console.log(`Found ${templates.length} interview templates in Supabase`);

            for (const template of templates) {
                try {
                    const mongoUserId = this.userMapping.get(template.created_by);

                    const mongoTemplate = new InterviewTemplate({
                        title: template.title,
                        description: template.description,
                        jobRole: template.job_role,
                        questions: template.questions || [],
                        settings: template.settings || {},
                        isPublic: template.is_public || false,
                        isActive: template.is_active !== false,

                        addedBy: mongoUserId || template.created_by,
                        updatedBy: mongoUserId || template.created_by,
                        createdAt: new Date(template.created_at || Date.now()),
                        updatedAt: new Date(template.updated_at || Date.now())
                    });

                    await mongoTemplate.save();
                    this.templateMapping.set(template.id, mongoTemplate._id.toString());
                    this.stats.templates.migrated++;

                    if (this.stats.templates.migrated % 5 === 0) {
                        console.log(`Migrated ${this.stats.templates.migrated}/${this.stats.templates.total} templates`);
                    }

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
                .select('*');

            if (error) throw error;

            this.stats.sessions.total = sessions.length;
            console.log(`Found ${sessions.length} interview sessions in Supabase`);

            for (const session of sessions) {
                try {
                    const candidateId = this.userMapping.get(session.candidate_id);
                    const recruiterId = this.userMapping.get(session.recruiter_id);
                    const templateId = this.templateMapping.get(session.template_id);

                    const mongoSession = new InterviewSession({
                        candidateId: candidateId,
                        recruiterId: recruiterId,
                        jobId: DEFAULT_JOB_ID, // Use default job ID
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
                        overallScore: session.overall_score || {},

                        addedBy: recruiterId || candidateId,
                        updatedBy: recruiterId || candidateId,
                        createdAt: new Date(session.created_at || Date.now()),
                        updatedAt: new Date(session.updated_at || Date.now())
                    });

                    await mongoSession.save();
                    this.sessionMapping.set(session.id, mongoSession._id.toString());
                    this.stats.sessions.migrated++;

                    if (this.stats.sessions.migrated % 50 === 0) {
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
                .select('*');

            if (error) throw error;

            this.stats.responses.total = responses.length;
            console.log(`Found ${responses.length} interview responses in Supabase`);

            for (const response of responses) {
                try {
                    const sessionId = this.sessionMapping.get(response.session_id);

                    const mongoResponse = new InterviewResponse({
                        sessionId: sessionId,
                        questionNumber: response.question_number,
                        questionText: response.question_text,
                        responseText: response.response_text,
                        responseAudioUrl: response.response_audio_url,
                        responseVideoUrl: response.response_video_url,
                        responseDuration: response.response_duration,
                        transcriptionText: response.transcription_text,

                        aiAnalysis: response.ai_analysis || response.multi_model_analysis_data || {},

                        addedBy: null,
                        updatedBy: null,
                        createdAt: new Date(response.created_at || Date.now()),
                        updatedAt: new Date(response.created_at || Date.now())
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

    async updateUsersWithVerifications() {
        console.log('\n🔐 Updating Users with Verification Data...');

        try {
            const { data: verifications, error } = await supabase
                .from('candidate_verifications')
                .select('*');

            if (error) throw error;

            this.stats.verifications.total = verifications.length;
            console.log(`Found ${verifications.length} candidate verifications in Supabase`);

            for (const verification of verifications) {
                try {
                    // Find user by email
                    const user = await User.findOne({ email: verification.email });

                    if (user) {
                        // Update user with verification data
                        user.profileData = {
                            ...user.profileData,
                            verification: verification.profile_data
                        };
                        user.isVerified = verification.verification_status === 'verified';
                        user.verifiedAt = verification.verified_at ? new Date(verification.verified_at) : undefined;
                        user.verificationToken = verification.verification_token;

                        await user.save();
                        this.stats.verifications.migrated++;
                    } else {
                        // Create new user for verification
                        const newUser = new User({
                            name: verification.full_name || 'Unknown',
                            email: verification.email,
                            mobileNo: verification.phone_number,
                            password: 'migrated_user',
                            userType: 1, // Applicant (was 3)
                            isActive: true,
                            isVerified: verification.verification_status === 'verified',
                            verifiedAt: verification.verified_at ? new Date(verification.verified_at) : undefined,
                            verificationToken: verification.verification_token,
                            profileData: verification.profile_data || {},
                            createdAt: new Date(verification.created_at),
                            updatedAt: new Date(verification.updated_at || Date.now())
                        });

                        await newUser.save();
                        this.stats.verifications.migrated++;
                    }

                    if (this.stats.verifications.migrated % 50 === 0) {
                        console.log(`Updated ${this.stats.verifications.migrated}/${this.stats.verifications.total} verifications`);
                    }

                } catch (verificationError) {
                    console.error(`Error updating verification ${verification.email}:`, verificationError.message);
                    this.stats.verifications.errors++;
                }
            }

            console.log(`✅ Verifications update completed: ${this.stats.verifications.migrated} updated, ${this.stats.verifications.errors} errors`);

        } catch (error) {
            console.error('❌ Error in verifications update:', error);
            throw error;
        }
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
            await this.migrateInterviewTemplates();
            await this.migrateInterviewSessions();
            await this.migrateInterviewResponses();
            await this.updateUsersWithVerifications();

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
