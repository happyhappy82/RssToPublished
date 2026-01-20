const { YoutubeTranscript } = require('youtube-transcript');

async function test() {
  try {
    console.log('Testing video ID extraction...');
    const url = 'https://www.youtube.com/watch?v=oRPza9FG97E';
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/embed\/([^?]+)/,
      /youtube\.com\/v\/([^?]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        console.log('✓ Extracted video ID:', match[1]);
        
        console.log('\nTesting transcript fetch...');
        const segments = await YoutubeTranscript.fetchTranscript(match[1]);
        console.log('✓ Transcript segments:', segments.length);
        console.log('✓ First segment:', segments[0].text);
        return;
      }
    }
    
    console.log('✗ Failed to extract video ID');
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

test();
