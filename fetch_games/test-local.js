const fs = require('fs');
const path = require('path');

// Mock AWS S3 for local testing
const mockS3Client = {
    send: async (command) => {
        const outputDir = path.join(__dirname, '..', 'local-output');

        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write the file locally instead of to S3
        const fileName = command.input.Key;
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, command.input.Body);

        console.log(`✓ File saved locally: ${filePath}`);

        return {
            $metadata: { httpStatusCode: 200 }
        };
    }
};

// Mock the AWS SDK module
require.cache[require.resolve('@aws-sdk/client-s3')] = {
    exports: {
        S3Client: function() { return mockS3Client; },
        PutObjectCommand: function(input) { this.input = input; }
    }
};

// Set environment variables for local testing
process.env.BUCKET_NAME = 'bgg-rank-scrapes-local';
process.env.AWS_REGION = 'us-east-1';

// Import the handler after mocking
const { handler } = require('./app');

// Run the test
(async () => {
    console.log('🚀 Starting local test of BGG rank scraper...\n');

    try {
        const result = await handler({}, {});
        console.log('\n✅ Success!');
        console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
})();
