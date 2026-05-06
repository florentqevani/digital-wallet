import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar';

export default function AppShell() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="app-layout">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
            <div className="app-content">
                <Outlet />
            </div>
        </div>
    );
}
