// 导入 Redux Toolkit 的 createSlice 函数，用于创建 Redux slice
import { createSlice } from '@reduxjs/toolkit';

// 定义播放器的初始状态
const initialState = {
  currentSongs: [],      // 当前播放列表，存储所有歌曲的数组
  currentIndex: 0,       // 当前播放歌曲在列表中的索引位置
  isActive: false,       // 播放器是否激活（是否有歌曲被选中）
  isPlaying: false,      // 是否正在播放音乐
  activeSong: {},        // 当前活跃的歌曲对象
  genreListId: 'DZ',       // 选中的音乐类型ID（如：流行、摇滚等）
};

// 创建播放器 slice，包含状态和操作
const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    // 设置当前活跃的歌曲
    setActiveSong: (state, action) => {
      // 设置当前播放的歌曲
      state.activeSong = action.payload.song;

      // 根据不同API返回的数据结构，设置播放列表
      // 情况1：搜索结果格式 - data.tracks.hits
      if (action.payload?.data?.tracks?.hits) {
        state.currentSongs = action.payload.data.tracks.hits;
      } 
      // 情况2：专辑/播放列表格式 - data.tracks
      else if (action.payload?.data?.properties) {
        state.currentSongs = action.payload?.data?.tracks;
      } 
      // 情况3：直接数据格式
      else {
        state.currentSongs = action.payload.data;
      }

      // 设置当前歌曲在列表中的位置
      state.currentIndex = action.payload.i;
      // 激活播放器
      state.isActive = true;
    },

    // 切换到下一首歌曲
    nextSong: (state, action) => {
      // 检查歌曲数据结构，有些API返回的歌曲在track属性中
      if (state.currentSongs[action.payload]?.track) {
        state.activeSong = state.currentSongs[action.payload]?.track;
      } else {
        // 直接使用歌曲对象
        state.activeSong = state.currentSongs[action.payload];
      }

      // 更新当前歌曲索引
      state.currentIndex = action.payload;
      // 确保播放器处于激活状态
      state.isActive = true;
    },

    // 切换到上一首歌曲
    prevSong: (state, action) => {
      // 与 nextSong 逻辑相同，处理不同的歌曲数据结构
      if (state.currentSongs[action.payload]?.track) {
        state.activeSong = state.currentSongs[action.payload]?.track;
      } else {
        state.activeSong = state.currentSongs[action.payload];
      }

      // 更新当前歌曲索引
      state.currentIndex = action.payload;
      // 确保播放器处于激活状态
      state.isActive = true;
    },

    // 播放/暂停切换
    playPause: (state, action) => {
      // 直接设置播放状态，true为播放，false为暂停
      state.isPlaying = action.payload;
    },

    // 选择音乐类型
    selectGenreListId: (state, action) => {
      // 设置当前选中的音乐类型ID
      state.genreListId = action.payload;
    },
  },
});

// 导出所有的 action creators（动作创建函数）
// 这些函数用于在组件中触发状态更新
export const { setActiveSong, nextSong, prevSong, playPause, selectGenreListId } = playerSlice.actions;

// 导出 reducer，用于 Redux store 配置
export default playerSlice.reducer;