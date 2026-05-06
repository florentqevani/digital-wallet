import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar';

export default function AppShell() {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="app-content">
                <Outlet />
            </div>
        </div>
    );
}
