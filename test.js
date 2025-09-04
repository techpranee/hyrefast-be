
const fs = require('fs');
const path = require('path');
const TranscriptionService = require('./services/transcriptionService'); // Adjust path as needed

async function testTranscriptionFromUrl(audioUrl, outputFilePath) {
    const transcriptionService = new TranscriptionService();
    try {
        console.log('Starting transcription for:', audioUrl);

        // Transcribe audio from URL
        const result = await transcriptionService.processAudioTranscription(audioUrl, { mimeType: 'audio/webm' });
console.log('Transcription result object:', result);
        if(result.success) {
            console.log('Transcription successful:');
            console.log(result.transcription);

            // Save transcription to file
            fs.writeFileSync(outputFilePath, result.raw.transcription, 'utf8');
            console.log('Transcription saved to:', result.raw.transcription);
        } else {
            console.error('Transcription failed:', result.raw.transcription);
        }
    } catch (error) {
        console.error('Error during transcription test:', error.message);
    }
}

// Example usage:
const audioUrl = 'https://supabase-tp.s3.ap-south-1.amazonaws.com/interviews/0ad128e9ebb9c8b1e3803f83bb3b124cb65e54deb5a2da27e741a5390f46823a-2-1756979874282/q2_audio_1756979874311_72dmox.webm';
const outputFile = process.argv[3] || path.join(__dirname, 'transcription_output.txt');

if (!audioUrl) {
    console.error('Please provide an audio URL as the first argument.');
    process.exit(1);
}

testTranscriptionFromUrl(audioUrl, outputFile);
