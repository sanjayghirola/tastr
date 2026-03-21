import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.js';

export const fetchPendingRestaurants = createAsyncThunk('admin/pendingRestaurants', async (params = {}, { rejectWithValue }) => {
  try { return (await api.get('/admin/restaurants/pending', { params })).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const updateRestaurantStatus = createAsyncThunk('admin/updateRestaurant', async ({ id, status, reason }, { rejectWithValue }) => {
  try { return (await api.patch(`/admin/restaurants/${id}/status`, { status, reason })).data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'Failed to update status' }); }
});

export const fetchPendingDrivers = createAsyncThunk('admin/pendingDrivers', async (params = {}, { rejectWithValue }) => {
  try { return (await api.get('/admin/drivers/pending', { params })).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const updateDriverStatus = createAsyncThunk('admin/updateDriver', async ({ id, status, reason }, { rejectWithValue }) => {
  try { return (await api.patch(`/admin/drivers/${id}/status`, { status, reason })).data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'Failed to update status' }); }
});

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    pendingRestaurants: [], restaurantPagination: null,
    pendingDrivers:     [], driverPagination:     null,
    isLoading: false,
    error: null,
  },
  reducers: { clearAdminError: s => { s.error = null; } },
  extraReducers: b => {
    b
      .addCase(fetchPendingRestaurants.pending,   s => { s.isLoading = true; })
      .addCase(fetchPendingRestaurants.fulfilled, (s, a) => { s.isLoading = false; s.pendingRestaurants = a.payload.restaurants; s.restaurantPagination = a.payload.pagination; })
      .addCase(fetchPendingRestaurants.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; })

      .addCase(updateRestaurantStatus.fulfilled, (s, a) => {
        s.pendingRestaurants = s.pendingRestaurants.filter(r => r._id !== a.payload.restaurant._id);
      })

      .addCase(fetchPendingDrivers.pending,   s => { s.isLoading = true; })
      .addCase(fetchPendingDrivers.fulfilled, (s, a) => { s.isLoading = false; s.pendingDrivers = a.payload.drivers; s.driverPagination = a.payload.pagination; })
      .addCase(fetchPendingDrivers.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; })

      .addCase(updateDriverStatus.fulfilled, (s, a) => {
        s.pendingDrivers = s.pendingDrivers.filter(d => d._id !== a.payload.driver._id);
      });
  },
});

export const { clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;
