const axios = require('axios');
const cheerio = require('cheerio');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');

const s3Client = new S3Client({region: process.env.AWS_REGION || 'us-east-1'});
const primaryBucket = process.env.PRIMARY_BUCKET_NAME;
const secondaryBucket = process.env.SECONDARY_BUCKET_NAME;
const secondaryPrefix = process.env.SECONDARY_BUCKET_PREFIX || '';

/** Headers matching HTTPie (which BGG accepts); avoid Accept-Encoding: br to reduce bot detection */
const bggRequestHeaders = {
  'User-Agent': 'HTTPie/3.2.2',
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate'
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upload file content to an S3 bucket
 */
async function uploadToS3(bucketName, key, body) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body
  });
  return await s3Client.send(command);
}

exports.handler = async (event, context) => {
  const urls = ['https://boardgamegeek.com/browse/boardgame'];

  for (let i = 2; i <= 5; i++) {
    urls.push(`https://boardgamegeek.com/browse/boardgame/page/${i}`);
  }

  const dataLines = ['rank;id;name;link'];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (i > 0) {
      await sleep(600);
    }
    try {
      const response = await axios.get(url, { headers: bggRequestHeaders });
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
  const fileName = `${new Date().toISOString().split('T')[0]}.csv`;

  const results = {
    primary: {status: 'pending'},
    secondary: {status: 'pending'}
  };

  // Upload to primary bucket
  try {
    console.log(`Uploading to primary bucket: ${primaryBucket}/${fileName}`);
    await uploadToS3(primaryBucket, fileName, fileContent);
    results.primary.status = 'success';
    console.log('Primary upload successful');
  } catch (error) {
    results.primary.status = 'failed';
    results.primary.error = error.message;
    console.error('Primary upload failed:', error.message);
  }

  // Upload to secondary bucket
  if (secondaryBucket) {
    try {
      const secondaryKey = `${secondaryPrefix}${fileName}`;
      console.log(`Uploading to secondary bucket: ${secondaryBucket}/${secondaryKey}`);
      await uploadToS3(secondaryBucket, secondaryKey, fileContent);
      results.secondary.status = 'success';
      console.log('Secondary upload successful');
    } catch (error) {
      results.secondary.status = 'failed';
      results.secondary.error = error.message;
      console.error('Secondary upload failed:', error.message);
    }
  } else {
    results.secondary.status = 'skipped';
    console.log('Secondary bucket not configured, skipping');
  }

  // Return success if at least primary succeeded
  if (results.primary.status === 'success') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully scraped and stored game rankings',
        fileName: fileName,
        gamesCount: dataLines.length - 1,
        uploads: {
          primary: {
            bucket: primaryBucket,
            key: fileName,
            status: results.primary.status
          },
          secondary: {
            bucket: secondaryBucket,
            key: secondaryPrefix + fileName,
            status: results.secondary.status,
            error: results.secondary.error
          }
        }
      })
    };
  } else {
    throw new Error(`Primary upload failed: ${results.primary.error}`);
  }
};
