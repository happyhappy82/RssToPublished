const { ApifyClient } = require('apify-client');

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

async function test() {
  try {
    console.log('Testing Apify YouTube scraper...');
    
    const input = {
      urls: ['https://www.youtube.com/watch?v=lVG2hRYbRZ4'],
      maxResults: 1
    };
    
    const run = await client.actor('streamers/youtube-scraper').call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    if (items.length > 0) {
      const video = items[0];
      console.log('✓ Title:', video.title);
      console.log('✓ Has captions:', video.captions ? 'YES' : 'NO');
      if (video.captions) {
        console.log('✓ Captions length:', video.captions.length, 'chars');
        console.log('✓ Sample:', video.captions.substring(0, 100));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
