import { createGeoScoreParser, type GeoScoreData } from "./geoScore";

export type GeoSportsData = GeoScoreData;

export const geoSportsParser = createGeoScoreParser("geosports", "GeoSports");
