const { ApifyClient } = require('apify-client');

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

async function test() {
  try {
    console.log('Testing Apify YouTube scraper with correct input...');
    
    const input = {
      startUrls: ['https://www.youtube.com/watch?v=lVG2hRYbRZ4'],
      maxResults: 1,
      subtitlesLanguage: 'ko',
      subtitlesFormat: 'text'
    };
    
    const run = await client.actor('streamers/youtube-scraper').call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log('✓ Results:', items.length);
    if (items.length > 0) {
      const video = items[0];
      console.log('✓ Title:', video.title?.substring(0, 50));
      console.log('✓ Has subtitles:', video.subtitles ? 'YES' : 'NO');
      if (video.subtitles) {
        console.log('✓ Subtitles length:', video.subtitles.length, 'chars');
        console.log('✓ Sample:', video.subtitles.substring(0, 150));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
