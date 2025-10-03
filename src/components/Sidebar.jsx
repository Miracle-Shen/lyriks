import { useState } from 'react';
import { links } from '..assets/constant';
const NavLinks = () => (
  <div className="mt-10">
    {links.map((item) => (
      <NavLink>
        {item.name}
      </NavLink>
    ))}
  </div>
);

const Sidebar = () => (
  <div>Sidebar</div>
);

export default Sidebar;
