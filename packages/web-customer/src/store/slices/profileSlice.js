import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.js';

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const updateProfile = createAsyncThunk('profile/update', async (formData, { rejectWithValue }) => {
  try {
    const res = await api.put('/users/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data || { message: 'Update failed' }); }
});

export const changePassword = createAsyncThunk('profile/changePassword', async (data, { rejectWithValue }) => {
  try {
    const res = await api.put('/users/me/password', data);
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data || { message: 'Password change failed' }); }
});

export const fetchAddresses = createAsyncThunk('profile/fetchAddresses', async (_, { rejectWithValue }) => {
  try { return (await api.get('/users/me/addresses')).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const addAddress = createAsyncThunk('profile/addAddress', async (data, { rejectWithValue }) => {
  try { return (await api.post('/users/me/addresses', data)).data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'Failed to add address' }); }
});

export const updateAddress = createAsyncThunk('profile/updateAddress', async ({ id, data }, { rejectWithValue }) => {
  try { return (await api.put(`/users/me/addresses/${id}`, data)).data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'Failed to update address' }); }
});

export const deleteAddress = createAsyncThunk('profile/deleteAddress', async (id, { rejectWithValue }) => {
  try { return (await api.delete(`/users/me/addresses/${id}`)).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const setDefaultAddress = createAsyncThunk('profile/setDefault', async (id, { rejectWithValue }) => {
  try { return (await api.patch(`/users/me/addresses/${id}/default`)).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const updateNotifPrefs = createAsyncThunk('profile/notifPrefs', async (data, { rejectWithValue }) => {
  try { return (await api.put('/users/me/notification-prefs', data)).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const deleteAccount = createAsyncThunk('profile/delete', async (_, { rejectWithValue }) => {
  try { return (await api.delete('/users/me')).data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// ─── Slice ────────────────────────────────────────────────────────────────────
const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    addresses:  [],
    isLoading:  false,
    error:      null,
    successMsg: null,
  },
  reducers: {
    clearProfileError:   s => { s.error = null; },
    clearProfileSuccess: s => { s.successMsg = null; },
  },
  extraReducers: b => {
    const pend = s => { s.isLoading = true; s.error = null; s.successMsg = null; };
    const fail = (s, a) => { s.isLoading = false; s.error = a.payload; };

    b
      .addCase(fetchAddresses.pending,  pend)
      .addCase(fetchAddresses.fulfilled,(s, a) => { s.isLoading = false; s.addresses = a.payload.addresses; })
      .addCase(fetchAddresses.rejected, fail)

      .addCase(addAddress.pending,  pend)
      .addCase(addAddress.fulfilled,(s, a) => { s.isLoading = false; s.addresses = a.payload.addresses; s.successMsg = 'Address added'; })
      .addCase(addAddress.rejected, fail)

      .addCase(updateAddress.pending,  pend)
      .addCase(updateAddress.fulfilled,(s, a) => { s.isLoading = false; s.addresses = a.payload.addresses; s.successMsg = 'Address updated'; })
      .addCase(updateAddress.rejected, fail)

      .addCase(deleteAddress.pending,  pend)
      .addCase(deleteAddress.fulfilled,(s, a) => { s.isLoading = false; s.addresses = a.payload.addresses; })
      .addCase(deleteAddress.rejected, fail)

      .addCase(setDefaultAddress.fulfilled,(s, a) => { s.addresses = a.payload.addresses; })

      .addCase(changePassword.pending,  pend)
      .addCase(changePassword.fulfilled, s => { s.isLoading = false; s.successMsg = 'Password changed successfully'; })
      .addCase(changePassword.rejected,  fail)

      .addCase(updateNotifPrefs.pending,  pend)
      .addCase(updateNotifPrefs.fulfilled, s => { s.isLoading = false; s.successMsg = 'Preferences saved'; })
      .addCase(updateNotifPrefs.rejected,  fail)

      .addCase(updateProfile.pending,  pend)
      .addCase(updateProfile.fulfilled, s => { s.isLoading = false; s.successMsg = 'Profile updated'; })
      .addCase(updateProfile.rejected,  fail);
  },
});

export const { clearProfileError, clearProfileSuccess } = profileSlice.actions;
export default profileSlice.reducer;
