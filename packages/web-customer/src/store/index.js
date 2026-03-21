import { configureStore } from '@reduxjs/toolkit';
import authReducer        from './slices/authSlice.js';
import profileReducer     from './slices/profileSlice.js';
import restaurantsReducer from './slices/restaurantsSlice.js';
import cartReducer        from './slices/cartSlice.js';
import walletReducer      from './slices/walletSlice.js';

export const store = configureStore({
  reducer: {
    auth:        authReducer,
    profile:     profileReducer,
    restaurants: restaurantsReducer,
    cart:        cartReducer,
    wallet:      walletReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export default store;
