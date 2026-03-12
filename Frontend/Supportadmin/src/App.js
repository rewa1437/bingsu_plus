import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Bots from './pages/Bots';
import BotDetail from './pages/BotDetail';
import Knowledge from './pages/knowledge';
import KnowledgeDetail from './pages/KnowledgeDetail';
import NotFound from './pages/NotFound';
import SupportPanel from './pages/SupportPanel';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import NotificationBell from './components/NotificationBell';
import { supportUsersRaw } from './data/supportUsersData';

function AppLayout({ userRole, setUserRole, users, groups, setUsers, setGroups }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-white relative">
      <Navbar onCollapseChange={setIsSidebarCollapsed} userRole={userRole} onRoleChange={(role) => {
        setUserRole(role);
        window.userRole = role;
      }} />
      {/* Main Content */}
      <main className={`flex-1 bg-white px-8 py-6 overflow-auto flex flex-col transition-all duration-300 relative ${isSidebarCollapsed ? 'pl-16' : ''}`}>
        <div className="absolute top-6 right-8 z-[120]">
          <NotificationBell users={users} />
        </div>
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  const [userRole, setUserRole] = useState('support'); // 'admin' or 'support'
  const [users, setUsers] = useState(supportUsersRaw);
  const [groups, setGroups] = useState([
    { id: 1, name: 'พพอ.', description: 'กลุ่มงานหลัก', avatar: 'พ', members: [3, 6] },
    { id: 2, name: 'บิงชู', description: 'กลุ่มฝ่ายขาย', avatar: 'บ', members: [8, 10] },
    { id: 3, name: 'ถั่วแระ', description: 'กลุ่มดูแลลูกค้า', avatar: 'ถ', members: [14, 16, 18, 21] },
    { id: 4, name: 'อชจ.', description: 'กลุ่มทดสอบระบบ', avatar: 'อ', members: [23, 24, 27] },
    { id: 5, name: 'บักอะ', description: 'กลุ่มสำรอง', avatar: 'บ', members: [29, 30, 33] }
  ]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth" element={<Login />} />
        <Route
          element={(
            <AppLayout
              userRole={userRole}
              setUserRole={setUserRole}
              users={users}
              groups={groups}
              setUsers={setUsers}
              setGroups={setGroups}
            />
          )}
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard users={users} groups={groups} userRole={userRole} />} />
          <Route path="/homepage" element={<Home />} />
          <Route path="/home" element={<Navigate to="/homepage" replace />} />
          <Route path="/bots" element={<Bots userRole={userRole} />} />
          <Route path="/bots/:id" element={<BotDetail />} />
          <Route path="/knowledge" element={<Knowledge userRole={userRole} />} />
          <Route path="/knowledge/:id/add-data" element={<KnowledgeDetail />} />
          <Route path="/support-panel" element={<SupportPanel users={users} setUsers={setUsers} groups={groups} setGroups={setGroups} />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
