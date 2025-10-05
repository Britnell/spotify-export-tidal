import type { TTrack } from './tidal';

type SearchRes =
  | {
      data: TTrack[];
      included?: any[];
      links: any;
    }
  | null
  | undefined;

export const parseSearchRes = (search: SearchRes) =>
  search?.data.map((res) => {
    console.log(res);
    const alb_id = res.relationships?.albums.data?.[0]?.id;
    const art_id = res.relationships?.artists.data?.[0]?.id;

    const album = alb_id ? search.included?.find((inc: any) => inc.type === 'albums' && inc.id === alb_id) : undefined;
    const artist = art_id
      ? search.included?.find((inc: any) => inc.type === 'artists' && inc.id === art_id)
      : undefined;

    return {
      ...res,
      album,
      artist,
    };
  });
