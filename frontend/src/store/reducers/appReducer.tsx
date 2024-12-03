import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    isDsfrReady: false
  },
  reducers: {
    setDsfrReady: (state) => {
      state.isDsfrReady = true;
    }
  }
});

export default appSlice;
