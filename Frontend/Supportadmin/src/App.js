import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Bots from './pages/Bots';
import Knowledge from './pages/knowledge';
import SupportPanel from './pages/SupportPanel';
import Navbar from './components/Navbar';

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Router>
      <div className="flex h-screen bg-white relative">
        <Navbar onCollapseChange={setIsSidebarCollapsed} />
        {/* Main Content */}
        <main className={`flex-1 bg-white px-8 py-6 overflow-auto flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'pl-16' : ''}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/homepage" replace />} />
            <Route path="/homepage" element={<Home />} />
            <Route path="/home" element={<Navigate to="/homepage" replace />} />
            <Route path="/bots" element={<Bots />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/support-panel" element={<SupportPanel />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
