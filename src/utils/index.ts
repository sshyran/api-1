import { Worker } from 'worker_threads';
import * as path from 'path';

import { SearchRequest } from 'imdb-api';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import * as episodeParser from 'episode-parser';
import imdbAPI from '../services/imdb-api';
import * as _ from 'lodash';
//  we create the worker like this due to using TypeScript https://github.com/TypeStrong/ts-node/issues/676
const allEpisodesProcessingWorker = new Worker(path.resolve(__dirname, '../workers/worker.import.js'));

/**
 * Attempts a query to the IMDb API and standardizes the response
 * before returning.
 *
 * IMDb does not return goofs, osdbHash, tagline, trivia
 *
 * We use ts-ignore to be able to use episode data instead of just movie.
 * @see https://github.com/worr/node-imdb-api/issues/72
 *
 * @param imdbId the IMDb ID
 * @param searchRequest a query to perform in order to get the imdbId
 */
export const getFromIMDbAPI = async(imdbId?: string, searchRequest?: SearchRequest): Promise<MediaMetadataInterface> => {
  if (!imdbId) {
    const parsedFilename = episodeParser(searchRequest.name);
    const isTVEpisode = parsedFilename.show && parsedFilename.season && parsedFilename.episode;
    if (isTVEpisode) {
      const tvSeriesInfo = await imdbAPI.get({ name: parsedFilename.show });
      // @ts-ignore
      const allEpisodes = await tvSeriesInfo.episodes();
      allEpisodesProcessingWorker.postMessage(allEpisodes);
      const currentEpisode = _.find(allEpisodes, { season: parsedFilename.season, episode: parsedFilename.episode });
      imdbId = currentEpisode.imdbid;
    } else {
      const searchResults = await imdbAPI.search(searchRequest);
      // TODO Choose the most appropriate result instead of just the first
      const searchResult: any = _.first(searchResults.results);
      imdbId = searchResult.imdbid;
    }
  }
  const newMetadata: any = { id: imdbId };

  const imdbData = await imdbAPI.get({ id: imdbId });

  newMetadata.actors = _.isEmpty(imdbData.actors) ? null : imdbData.actors.split(', ');
  newMetadata.directors = _.isEmpty(imdbData.director) ? null : imdbData.director.split(', ');
  // @ts-ignore
  newMetadata.episodeNumber = imdbData.episode;
  newMetadata.episodeTitle = imdbData.title;
  newMetadata.genres = _.isEmpty(imdbData.genres) ? null : imdbData.genres.split(', ');
  // @ts-ignore
  newMetadata.seasonNumber = imdbData.season;
  newMetadata.type = imdbData.type;
  newMetadata.year = imdbData.year.toString();

  return newMetadata;
};
