/**
 * check-supabase-data.js
 * Script to check actual data counts in Supabase tables
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    try {
        console.log('📊 Checking data in Supabase tables...');

        const tables = [
            'users', 'profiles', 'candidates', 'recruiters',
            'jobs', 'job_posts', 'applications',
            'interview_sessions', 'interview_responses', 'interview_templates',
            'candidate_verifications', 'responses'
        ];

        for (const table of tables) {
            try {
                // Get actual count
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (!error) {
                    if (count > 0) {
                        console.log(`✅ ${table}: ${count} records`);

                        // Get a sample record to see the structure
                        const { data: sample } = await supabase
                            .from(table)
                            .select('*')
                            .limit(1);

                        if (sample && sample.length > 0) {
                            console.log(`   Sample fields: ${Object.keys(sample[0]).join(', ')}`);
                        }
                    } else {
                        console.log(`⚪ ${table}: 0 records`);
                    }
                }
            } catch (err) {
                console.log(`❌ ${table}: Error - ${err.message}`);
            }
        }

    } catch (error) {
        console.error('Error checking data:', error);
    }
}

checkData().then(() => {
    console.log('\nData check completed');
}).catch(console.error);
