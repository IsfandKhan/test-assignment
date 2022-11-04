const https = require('https');

enum API_ENDPOINTS {
  EPISODES = '/episode',
  CHARACTERS = '/character',
}

interface ICommon {
  id: number;
  name: string;
  url: string;
  created: string;
}

interface IPage {
  count: number;
  pages: number;
  next: string;
  prev: string;
}

interface ILocation {
  name: string;
  url: string;
}

interface ICharacter extends ICommon {
  status: string;
  species: string;
  type: string;
  gender: string;
  origin: ILocation;
  location: ILocation;
  image: string;
  episode: string[];
}

interface IServerEpisode extends ICommon {
  air_date: string;
  episode: string;
  characters: string[];
}

interface IEpisode extends Omit<IServerEpisode, 'characters'> {
  characters: ICharacter[];
}

interface IEpisodesPage {
  info: IPage;
  results: IServerEpisode[];
}

class APIService {
  private baseUrl: string = '';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public get<T>(endpoint: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const apiUrl: string = this.baseUrl + endpoint;
      https.get(apiUrl, (res: typeof https.ServerResponse) => {
        if (res.statusCode < 200 || res.statusCode >= 300) reject(new Error(`statusCode=${res.statusCode} | URL: ${apiUrl}`));
  
        const body: Uint8Array[] = [];
        res.on('data', (chunk: Uint8Array) => body.push(chunk));
        res.on('end', () => {
          try {
            const response: any = JSON.parse(Buffer.concat(body).toString());
            resolve(response);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (err: any) => reject(err + `| URL: ${apiUrl}`));
    });
  }
}

const api: APIService = new APIService('https://rickandmortyapi.com/api');

const unique = <T>(arr: T[]): T[] => {
  return arr.filter((item: T, i: number, arrRef: T[]) => arrRef.indexOf(item) === i);
}

const getIdsFromCharacters = (charactersUrls: string[]): string[] => {
  return charactersUrls.map((characterUrl: string) => {
    const splitUrl: string[] = characterUrl.split('/');
    return splitUrl[splitUrl.length - 1];
  });
}

const fetchAllEpisodes = async (url: string): Promise<IEpisode[]> => {
  const serverEpisodes: IServerEpisode[] = [];
  const charactersIds: string[] = [];
  let pageNo = 1;

  const fetchEpisodesPage = async (pageLink: string): Promise<void> => {
    if (!pageLink) return;

    const episodesResponse: IEpisodesPage = await api.get<IEpisodesPage>(pageLink);
    const { info, results } = episodesResponse;
    const allCharactersUrls: string[] = results.reduce(
      (acc: string[], result: IServerEpisode): string[] => [...acc, ...result.characters],
      []
    );
    const extractedCharacterIds: string[] = getIdsFromCharacters(allCharactersUrls);

    charactersIds.push(...unique(extractedCharacterIds));
    serverEpisodes.push(...results);

    return fetchEpisodesPage(info.next ? `${API_ENDPOINTS.EPISODES}?page=${pageNo += 1}` : '');
  }

  await fetchEpisodesPage(url);

  const allCharacters: ICharacter[] = await api.get<ICharacter[]>(`${API_ENDPOINTS.CHARACTERS}/${charactersIds.join()}`);

  return serverEpisodes.map((serverEpisode: IServerEpisode): IEpisode => {
    return {
      ...serverEpisode,
      characters: serverEpisode.characters.map((character: string): ICharacter => {
        for (const characterObj of allCharacters) {
          const splitElement: string[] = character.split('/');
          if (characterObj.id === Number(splitElement[splitElement.length - 1])) return characterObj;
        }
        return null as unknown as ICharacter;
      }),
    };
  });
}

(async () => console.log(await fetchAllEpisodes(API_ENDPOINTS.EPISODES)))();
