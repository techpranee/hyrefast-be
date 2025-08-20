/**
 * check-supabase-jobs.js
 * Check if there are actual jobs in Supabase that we need to migrate
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabaseJobs() {
    try {
        console.log('🔍 Checking Supabase for job-related tables...');

        // Check if there are any tables that might contain job data
        const tables = ['jobs', 'job_postings', 'positions', 'roles', 'vacancies'];

        for (const table of tables) {
            try {
                const { data, error } = await supabase.from(table).select('*').limit(5);
                if (!error && data && data.length > 0) {
                    console.log(`\n✅ Found data in table: ${table}`);
                    console.log(`Records: ${data.length}`);
                    console.log('Sample record:', data[0]);
                } else if (error && !error.message.includes('does not exist')) {
                    console.log(`\n❌ Error querying ${table}:`, error.message);
                }
            } catch (err) {
                // Table doesn't exist, continue
            }
        }

        // Check interview_sessions for job-related fields
        console.log('\n🔍 Checking interview_sessions for job references...');
        const { data: sessions, error: sessionError } = await supabase
            .from('interview_sessions')
            .select('id, job_id, job_title, recruiter_id, candidate_id')
            .limit(10);

        if (!sessionError && sessions) {
            console.log('Sample session data:');
            sessions.forEach((session, index) => {
                if (index < 3) {
                    console.log(`Session ${index + 1}:`, {
                        id: session.id,
                        job_id: session.job_id,
                        job_title: session.job_title,
                        recruiter_id: session.recruiter_id,
                        candidate_id: session.candidate_id
                    });
                }
            });
        }

        // Check for recruiters in profiles
        console.log('\n🔍 Checking for recruiters in profiles...');
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, user_type, role')
            .limit(10);

        if (!profileError && profiles) {
            console.log('Sample profile data:');
            profiles.forEach((profile, index) => {
                if (index < 5) {
                    console.log(`Profile ${index + 1}:`, {
                        id: profile.id,
                        email: profile.email,
                        full_name: profile.full_name,
                        user_type: profile.user_type,
                        role: profile.role
                    });
                }
            });

            // Check for different user types or roles
            const userTypes = [...new Set(profiles.map(p => p.user_type).filter(Boolean))];
            const roles = [...new Set(profiles.map(p => p.role).filter(Boolean))];

            console.log('\nUnique user_types found:', userTypes);
            console.log('Unique roles found:', roles);
        }

    } catch (error) {
        console.error('❌ Error checking Supabase:', error);
    }
}

checkSupabaseJobs().catch(console.error);
