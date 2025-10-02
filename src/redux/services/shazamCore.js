/* import {createApi,fetchBaseQuery} from '@reduxjs/toolkit/query/react'

export const shazamCoreApi = createApi({
  reducerPath:'shazamCoreApi',
  baseQuery:fetchBaseQuery({
    baseUrl:'https://shazam-core.p.rapidapi.com/v1',
    prepareHeaders:(headers)=>{headers.set('x-rapidapi-key','d3dbeb9abemsh102b151bb4c8e8ap153197jsn631752ee02e6')
    headers.set('x-rapidapi-host','shazam-core.p.rapidapi.com')
  return headers;
},
  }),
  endpoints:(builder)=>({
    getTopCharts:builder.query({query:()=>'/charts/world'}),
  })
});

export const {useGetTopChartsQuery} = shazamCoreApi; */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';


export const shazamCoreApi = createApi({
  reducerPath: 'shazamCoreApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://shazam-core.p.rapidapi.com/v1',
    prepareHeaders: (headers) => {
      headers.set('X-RapidAPI-Key', 'd3dbeb9abemsh102b151bb4c8e8ap153197jsn631752ee02e6');
      headers.set('x-rapidapi-host','shazam-core.p.rapidapi.com')
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getTopCharts: builder.query({ query: (countryCode) => `/charts/world?country_code=${countryCode}` }),
    getSongsByGenre: builder.query({ query:( genre ) => `/charts/genre-world?genre_code=${genre}` }),
    getSongDetails: builder.query({ query:({ songid }) => `/tracks/details?track_id=${songid}` }),
    getSongRelated: builder.query({ query:({ songid }) => `/tracks/related?track_id=${songid}` }),
    getArtistDetails: builder.query({ query:( artistId ) => `/artists/details?artist_id=${artistId}` }),
    getSongsByCountry: builder.query({ query:( countryCode ) => `/charts/country?country_code=${countryCode}` }),
    getSongsBySearch: builder.query({ query:( searchTerm ) => `/search/multi?search_type=SONGS_ARTISTS&query=${searchTerm}` }),
  }),
});

export const {
  useGetTopChartsQuery,
  useGetSongsByGenreQuery,
  useGetSongDetailsQuery,
  useGetSongRelatedQuery,
  useGetArtistDetailsQuery,
  useGetSongsByCountryQuery,
  useGetSongsBySearchQuery,
} = shazamCoreApi;