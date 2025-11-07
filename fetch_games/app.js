const axios = require('axios');
const cheerio = require('cheerio');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const bucketName = process.env.BUCKET_NAME;

exports.handler = async (event, context) => {
    const urls = ['https://boardgamegeek.com/browse/boardgame'];

    for (let i = 2; i <= 5; i++) {
        urls.push(`https://boardgamegeek.com/browse/boardgame/page/${i}`);
    }

    const dataLines = ['rank;id;name;link'];

    for (const url of urls) {
        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            // Find all rows that have an id starting with 'row_'
            $('tr[id^="row_"]').each((index, element) => {
                const rank = $(element).find('td.collection_rank').text().trim();

                // Find the game name and link
                const gameLinkTag = $(element).find('td.collection_objectname a.primary[href]');
                const gameName = gameLinkTag.text().trim();
                const gameLink = gameLinkTag.attr('href');

                // Extract game ID from URL (e.g., /boardgame/224517/brass-birmingham -> 224517)
                let gameId = '';
                if (gameLink) {
                    const match = gameLink.match(/\/boardgame\/(\d+)\//);
                    if (match) {
                        gameId = match[1];
                    }
                }

                if (rank && gameId && gameName && gameLink) {
                    dataLines.push(`${rank};${gameId};${gameName};${gameLink}`);
                }
            });
        } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
            throw error;
        }
    }

    const fileContent = dataLines.join('\n');
    const fileName = `${new Date().toISOString().split('T')[0]}.txt`;

    const putObjectCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent
    });

    const s3Response = await s3Client.send(putObjectCommand);

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Successfully scraped and stored game rankings',
            fileName: fileName,
            gamesCount: dataLines.length - 1,
            s3Response: s3Response
        })
    };
};
