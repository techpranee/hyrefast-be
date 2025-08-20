/**
 * check-supabase-tables.js
 * Script to check what tables exist in Supabase
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

async function checkTables() {
    try {
        console.log('🔍 Checking available tables in Supabase...');

        // Try to list some common tables that might exist
        const tablesToCheck = [
            'users', 'profiles', 'candidates', 'recruiters',
            'jobs', 'job_posts', 'applications',
            'interview_sessions', 'interview_responses', 'interview_templates',
            'candidate_verifications', 'responses'
        ];

        const existingTables = [];

        for (const table of tablesToCheck) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (!error) {
                    console.log(`✅ Found table: ${table} (${data?.length || 0} records)`);
                    existingTables.push(table);
                }
            } catch (err) {
                // Table doesn't exist, continue
            }
        }

        if (existingTables.length === 0) {
            console.log('❌ No tables found. Let me try to get table schema info...');

            // Try using RPC to get table information
            try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_schema_info');
                if (rpcData) {
                    console.log('Schema info:', rpcData);
                }
            } catch (rpcErr) {
                console.log('RPC call failed, trying direct query...');
            }

            // Try a direct query to see what we can access
            try {
                const { data: testData, error: testError } = await supabase
                    .from('auth.users')
                    .select('*', { count: 'exact', head: true });

                if (!testError) {
                    console.log('✅ Found auth.users table');
                }
            } catch (authErr) {
                console.log('No access to auth.users');
            }
        }

        console.log('\n📊 Summary:');
        console.log(`Found ${existingTables.length} accessible tables:`, existingTables);

    } catch (error) {
        console.error('Error checking tables:', error);
    }
}

checkTables().then(() => {
    console.log('Table check completed');
}).catch(console.error);
