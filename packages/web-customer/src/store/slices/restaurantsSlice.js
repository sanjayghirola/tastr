import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.js';

export const fetchRestaurants = createAsyncThunk('restaurants/fetch', async (params = {}, { rejectWithValue }) => {
  try { return (await api.get('/restaurants', { params })).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchRestaurant = createAsyncThunk('restaurants/fetchOne', async (id, { rejectWithValue }) => {
  try { return (await api.get(`/restaurants/${id}`)).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchMenu = createAsyncThunk('restaurants/fetchMenu', async (id, { rejectWithValue }) => {
  try { return (await api.get(`/restaurants/${id}/menu`)).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchBanners = createAsyncThunk('restaurants/banners', async (type = 'hero', { rejectWithValue }) => {
  try { return (await api.get('/banners', { params: { type } })).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchCategories = createAsyncThunk('restaurants/categories', async (_, { rejectWithValue }) => {
  try { return (await api.get('/categories/cuisine')).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchSearch = createAsyncThunk('restaurants/search', async (params, { rejectWithValue }) => {
  try { return (await api.get('/search', { params })).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchRecentSearches = createAsyncThunk('restaurants/recentSearches', async (_, { rejectWithValue }) => {
  try { return (await api.get('/search/recent')).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const deleteRecentSearch = createAsyncThunk('restaurants/deleteSearch', async (query, { rejectWithValue }) => {
  try { await api.delete(`/search/recent/${encodeURIComponent(query)}`); return query; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

const restaurantsSlice = createSlice({
  name: 'restaurants',
  initialState: {
    list:           [],
    pagination:     null,
    current:        null,
    menu:           [],
    banners:        [],
    categories:     [],
    searchResults:  { restaurants: [], dishes: [] },
    recentSearches: [],
    isLoading:      false,
    isMenuLoading:  false,
    isSearching:    false,
    error:          null,
    userLocation:   null,
  },
  reducers: {
    setUserLocation: (s, a) => { s.userLocation = a.payload; },
    appendRestaurants: (s, a) => { s.list = [...s.list, ...a.payload.restaurants]; s.pagination = a.payload.pagination; },
    clearSearch: s => { s.searchResults = { restaurants: [], dishes: [] }; },
  },
  extraReducers: b => {
    b
      .addCase(fetchRestaurants.pending,  s => { s.isLoading = true; })
      .addCase(fetchRestaurants.fulfilled,(s, a) => { s.isLoading = false; s.list = a.payload.restaurants; s.pagination = a.payload.pagination; })
      .addCase(fetchRestaurants.rejected, s => { s.isLoading = false; })

      .addCase(fetchRestaurant.pending,  s => { s.isLoading = true; s.current = null; })
      .addCase(fetchRestaurant.fulfilled,(s, a) => { s.isLoading = false; s.current = a.payload.restaurant; })
      .addCase(fetchRestaurant.rejected, s => { s.isLoading = false; })

      .addCase(fetchMenu.pending,  s => { s.isMenuLoading = true; })
      .addCase(fetchMenu.fulfilled,(s, a) => { s.isMenuLoading = false; s.menu = a.payload.menu; })
      .addCase(fetchMenu.rejected, s => { s.isMenuLoading = false; })

      .addCase(fetchBanners.fulfilled,   (s, a) => { s.banners = a.payload.banners; })
      .addCase(fetchCategories.fulfilled,(s, a) => { s.categories = a.payload.categories; })

      .addCase(fetchSearch.pending,   s => { s.isSearching = true; })
      .addCase(fetchSearch.fulfilled, (s, a) => { s.isSearching = false; s.searchResults = { restaurants: a.payload.restaurants, dishes: a.payload.dishes }; })
      .addCase(fetchSearch.rejected,  s => { s.isSearching = false; })

      .addCase(fetchRecentSearches.fulfilled, (s, a) => { s.recentSearches = a.payload.searches; })
      .addCase(deleteRecentSearch.fulfilled,  (s, a) => { s.recentSearches = s.recentSearches.filter(s => s.query !== a.payload); });
  },
});

export const { setUserLocation, appendRestaurants, clearSearch } = restaurantsSlice.actions;
export default restaurantsSlice.reducer;
