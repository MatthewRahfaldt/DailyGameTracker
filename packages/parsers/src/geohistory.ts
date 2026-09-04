import { createGeoScoreParser, type GeoScoreData } from "./geoScore";

export type GeoHistoryData = GeoScoreData;

export const geoHistoryParser = createGeoScoreParser("geohistory", "GeoHistory");
