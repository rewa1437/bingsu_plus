import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Bots from './pages/Bots';
import BotDetail from './pages/BotDetail';
import Knowledge from './pages/knowledge';
import KnowledgeDetail from './pages/KnowledgeDetail';
import SupportPanel from './pages/SupportPanel';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import NotificationBell from './components/NotificationBell';
import { supportUsersRaw } from './data/supportUsersData';

function AppContent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState(supportUsersRaw);
  const location = useLocation();
  const isLoginPage = location.pathname === '/login' || location.pathname === '/auth';

  if (isLoginPage) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-white relative">
      <Navbar onCollapseChange={setIsSidebarCollapsed} />
      {/* Main Content */}
      <main className={`flex-1 bg-white px-8 py-6 overflow-auto flex flex-col transition-all duration-300 relative ${isSidebarCollapsed ? 'pl-16' : ''}`}>
        <div className="absolute top-6 right-8 z-[120]">
          <NotificationBell users={users} />
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/homepage" replace />} />
          <Route path="/homepage" element={<Home />} />
          <Route path="/home" element={<Navigate to="/homepage" replace />} />
          <Route path="/bots" element={<Bots />} />
          <Route path="/bots/:id" element={<BotDetail />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/knowledge/:id/add-data" element={<KnowledgeDetail />} />
          <Route path="/support-panel" element={<SupportPanel users={users} setUsers={setUsers} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth" element={<Login />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
