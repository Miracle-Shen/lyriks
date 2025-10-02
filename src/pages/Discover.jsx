import { Error, Loader, SongCard } from '../components'; // 导入错误、加载和歌曲卡片组件
import { genres } from '../assets/constants'; // 导入音乐流派数据
import { useGetTopChartsQuery } from '../redux/services/shazamCore'; // 导入获取热门歌曲的API Hook
import { useDispatch, useSelector } from 'react-redux'; // 导入Redux的dispatch和selector Hook
/* import { isPlaying, activeSong } from '../redux/features/playerSlice'; // 注释：导入播放器状态相关action
 */

// Discover页面组件定义
const Discover = () => {
    const dispatch = useDispatch(); // 获取dispatch函数用于触发Redux action
/*     const { isPlaying, activeSong } = useSelector((state) => state.player); // 注释：从Redux store中获取播放器状态
 */
    const genreTitle = 'DZ';
   const { data, isLoading, isError } = useGetTopChartsQuery(genreTitle); // 传入国家代码如'DZ'(阿尔及利亚)

    console.log("reponse:", JSON.stringify(data,null,2)); // 打印API返回数据用于调试

    // 安全处理数据：确保songs始终是数组
    const songs = Array.isArray(data) ? data : (data?.tracks ?? []);

    if (isLoading) return <Loader title="Loading songs..." />;
    
    if (isError) return <Error />;
    
    return (
        // 主容器：垂直flex布局，元素间距为2
        <div className='flex flex-col gap-2'>
            <div className='w-full flex flex-col gap-2'>
                <h2 className='font-bold text-3xl text-white'>Discover</h2>
                
                {/* 音乐流派选择下拉框 */}
                <select 
                    onChange={(e) => {
                         setSelectedGenre(e.target.value);
                        console.log('Selected genre:', e.target.value); // 打印选中的流派值
                    }}
                    value={selectedGenre} // 当前选中的值（空字符串）
                    className='bg-black text-gray-300 rounded-lg p-3 outline-none' // 样式类名
                >
                    {genres.map((genre) => 
                        <option key={genre.value} value={genre.value}>{genre.title}</option>
                    )}
                </select>
            </div>
            
            {/* 歌曲列表区域 */}
            <div className='flex flex-col gap-2'>  
                {/* 遍历歌曲数组渲染每个歌曲卡片 */}
                {songs.map((song, i) => (
                    <SongCard
                        song={song} // 传递当前歌曲数据
                      /*   isPlaying={isPlaying} // 传递播放状态（当前为undefined）
                        activeSong={activeSong} // 传递当前播放歌曲（当前为undefined）
                        data={songs} // 传递完整歌曲列表 */
                        key={i} // 使用索引作为key（建议使用歌曲唯一ID）
                    />
                ))}
            </div>  
        </div>
    );
}

// 导出Discover组件
export default Discover;
