// src/features/user/userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import willService from '../../services/willService';
import { showToastMessage } from '../common/uiSlice';

// 로그인
export const loginUser = createAsyncThunk(
  'user/loginUser',
  async ({ username, password }, { dispatch, rejectWithValue }) => {
    try {
      const response = await willService.loginUser({ username, password });

      const { userId } = response.data;
      sessionStorage.setItem('username', username);
      sessionStorage.setItem('userId', userId);

      dispatch(
        showToastMessage({
          message: `환영합니다, ${username}님!`,
          status: 'success',
        })
      );

      return { username, userId };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || '로그인에 실패했습니다.';

      dispatch(
        showToastMessage({
          message: errorMessage,
          status: 'error',
        })
      );

      return rejectWithValue(errorMessage);
    }
  }
);

// 회원가입
export const registerUser = createAsyncThunk(
  'user/registerUser',
  async (userData, { dispatch, rejectWithValue }) => {
    try {
      const response = await willService.registerUser(userData);

      dispatch(
        showToastMessage({
          message: '회원가입이 완료되었습니다. 로그인해주세요!',
          status: 'success',
        })
      );

      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || '회원가입에 실패했습니다.';

      dispatch(
        showToastMessage({
          message: errorMessage,
          status: 'error',
        })
      );

      return rejectWithValue(errorMessage);
    }
  }
);

// 로그아웃
export const logoutUser = createAsyncThunk(
  'user/logoutUser',
  async (_, { dispatch }) => {
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userId');

    dispatch(
      showToastMessage({
        message: '성공적으로 로그아웃되었습니다.',
        status: 'success',
      })
    );
    return;
  }
);

// 초기 상태
const initialState = {
  username: sessionStorage.getItem('username') || null,
  userId: sessionStorage.getItem('userId') || null,
  loading: false,
  error: null,
};

// 슬라이스
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 로그인
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.username = action.payload.username;
        state.userId = action.payload.userId;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 회원가입
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 로그아웃
      .addCase(logoutUser.fulfilled, (state) => {
        state.username = null;
        state.userId = null;
      });
  },
});

export const { clearUserError } = userSlice.actions;
export default userSlice.reducer;
