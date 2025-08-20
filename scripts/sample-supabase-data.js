/**
 * sample-supabase-data.js
 * Script to sample actual data structure from Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sampleData() {
    try {
        console.log('📋 Sampling data structure from Supabase...\n');

        // Sample profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .limit(2);

        console.log('👤 PROFILES sample:');
        console.log(JSON.stringify(profiles, null, 2));

        // Sample interview_sessions  
        const { data: sessions } = await supabase
            .from('interview_sessions')
            .select('*')
            .limit(1);

        console.log('\n🎬 INTERVIEW_SESSIONS sample:');
        console.log(JSON.stringify(sessions, null, 2));

        // Sample interview_responses
        const { data: responses } = await supabase
            .from('interview_responses')
            .select('*')
            .limit(1);

        console.log('\n💬 INTERVIEW_RESPONSES sample:');
        console.log(JSON.stringify(responses, null, 2));

        // Sample interview_templates
        const { data: templates } = await supabase
            .from('interview_templates')
            .select('*')
            .limit(1);

        console.log('\n📋 INTERVIEW_TEMPLATES sample:');
        console.log(JSON.stringify(templates, null, 2));

        // Sample candidate_verifications
        const { data: verifications } = await supabase
            .from('candidate_verifications')
            .select('*')
            .limit(1);

        console.log('\n🔐 CANDIDATE_VERIFICATIONS sample:');
        console.log(JSON.stringify(verifications, null, 2));

    } catch (error) {
        console.error('Error sampling data:', error);
    }
}

sampleData().then(() => {
    console.log('\nData sampling completed');
}).catch(console.error);
