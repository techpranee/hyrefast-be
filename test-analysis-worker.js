/**
 * test-analysis-worker.js
 * @description :: Test script for the analysis worker system
 */

const mongoose = require('mongoose');
const AnalysisWorkerManager = require('./services/analysisWorkerManager');

// Import all required models to register their schemas
const Application = require('./model/application');
const Response = require('./model/response');
const AnalysisTasks = require('./model/analysisTasks');
const User = require('./model/user');
const Job = require('./model/job');
const Question = require('./model/question');
const Workspace = require('./model/workspace');

// Test configuration
const TEST_CONFIG = {
    mongoURI: 'mongodb+srv://platinum:platinum@cleanzy.fvlqgga.mongodb.net/hyrefast?retryWrites=true&w=majority',
    testApplicationId: null, // Will be set dynamically
    testWorkspaceId: '68a83da7fa602fd5dafe5b55' // Replace with actual workspace ID
};

async function connectToDatabase() {
    try {
        await mongoose.connect(TEST_CONFIG.mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to database');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}

async function findTestApplication() {
    try {
        // Find an application with interview_completed status
        const application = await Application.findOne({
            status: 'interview_completed',
            isActive: true,
            isDeleted: false
        }).populate('candidate').populate('job');

        if (!application) {
            console.log('⚠️ No completed interview applications found');
            return null;
        }

        // Check if it has responses
        const responseCount = await Response.countDocuments({
            sessionId: application._id,
            isActive: true,
            isDeleted: false
        });

        if (responseCount === 0) {
            console.log('⚠️ Application found but no responses available');
            return null;
        }

        console.log(`✅ Found test application: ${application._id}`);
        console.log(`   Candidate: ${application.candidate?.name || 'Unknown'}`);
        console.log(`   Job: ${application.job?.title || 'Unknown'}`);
        console.log(`   Responses: ${responseCount}`);

        return application;

    } catch (error) {
        console.error('❌ Error finding test application:', error);
        throw error;
    }
}

async function testAnalysisWorker() {
    try {
        console.log('🧪 Starting Analysis Worker Test...\n');

        // Connect to database
        await connectToDatabase();

        // Find a test application
        const testApplication = await findTestApplication();
        if (!testApplication) {
            console.log('❌ No suitable test application found. Please complete an interview first.');
            return;
        }

        TEST_CONFIG.testApplicationId = testApplication._id.toString();
        TEST_CONFIG.testWorkspaceId = (testApplication.workspace || TEST_CONFIG.testWorkspaceId).toString();

        // Check if analysis task already exists
        const existingTask = await AnalysisTasks.findOne({
            applicationId: TEST_CONFIG.testApplicationId,
            status: { $in: ['pending', 'processing'] }
        });

        if (existingTask) {
            console.log(`⚠️ Analysis task already exists: ${existingTask.taskId}`);
            console.log('   Monitoring existing task...\n');
            await monitorTask(existingTask.taskId);
            return;
        }

        // Set up event listeners
        setupEventListeners();

        // Queue analysis task
        console.log('📋 Queueing analysis task...');
        const queueResult = await AnalysisWorkerManager.queueAnalysisTask({
            applicationId: TEST_CONFIG.testApplicationId,
            workspaceId: TEST_CONFIG.testWorkspaceId,
            priority: 'high'
        });

        if (!queueResult.success) {
            console.error('❌ Failed to queue analysis task:', queueResult.message);
            return;
        }

        console.log(`✅ Analysis task queued: ${queueResult.taskId}`);
        console.log(`   Queue position: ${queueResult.position}\n`);

        // Monitor the task
        await monitorTask(queueResult.taskId);

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

function setupEventListeners() {
    console.log('🎧 Setting up event listeners...\n');

    AnalysisWorkerManager.on('progress', (data) => {
        console.log(`📊 Progress [${data.taskId}]: ${data.step} - ${data.message}`);
        if (data.current && data.total) {
            console.log(`   └─ ${data.current}/${data.total} completed`);
        }
    });

    AnalysisWorkerManager.on('completed', (data) => {
        console.log(`🎉 Task completed [${data.taskId}]`);
        if (data.result && data.result.results) {
            console.log(`   └─ Results: ${JSON.stringify(data.result.results, null, 2)}`);
        }
    });

    AnalysisWorkerManager.on('failed', (data) => {
        console.log(`❌ Task failed [${data.taskId}]: ${data.error.message}`);
        if (data.retry) {
            console.log('   └─ Task will be retried');
        }
    });

    AnalysisWorkerManager.on('error', (data) => {
        console.log(`💥 Worker error [${data.taskId}]: ${data.error.message}`);
    });
}

async function monitorTask(taskId) {
    console.log(`👀 Monitoring task: ${taskId}\n`);

    const checkInterval = setInterval(async () => {
        try {
            const task = await AnalysisTasks.findOne({ taskId });
            if (!task) {
                console.log('❌ Task not found');
                clearInterval(checkInterval);
                return;
            }

            console.log(`📋 Task Status: ${task.status}`);
            console.log(`   Progress: ${task.progress.percentage}% (${task.progress.currentStep})`);
            console.log(`   Steps: ${task.progress.completedSteps}/${task.progress.totalSteps}`);

            if (task.status === 'completed') {
                console.log('\n🎉 Analysis completed successfully!');
                await showResults(taskId);
                clearInterval(checkInterval);
                await cleanup();
            } else if (task.status === 'failed') {
                console.log('\n❌ Analysis failed!');
                if (task.error) {
                    console.log(`   Error: ${task.error.message}`);
                    console.log(`   Step: ${task.error.step}`);
                }
                clearInterval(checkInterval);
                await cleanup();
            }

            console.log(''); // Empty line for readability

        } catch (error) {
            console.error('❌ Error monitoring task:', error);
            clearInterval(checkInterval);
            await cleanup();
        }
    }, 5000); // Check every 5 seconds

    // Set timeout for long-running tasks
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log('⏰ Monitoring timeout reached');
        cleanup();
    }, 300000); // 5 minutes timeout
}

async function showResults(taskId) {
    try {
        const task = await AnalysisTasks.findOne({ taskId });
        const application = await Application.findById(TEST_CONFIG.testApplicationId);

        console.log('📊 Analysis Results:');
        console.log('─'.repeat(50));

        if (task.results) {
            console.log(`Overall Score: ${task.results.averageScore || 'N/A'}`);
            console.log(`Individual Analyses: ${task.results.individualScores?.length || 0}`);
            console.log(`Completed At: ${task.results.analysisCompletedAt || 'N/A'}`);
        }

        if (application.overall_score) {
            console.log('\nOverall Analysis Summary:');
            console.log(`Hiring Recommendation: ${application.overall_score.hiring_recommendation || 'N/A'}`);
            console.log(`Confidence: ${application.overall_score.recommendation_confidence || 'N/A'}`);
            console.log(`Technical Score: ${application.overall_score.technical_competency || 'N/A'}`);
            console.log(`Communication Score: ${application.overall_score.communication_skills || 'N/A'}`);
        }

        console.log('─'.repeat(50));

    } catch (error) {
        console.error('❌ Error showing results:', error);
    }
}

async function cleanup() {
    try {
        console.log('\n🧹 Cleaning up...');

        // Get queue stats
        const stats = AnalysisWorkerManager.getQueueStats();
        console.log(`Queue Stats: ${JSON.stringify(stats, null, 2)}`);

        // Close database connection
        await mongoose.connection.close();
        console.log('✅ Database connection closed');

        // Exit process
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    cleanup();
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    cleanup();
});

// Run the test
if (require.main === module) {
    testAnalysisWorker().catch(console.error);
}

module.exports = { testAnalysisWorker };
