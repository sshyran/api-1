import { parentPort } from 'worker_threads';
import { getFromIMDbAPI } from '../utils';

parentPort.on('message', async(allEpisodes) => {
  for (const episode in allEpisodes) {
    await getFromIMDbAPI(episode.imdbId);
  }
  // create the documents
});
