/**
 * migrate-supabase-to-mongodb-final.js
 * CORRECTED Migration script using the right models:
 * - application.js for Interview Sessions
 * - response.js for Interview Responses
 */

const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Import CORRECT BE Models
const Job = require('../model/job');
const User = require('../model/user');
const InterviewTemplate = require('../model/interviewTemplate');
const Application = require('../model/application'); // CORRECT: Interview Session
const Response = require('../model/response'); // CORRECT: Interview Response
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
        this.sessionMapping = new Map(); // CRITICAL: Map Supabase session IDs to MongoDB _ids
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

    async clearExistingData() {
        console.log('🧹 Clearing existing migrated data...');

        try {
            await Response.deleteMany({});
            await Application.deleteMany({});
            await InterviewTemplate.deleteMany({});
            await User.deleteMany({ email: { $ne: 'admin@system.com' } }); // Keep any admin users

            console.log('✅ Existing data cleared');
        } catch (error) {
            console.error('❌ Error clearing data:', error);
        }
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
                            userType: 1, // Applicant
                            isActive: true,
                            profileData: profile,
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

                    // Fix questions format to match MongoDB schema
                    let questions = [];
                    if (template.questions && Array.isArray(template.questions)) {
                        questions = template.questions.map(q => ({
                            id: q.id || undefined,
                            text: q.question || q.text || 'Question text missing',
                            type: this.mapQuestionType(q.type),
                            expectedDuration: q.expectedDuration || 60,
                            followUpQuestions: q.followUpQuestions || [],
                            evaluationCriteria: q.evaluationCriteria || []
                        }));
                    }

                    const mongoTemplate = new InterviewTemplate({
                        title: template.title,
                        description: template.description,
                        jobRole: template.job_role,
                        questions: questions,
                        settings: template.settings || {},
                        isPublic: template.is_public || false,
                        isActive: template.is_active !== false,

                        addedBy: mongoUserId || null,
                        updatedBy: mongoUserId || null,
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

    mapQuestionType(type) {
        // Map Supabase question types to MongoDB enum values
        const typeMap = {
            'open_ended': 'general',
            'behavioral': 'behavioral',
            'technical': 'technical',
            'situational': 'situational',
            'general': 'general'
        };
        return typeMap[type] || 'general';
    }

    async migrateInterviewSessions() {
        console.log('\n🎬 Migrating Interview Sessions to Application model...');

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

                    const mongoSession = new Application({
                        user: candidateId, // CORRECT: application uses 'user' field
                        job: DEFAULT_JOB_ID, // CORRECT: application uses 'job' field
                        templateId: templateId,

                        title: session.title,
                        status: this.mapSessionStatus(session.status),
                        scheduledAt: session.scheduled_at ? new Date(session.scheduled_at) : undefined,
                        startedAt: session.started_at ? new Date(session.started_at) : undefined,
                        completedAt: session.completed_at ? new Date(session.completed_at) : undefined,

                        currentQuestion: session.current_question || 0,
                        totalQuestions: session.total_questions || 0,
                        voiceEnabled: session.voice_enabled !== false,
                        aiModel: session.ai_model || 'default',

                        candidateAnalysisStatus: this.mapAnalysisStatus(session.candidate_analysis_status),
                        candidateAnalysisData: session.candidate_analysis_data || {},
                        transcriptionCoveragePercentage: session.transcription_coverage_percentage || 0,
                        overallScore: session.overall_score || {},

                        addedBy: recruiterId || candidateId,
                        updatedBy: recruiterId || candidateId,
                        createdAt: new Date(session.created_at || Date.now()),
                        updatedAt: new Date(session.updated_at || Date.now())
                    });

                    await mongoSession.save();
                    // CRITICAL: Store the mapping from Supabase session ID to MongoDB session ID
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

    mapSessionStatus(status) {
        // Map Supabase status to application enum values
        const statusMap = {
            'pending': 'pending',
            'scheduled': 'pending',
            'in_progress': 'in_progress',
            'active': 'in_progress',
            'completed': 'completed',
            'cancelled': 'cancelled',
            'paused': 'pending'
        };
        return statusMap[status] || 'pending';
    }

    mapAnalysisStatus(status) {
        // Map Supabase analysis status to valid values
        const statusMap = {
            'pending': 'pending',
            'processing': 'pending',
            'completed': 'completed',
            'skipped': 'pending',
            'skipped_no_individual_analysis': 'pending',
            'failed': 'pending'
        };
        return statusMap[status] || 'pending';
    }

    async migrateInterviewResponses() {
        console.log('\n💬 Migrating Interview Responses to Response model...');

        try {
            const { data: responses, error } = await supabase
                .from('interview_responses')
                .select('*');

            if (error) throw error;

            this.stats.responses.total = responses.length;
            console.log(`Found ${responses.length} interview responses in Supabase`);

            for (const response of responses) {
                try {
                    // CRITICAL: Use the mapping to get the correct MongoDB session ID
                    const mongoSessionId = this.sessionMapping.get(response.session_id);

                    if (!mongoSessionId) {
                        console.log(`Warning: No session mapping found for response ${response.id}, session_id: ${response.session_id}`);
                        this.stats.responses.errors++;
                        continue;
                    }

                    const mongoResponse = new Response({
                        sessionId: mongoSessionId, // CORRECT: Use mapped MongoDB session ID
                        questionNumber: response.question_number,
                        questionText: response.question_text,
                        responseText: response.response_text,
                        responseAudioUrl: response.response_audio_url,
                        responseVideoUrl: response.response_video_url,
                        responseDuration: response.response_duration,
                        transcriptionText: response.transcription_text,

                        aiAnalysis: response.ai_analysis || response.multi_model_analysis_data || {},

                        // Legacy fields for compatibility with existing response model
                        job: DEFAULT_JOB_ID,
                        question: response.question_text || '',
                        user: '', // Will be populated from session if needed
                        score: response.ai_analysis_quality_score || '',

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
                            userType: 1, // Applicant
                            isActive: true,
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

        console.log('\n📋 Migration Details:');
        console.log(`- Users: Migrated from 'profiles' table to 'users' collection`);
        console.log(`- Templates: Migrated from 'interview_templates' to 'interviewTemplates' collection`);
        console.log(`- Sessions: Migrated from 'interview_sessions' to 'applications' collection ✅`);
        console.log(`- Responses: Migrated from 'interview_responses' to 'responses' collection ✅`);
        console.log(`- Default Job: Created with ID ${DEFAULT_JOB_ID}`);

        if (totalErrors === 0) {
            console.log('\n🎉 Migration completed successfully with CORRECT models!');
        } else {
            console.log(`\n⚠️ Migration completed with ${totalErrors} errors. Data relationships should now work correctly.`);
        }
    }

    async run() {
        try {
            console.log('🚀 Starting CORRECTED Supabase to MongoDB Migration...');
            console.log('📋 Using CORRECT models: Application for sessions, Response for responses');

            await this.connect();
            await this.clearExistingData();

            // Run migrations in dependency order
            await this.migrateUsers();
            await this.migrateInterviewTemplates();
            await this.migrateInterviewSessions(); // → Application model
            await this.migrateInterviewResponses(); // → Response model  
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
