/**
 * migrate-supabase-to-mongodb-proper.js
 * Proper migration script following the correct schema design:
 * - Recruiters (userType: 2) create jobs with interview templates
 * - Applicants (userType: 1) apply to jobs via applications
 * - Each application has responses to job questions
 */

const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Import BE Models
const Job = require('../model/job');
const User = require('../model/user');
const InterviewTemplate = require('../model/interviewTemplate');
const Application = require('../model/application');
const Response = require('../model/response');

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

class ProperSupabaseToMongoMigration {
    constructor() {
        this.stats = {
            recruiters: { total: 0, migrated: 0, errors: 0 },
            applicants: { total: 0, migrated: 0, errors: 0 },
            templates: { total: 0, migrated: 0, errors: 0 },
            jobs: { total: 0, migrated: 0, errors: 0 },
            applications: { total: 0, migrated: 0, errors: 0 },
            responses: { total: 0, migrated: 0, errors: 0 }
        };

        // ID mappings between Supabase and MongoDB
        this.userMapping = new Map(); // Supabase user ID -> MongoDB _id
        this.templateMapping = new Map(); // Supabase template ID -> MongoDB _id
        this.jobMapping = new Map(); // Supabase job ID -> MongoDB _id
        this.applicationMapping = new Map(); // Supabase session ID -> MongoDB _id
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
        console.log('\n👥 Migrating Users...');

        try {
            // Get all profiles from Supabase
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) throw error;

            console.log(`Found ${profiles.length} profiles in Supabase`);

            // Get job creators to identify recruiters
            const { data: jobs, error: jobError } = await supabase
                .from('job_postings')
                .select('created_by');

            const recruiterIds = new Set();
            if (!jobError && jobs) {
                jobs.forEach(job => {
                    if (job.created_by) {
                        recruiterIds.add(job.created_by);
                    }
                });
            }

            console.log(`Identified ${recruiterIds.size} recruiters from job postings`);

            for (const profile of profiles) {
                try {
                    const isRecruiter = recruiterIds.has(profile.id);
                    const userType = isRecruiter ? 2 : 1; // 2 = Recruiter, 1 = Applicant

                    const mongoUser = new User({
                        name: profile.full_name || profile.email.split('@')[0],
                        email: profile.email,
                        mobileNo: profile.phone_number,
                        password: 'migrated_user', // Will be reset by users
                        userType: userType,
                        isActive: true,
                        createdAt: new Date(profile.created_at || Date.now()),
                        updatedAt: new Date(profile.updated_at || Date.now())
                    });

                    await mongoUser.save();
                    this.userMapping.set(profile.id, mongoUser._id.toString());

                    if (isRecruiter) {
                        this.stats.recruiters.migrated++;
                    } else {
                        this.stats.applicants.migrated++;
                    }

                    if ((this.stats.recruiters.migrated + this.stats.applicants.migrated) % 50 === 0) {
                        console.log(`Migrated ${this.stats.recruiters.migrated + this.stats.applicants.migrated}/${profiles.length} users`);
                    }

                } catch (userError) {
                    console.error(`Error migrating user ${profile.email}:`, userError.message);
                    this.stats.applicants.errors++;
                }
            }

            this.stats.recruiters.total = recruiterIds.size;
            this.stats.applicants.total = profiles.length - recruiterIds.size;

            console.log(`✅ Users migration completed:`);
            console.log(`   Recruiters: ${this.stats.recruiters.migrated}/${this.stats.recruiters.total}`);
            console.log(`   Applicants: ${this.stats.applicants.migrated}/${this.stats.applicants.total}`);

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
                    const creatorId = this.userMapping.get(template.created_by);

                    // Fix question format - map Supabase format to MongoDB schema
                    const questions = Array.isArray(template.questions) ? template.questions.map(q => ({
                        id: q.id || Math.random().toString(36),
                        text: q.question || q.text || 'Question text not available',
                        type: this.mapQuestionType(q.type),
                        expectedDuration: q.expected_duration || q.duration || 120,
                        followUpQuestions: q.follow_up_questions || [],
                        evaluationCriteria: q.evaluation_criteria || []
                    })) : [];

                    const mongoTemplate = new InterviewTemplate({
                        title: template.title || 'Untitled Template',
                        description: template.description,
                        jobRole: template.job_role,
                        questions: questions,
                        settings: template.settings || {},
                        isPublic: template.is_public || false,
                        isActive: template.is_active !== false,
                        addedBy: creatorId,
                        updatedBy: creatorId,
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

            console.log(`✅ Templates migration completed: ${this.stats.templates.migrated}/${this.stats.templates.total}`);

        } catch (error) {
            console.error('❌ Error in templates migration:', error);
            throw error;
        }
    }

    mapQuestionType(type) {
        const typeMap = {
            'open_ended': 'general',
            'technical': 'technical',
            'behavioral': 'behavioral',
            'situational': 'situational'
        };
        return typeMap[type] || 'general';
    }

    async migrateJobs() {
        console.log('\n💼 Migrating Jobs...');

        try {
            const { data: jobPostings, error } = await supabase
                .from('job_postings')
                .select('*');

            if (error) throw error;

            this.stats.jobs.total = jobPostings.length;
            console.log(`Found ${jobPostings.length} job postings in Supabase`);

            for (const jobPosting of jobPostings) {
                try {
                    const recruiterId = this.userMapping.get(jobPosting.created_by);
                    const templateId = this.templateMapping.get(jobPosting.interview_template_id);

                    const mongoJob = new Job({
                        title: jobPosting.title,
                        description: jobPosting.description,
                        requirements: Array.isArray(jobPosting.requirements) ? jobPosting.requirements : [],
                        last_date: jobPosting.deadline ? new Date(jobPosting.deadline).toISOString().split('T')[0] : undefined,
                        salary: jobPosting.salary_range || 'Not specified',
                        employmentType: jobPosting.employment_type || 'full-time',
                        location: jobPosting.location || 'Not specified',
                        status: jobPosting.status === 'published' ? 'active' : 'draft',
                        interviewTemplateId: templateId,

                        // Additional fields from Supabase
                        jobPostingId: jobPosting.id, // Store original Supabase ID
                        interviewConfig: jobPosting.interview_config,
                        publicLinkSettings: jobPosting.public_link_settings,
                        preRequisites: jobPosting.pre_requisites,

                        addedBy: recruiterId,
                        updatedBy: recruiterId,
                        createdAt: new Date(jobPosting.created_at || Date.now()),
                        updatedAt: new Date(jobPosting.updated_at || Date.now())
                    });

                    await mongoJob.save();
                    this.jobMapping.set(jobPosting.id, mongoJob._id.toString());
                    this.stats.jobs.migrated++;

                    if (this.stats.jobs.migrated % 10 === 0) {
                        console.log(`Migrated ${this.stats.jobs.migrated}/${this.stats.jobs.total} jobs`);
                    }

                } catch (jobError) {
                    console.error(`Error migrating job ${jobPosting.title}:`, jobError.message);
                    this.stats.jobs.errors++;
                }
            }

            console.log(`✅ Jobs migration completed: ${this.stats.jobs.migrated}/${this.stats.jobs.total}`);

        } catch (error) {
            console.error('❌ Error in jobs migration:', error);
            throw error;
        }
    }

    async migrateApplications() {
        console.log('\n📝 Migrating Applications (from interview_sessions)...');

        try {
            const { data: sessions, error } = await supabase
                .from('interview_sessions')
                .select('*');

            if (error) throw error;

            this.stats.applications.total = sessions.length;
            console.log(`Found ${sessions.length} interview sessions in Supabase`);

            for (const session of sessions) {
                try {
                    const candidateId = this.userMapping.get(session.candidate_id);
                    const recruiterId = this.userMapping.get(session.recruiter_id);

                    // Try to find the job by matching session data with job postings
                    let jobId = null;
                    if (session.job_id) {
                        jobId = this.jobMapping.get(session.job_id);
                    }

                    // If no direct job mapping, try to infer from template
                    if (!jobId && session.template_id) {
                        const templateId = this.templateMapping.get(session.template_id);
                        if (templateId) {
                            const job = await Job.findOne({ interviewTemplateId: templateId });
                            if (job) {
                                jobId = job._id.toString();
                            }
                        }
                    }

                    if (!candidateId || !jobId) {
                        console.log(`Skipping session ${session.id}: missing candidate (${!!candidateId}) or job (${!!jobId})`);
                        this.stats.applications.errors++;
                        continue;
                    }

                    const mongoApplication = new Application({
                        user: candidateId,
                        job: jobId,

                        // Store session details
                        sessionId: session.id,
                        title: session.title,
                        status: this.mapApplicationStatus(session.status),
                        scheduledAt: session.scheduled_at ? new Date(session.scheduled_at) : undefined,
                        startedAt: session.started_at ? new Date(session.started_at) : undefined,
                        completedAt: session.completed_at ? new Date(session.completed_at) : undefined,

                        // Interview progress
                        currentQuestion: session.current_question || 0,
                        totalQuestions: session.total_questions || 0,

                        // Analysis data
                        candidateAnalysisData: session.candidate_analysis_data || {},
                        overallScore: session.overall_score || 0,

                        addedBy: recruiterId || candidateId,
                        updatedBy: recruiterId || candidateId,
                        createdAt: new Date(session.created_at || Date.now()),
                        updatedAt: new Date(session.updated_at || Date.now())
                    });

                    await mongoApplication.save();
                    this.applicationMapping.set(session.id, mongoApplication._id.toString());
                    this.stats.applications.migrated++;

                    if (this.stats.applications.migrated % 100 === 0) {
                        console.log(`Migrated ${this.stats.applications.migrated}/${this.stats.applications.total} applications`);
                    }

                } catch (applicationError) {
                    console.error(`Error migrating application ${session.id}:`, applicationError.message);
                    this.stats.applications.errors++;
                }
            }

            console.log(`✅ Applications migration completed: ${this.stats.applications.migrated}/${this.stats.applications.total}`);

        } catch (error) {
            console.error('❌ Error in applications migration:', error);
            throw error;
        }
    }

    mapApplicationStatus(status) {
        const statusMap = {
            'pending': 'pending',
            'scheduled': 'scheduled',
            'in_progress': 'in_progress',
            'completed': 'completed',
            'cancelled': 'cancelled'
        };
        return statusMap[status] || 'pending';
    }

    async migrateResponses() {
        console.log('\n💬 Migrating Responses...');

        try {
            const { data: responses, error } = await supabase
                .from('interview_responses')
                .select('*');

            if (error) throw error;

            this.stats.responses.total = responses.length;
            console.log(`Found ${responses.length} interview responses in Supabase`);

            for (const response of responses) {
                try {
                    const applicationId = this.applicationMapping.get(response.session_id);

                    if (!applicationId) {
                        this.stats.responses.errors++;
                        continue; // Skip responses without corresponding applications
                    }

                    // Get the application to find job and user
                    const application = await Application.findById(applicationId);
                    if (!application) {
                        this.stats.responses.errors++;
                        continue;
                    }

                    const mongoResponse = new Response({
                        user: application.user,
                        job: application.job,
                        application: applicationId,

                        // Question and response data
                        question: response.question_text || `Question ${response.question_number}`,
                        questionNumber: response.question_number,
                        score: response.ai_analysis_quality_score || 0,

                        // Response content
                        responseText: response.response_text,
                        responseAudioUrl: response.response_audio_url,
                        responseVideoUrl: response.response_video_url,
                        responseDuration: response.response_duration,
                        transcriptionText: response.transcription_text,

                        // Analysis
                        aiAnalysis: response.ai_analysis || response.multi_model_analysis_data || {},

                        addedBy: application.user,
                        updatedBy: application.user,
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

            console.log(`✅ Responses migration completed: ${this.stats.responses.migrated}/${this.stats.responses.total}`);

        } catch (error) {
            console.error('❌ Error in responses migration:', error);
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
            console.log('🚀 Starting Proper Supabase to MongoDB Migration...');
            console.log('Schema: Recruiters → Jobs → Applications → Responses');

            await this.connect();

            // Run migrations in proper dependency order
            await this.migrateUsers(); // First migrate users (identify recruiters)
            await this.migrateInterviewTemplates(); // Then templates
            await this.migrateJobs(); // Then jobs (created by recruiters using templates)
            await this.migrateApplications(); // Then applications (candidates applying to jobs)
            await this.migrateResponses(); // Finally responses (to application questions)

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
    const migration = new ProperSupabaseToMongoMigration();
    migration.run().catch(console.error);
}

module.exports = ProperSupabaseToMongoMigration;
