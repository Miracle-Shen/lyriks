import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HiOutlineMenu } from 'react-icons/hi';
import { RiCloseLine } from 'react-icons/ri';
import { logo } from '../assets';
import { links } from '../assets/constants';

// 导航链接列表组件
const NavLinks = (handleClick) => (
  <div className="mt-10">
    {/* 遍历导航数据生成链接 */}
    {links.map((item) => (
      <NavLink
        key={item.name} // 唯一标识，优化列表渲染
        className="flex flex-row justify-start items-center my-8 text-sm font-medium text-gray-400 hover:text-cyan-400"
        to={item.to} // 目标路由路径
        onClick={() => handleClick && handleClick()}
      >
       <item.icon className="w-6 h-6 mr-2" />
        {item.name}
      </NavLink>
    ))}
  </div>
);

// 侧边栏组件
const Sidebar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* 移动端菜单控制器（中等屏幕以下显示） */}
      <div className="absolute block top-6 right-3">
        {/* 根据菜单状态切换图标 */}
        {mobileMenuOpen ? (
          <RiCloseLine
            className="w-6 h-6 text-white"
            onClick={() => setMobileMenuOpen(false)} // 关闭菜单
          />
        ) : (
          <HiOutlineMenu className="w-6 h-6 text-white"
          onClick={() => setMobileMenuOpen(true)} />
        )}
      </div>

      <div className={`absolute top-0 h-screen w-2/3 
        bg-gradient-to-tl from-white/10 to-[#483d8b] 
        backdrop-blur-lg z-10 p-6
        smooth-transition ${mobileMenuOpen ? 'left-0' : '-left-full'}`}
      >
        <img src={logo} alt="logo" className="w-full h-14 object-contain" />
        <NavLinks handleClick={() => setMobileMenuOpen(false)} />
      </div>
    </>
  );
};

export default Sidebar;