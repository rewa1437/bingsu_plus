import React, { useMemo, useState, useEffect } from 'react';
import { 
  HiUsers, 
  HiKey, 
  HiDesktopComputer, 
  HiBookOpen, 
  HiUserGroup,
  HiExclamationCircle,
  HiQuestionMarkCircle,
  HiTrendingUp,
  HiArrowUp,
  HiArrowDown,
  HiSparkles,
  HiLightningBolt,
  HiClock,
  HiCheckCircle,
  HiXCircle,
  HiFire,
  HiLink,
  HiGlobe
} from 'react-icons/hi';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { botListRaw } from '../data/botsData';
import { knowledgeListRaw } from '../data/knowledgeData';

// Mock data for dashboard metrics
const mockDashboardData = {
  // Overall stats - All filter
  totalBots: 17,
  totalKnowledge: 18,
  totalUsers: 23,
  usersExpiringSoon: 9,
  usersPendingApproval: 18,
  dailyUsers: {
    today: 16,
    yesterday: 14,
    change: 14.3
  },
  tokenUsage: {
    today: 2458934,
    yesterday: 2312456,
    change: 6.3
  },
  // 7 days data for charts
  dailyUsersChart: [
    { date: '6 วันก่อน', users: 12 },
    { date: '5 วันก่อน', users: 13 },
    { date: '4 วันก่อน', users: 14 },
    { date: '3 วันก่อน', users: 15 },
    { date: '2 วันก่อน', users: 15 },
    { date: 'เมื่อวาน', users: 14 },
    { date: 'วันนี้', users: 16 }
  ],
  tokenUsageChart: [
    { date: '6 วันก่อน', tokens: 2100456 },
    { date: '5 วันก่อน', tokens: 2156789 },
    { date: '4 วันก่อน', tokens: 2234567 },
    { date: '3 วันก่อน', tokens: 2289123 },
    { date: '2 วันก่อน', tokens: 2298765 },
    { date: 'เมื่อวาน', tokens: 2312456 },
    { date: 'วันนี้', tokens: 2458934 }
  ],
  frequentlyAskedQuestions: [
    { type: 'คำถามเกี่ยวกับบอท', count: 342, percentage: 28.5 },
    { type: 'คำถามเกี่ยวกับการใช้งาน', count: 298, percentage: 24.8 },
    { type: 'คำถามเกี่ยวกับการชำระเงิน', count: 187, percentage: 15.6 },
    { type: 'คำถามเกี่ยวกับบัญชี', count: 156, percentage: 13.0 },
    { type: 'คำถามเกี่ยวกับเทคนิค', count: 134, percentage: 11.2 },
    { type: 'คำถามอื่นๆ', count: 83, percentage: 6.9 }
  ],
  userRoleDistribution: [
    { role: 'ผู้ใช้งาน', count: 28 },
    { role: 'รอดำเนินการ', count: 15 },
    { role: 'ผู้ดูแล', count: 5 },
    { role: 'แอดมิน', count: 2 }
  ],
  hourlyActivity: [
    { hour: '00:00', users: 45, tokens: 89000 },
    { hour: '04:00', users: 32, tokens: 67000 },
    { hour: '08:00', users: 156, tokens: 320000 },
    { hour: '12:00', users: 289, tokens: 580000 },
    { hour: '16:00', users: 312, tokens: 640000 },
    { hour: '20:00', users: 198, tokens: 410000 }
  ],
  botKnowledgeAccuracy: {
    overallAccuracy: 94.1,
    totalQuestions: 4052,
    knowledgeMatches: 3828,
    nonKnowledgeAnswers: 224,
    averageResponseTime: '1.2s',
    improvement: 2.3
  },
  botIntegrations: {
    totalIntegrationLines: 15,
    totalWidgets: 8
  },
  systemStatus: {
    api: { status: 'healthy', uptime: '99.9%', responseTime: '120ms' },
    database: { status: 'healthy', uptime: '99.8%', responseTime: '45ms' },
    storage: { status: 'healthy', usage: '68%', available: '320GB' },
    ai: { status: 'healthy', uptime: '99.7%', responseTime: '250ms', model: 'GPT-4', requests: 12456 },
    ocr: { status: 'healthy', uptime: '99.6%', responseTime: '180ms', processed: 8934, accuracy: '96.8%' },
    server: { status: 'healthy', uptime: '99.95%', cpu: '45%', memory: '62%', disk: '68%' }
  },
  weekComparison: {
    users: { thisWeek: 8721, lastWeek: 8234, change: 5.9 },
    tokens: { thisWeek: 17234567, lastWeek: 16123456, change: 6.9 },
    interactions: { thisWeek: 12456, lastWeek: 11890, change: 4.8 }
  },
  // User-specific data
  userData: {
    totalBots: 17,
    totalKnowledge: 18,
    totalUsers: 23,
    totalGroups: 5,
    usersExpiringSoon: 9,
    usersPendingApproval: 18,
    dailyUsers: {
      today: 856,
      yesterday: 812,
      change: 5.4
    },
    tokenUsage: {
      today: 1823456,
      yesterday: 1712345,
      change: 6.5
    },
    dailyUsersChart: [
      { date: '6 วันก่อน', users: 12 },
      { date: '5 วันก่อน', users: 13 },
      { date: '4 วันก่อน', users: 14 },
      { date: '3 วันก่อน', users: 15 },
      { date: '2 วันก่อน', users: 15 },
      { date: 'เมื่อวาน', users: 14 },
      { date: 'วันนี้', users: 16 }
    ],
    tokenUsageChart: [
      { date: '6 วันก่อน', tokens: 1567890 },
      { date: '5 วันก่อน', tokens: 1612345 },
      { date: '4 วันก่อน', tokens: 1678901 },
      { date: '3 วันก่อน', tokens: 1701234 },
      { date: '2 วันก่อน', tokens: 1695678 },
      { date: 'เมื่อวาน', tokens: 1712345 },
      { date: 'วันนี้', tokens: 1823456 }
    ]
  },
  // System-specific data
  systemData: {
    totalBots: 17,
    totalKnowledge: 18,
    totalUsers: 23,
    usersExpiringSoon: 9,
    usersPendingApproval: 18,
    dailyUsers: {
      today: 16,
      yesterday: 14,
      change: 14.3
    },
    tokenUsage: {
      today: 635478,
      yesterday: 600111,
      change: 5.9
    },
    dailyUsersChart: [
      { date: '6 วันก่อน', users: 367 },
      { date: '5 วันก่อน', users: 372 },
      { date: '4 วันก่อน', users: 377 },
      { date: '3 วันก่อน', users: 378 },
      { date: '2 วันก่อน', users: 380 },
      { date: 'เมื่อวาน', users: 377 },
      { date: 'วันนี้', users: 391 }
    ],
    tokenUsageChart: [
      { date: '6 วันก่อน', tokens: 532567 },
      { date: '5 วันก่อน', tokens: 544444 },
      { date: '4 วันก่อน', tokens: 555666 },
      { date: '3 วันก่อน', tokens: 588777 },
      { date: '2 วันก่อน', tokens: 602087 },
      { date: 'เมื่อวาน', tokens: 600111 },
      { date: 'วันนี้', tokens: 635478 }
    ]
  }
};

const COLORS = ['#F5C200', '#F5D547', '#F0A500', '#8B8680', '#A89A91', '#6B6560'];
const GRADIENT_COLORS = {
  sandy: ['#F5C200', '#8B8680'],
  gold: ['#F5C200', '#8B8680'],
  tan: ['#F5C200', '#8B8680'],
  warmgray: ['#F5C200', '#8B8680'],
  light: ['#F5C200', '#8B8680'],
  pale: ['#F5C200', '#8B8680']
};

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const startValue = 0;
    const endValue = value;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      
      setCount(currentCount);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{count.toLocaleString('th-TH')}</span>;
};

// Sparkline Component
const Sparkline = ({ data, color = '#3B82F6', height = 40 }) => {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#gradient-${color})`}
      />
    </svg>
  );
};

function Dashboard({ users = [], groups = [] }) {
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState('system'); // 'all', 'user', 'system'
  const dailyUsersChartRef = React.useRef(null);
  const tokenUsageChartRef = React.useRef(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToChart = (ref) => {
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Calculate metrics from existing data
  const metrics = useMemo(() => {
    // Use users props if available, otherwise fall back to empty array
    const userList = users && users.length > 0 ? users : [];
    const groupList = groups && groups.length > 0 ? groups : [];
    
    // Calculate actual user statistics from userList
    const totalUsers = userList.filter(user => user.roleType === 'user' && user.isEnabled).length;
    const usersPendingApproval = userList.filter(user => user.roleType === 'pending').length;
    const usersInactivated = userList.filter(user => user.roleType === 'user' && !user.isEnabled).length;
    
    // Calculate users expiring soon (within 7 days)
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    const usersExpiringSoon = userList.filter(user => {
      if (!user.expiresAt || user.expiresAt === '-') return false;
      const dateStr = user.expiresAt;
      const monthMap = {
        'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2, 'เมษายน': 3,
        'พฤษภาคม': 4, 'มิถุนายน': 5, 'กรกฎาคม': 6, 'สิงหาคม': 7,
        'กันยายน': 8, 'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11
      };
      
      const parts = dateStr.split(' ');
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = monthMap[parts[1]];
        const year = parseInt(parts[2]) - 543;
        
        if (month !== undefined && !isNaN(day) && !isNaN(year)) {
          const expireDate = new Date(year, month, day);
          return expireDate >= today && expireDate <= sevenDaysFromNow;
        }
      }
      return false;
    }).length;
    
    // Count total accounts (all roles)
    const totalAccounts = userList.length;
    
    // Count user role accounts
    const userRoleCount = userList.filter(user => user.roleType === 'user').length;

    // Get values from mock data based on filter
    let mockData;
    if (filter === 'user') {
      mockData = mockDashboardData.userData;
    } else if (filter === 'system') {
      mockData = mockDashboardData.systemData;
    } else {
      mockData = mockDashboardData;
    }

    const totalBots = mockData.totalBots;
    const totalKnowledge = mockData.totalKnowledge;
    const totalGroups = groupList.length; // Calculate from actual groups array
    const totalIntegrationLines = mockDashboardData.botIntegrations.totalIntegrationLines;
    const totalWidgets = mockDashboardData.botIntegrations.totalWidgets;

    // Filter data based on selected filter
    let dailyUsers, tokenUsage, dailyUsersChart, tokenUsageChart;
    
    if (filter === 'user') {
      dailyUsers = mockDashboardData.userData.dailyUsers;
      tokenUsage = mockDashboardData.userData.tokenUsage;
      dailyUsersChart = mockDashboardData.userData.dailyUsersChart;
      tokenUsageChart = mockDashboardData.userData.tokenUsageChart;
    } else if (filter === 'system') {
      dailyUsers = mockDashboardData.systemData.dailyUsers;
      tokenUsage = mockDashboardData.systemData.tokenUsage;
      dailyUsersChart = mockDashboardData.systemData.dailyUsersChart;
      tokenUsageChart = mockDashboardData.systemData.tokenUsageChart;
    } else {
      dailyUsers = mockDashboardData.dailyUsers;
      tokenUsage = mockDashboardData.tokenUsage;
      dailyUsersChart = mockDashboardData.dailyUsersChart;
      tokenUsageChart = mockDashboardData.tokenUsageChart;
    }

    return {
      totalBots,
      totalKnowledge,
      totalUsers,
      totalAccounts,
      userRoleCount,
      totalGroups,
      totalIntegrationLines,
      totalWidgets,
      usersExpiringSoon,
      usersPendingApproval,
      usersInactivated,
      dailyUsers,
      tokenUsage,
      dailyUsersChart,
      tokenUsageChart,
      frequentlyAskedQuestions: mockDashboardData.frequentlyAskedQuestions,
      userRoleDistribution: mockDashboardData.userRoleDistribution,
      hourlyActivity: mockDashboardData.hourlyActivity,
      botKnowledgeAccuracy: mockDashboardData.botKnowledgeAccuracy,
      systemStatus: mockDashboardData.systemStatus,
      weekComparison: mockDashboardData.weekComparison
    };
  }, [filter, users, groups]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    change, 
    changeType, 
    subtitle, 
    iconColor = 'bg-[#F5C200]',
    gradient = ['#3B82F6', '#1D4ED8'],
    sparklineData,
    delay = 0,
    onCardClick = null,
    bgColor = 'bg-white'
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        className={`${bgColor} rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: `${delay}ms` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onCardClick}
      >
        <div className="relative overflow-hidden">
          {/* Solid Color Background */}
          <div 
            className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-500"
            style={{ 
              background: gradient[0],
              transform: isHovered ? 'scale(1.5)' : 'scale(1)'
            }}
          />
          
          <div className="relative">
            {/* Icon + Title Section */}
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="rounded-lg p-2 transition-all duration-300"
                style={{ background: gradient[0] }}
              >
                <Icon className="text-white text-lg" />
              </div>
              <p className="text-base font-bold text-gray-800">{title}</p>
            </div>
            
            {/* Value Section */}
            <div className="ml-10">
              <p className="text-4xl font-bold text-gray-900 mb-2">
                <AnimatedCounter value={value} />
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
              )}
              {change !== undefined && (
                <div className={`flex items-center gap-1 ${changeType === 'up' ? 'text-[#F5C200]' : 'text-[#8B8680]'}`}>
                  {changeType === 'up' ? (
                    <HiArrowUp className="text-sm" />
                  ) : (
                    <HiArrowDown className="text-sm" />
                  )}
                  <span className="text-sm font-semibold">{Math.abs(change)}%</span>
                  <span className="text-sm text-gray-500 ml-1">จากเมื่อวาน</span>
                </div>
              )}
            </div>
            
            {/* Sparkline */}
            {sparklineData && (
              <div className="mt-4 h-12">
                <Sparkline 
                  data={sparklineData} 
                  color={gradient[0]}
                  height={48}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-xl">
          <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('th-TH') : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full p-6 min-h-screen">
      {/* Header with Animation */}
      <div className={`mb-8 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#8B8680] rounded-xl p-3 shadow-lg">
              <HiSparkles className="text-white text-3xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#8B8680]">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">ภาพรวมระบบและสถิติการใช้งานแบบ Real-time</p>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                filter === 'all'
                  ? 'bg-[#8B8680] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilter('user')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                filter === 'user'
                  ? 'bg-[#8B8680] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiUsers className="inline mr-1" />
              User
            </button>
            <button
              onClick={() => setFilter('system')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                filter === 'system'
                  ? 'bg-[#8B8680] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiDesktopComputer className="inline mr-1" />
              System
            </button>
          </div>
        </div>
      </div>

      {/* Main Statistics Grid - Hide when System filter */}
      {filter !== 'system' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {/* User Accounts Consolidated Card */}
        <div 
          className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '0ms' }}
        >
          <div className="relative overflow-hidden">
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-500"
              style={{ 
                background: `#F5C200`,
                transform: 'scale(1)'
              }}
            />
            <div className="relative">
              {/* Title with Icon */}
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="rounded-lg p-2"
                  style={{ background: `#F5C200` }}
                >
                  <HiUsers className="text-white text-lg" />
                </div>
                <h3 className="text-base font-bold text-gray-800">บัญชี User</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="text-xs text-gray-600">บัญชีทั้งหมด</span>
                  <span className="text-xl font-bold text-gray-900">
                    <AnimatedCounter value={metrics.totalAccounts} />
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="text-xs text-gray-600">ผู้ใช้งาน</span>
                  <span className="text-xl font-bold text-[#8B8680]">
                    <AnimatedCounter value={metrics.userRoleCount} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">รอดำเนินการ</span>
                  <span className="text-xl font-bold text-[#F5C200]">
                    <AnimatedCounter value={metrics.usersPendingApproval} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Status Consolidated Card */}
        <div 
          className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '100ms' }}
        >
          <div className="relative overflow-hidden">
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-500"
              style={{ 
                background: `#8B8680`,
                transform: 'scale(1)'
              }}
            />
            <div className="relative">
              {/* Title with Icon */}
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="rounded-lg p-2"
                  style={{ background: `#8B8680` }}
                >
                  <HiExclamationCircle className="text-white text-lg" />
                </div>
                <h3 className="text-base font-bold text-gray-800">สถานะ User</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="text-xs text-gray-600">หมดอายุใน 7 วัน</span>
                  <span className="text-xl font-bold text-[#8B8680]">
                    <AnimatedCounter value={metrics.usersExpiringSoon} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">ถูก Inactivate</span>
                  <span className="text-xl font-bold text-gray-600">
                    <AnimatedCounter value={metrics.usersInactivated} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <StatCard
          title="จำนวนผู้ใช้เว็บไซต์ BingSu ต่อวัน"
          value={metrics.dailyUsers.today}
          icon={HiUsers}
          change={metrics.dailyUsers.change}
          changeType="up"
          subtitle="ผู้ใช้ที่ใช้งานวันนี้"
          iconColor="bg-[#F5C200]"
          gradient={GRADIENT_COLORS.sandy}
          sparklineData={metrics.dailyUsersChart.map(d => d.users)}
          delay={200}
          bgColor="bg-white"
          onCardClick={() => scrollToChart(dailyUsersChartRef)}
        />
        <StatCard
          title="ยอดใช้งาน Token วันนี้"
          value={metrics.tokenUsage.today}
          icon={HiKey}
          change={metrics.tokenUsage.change}
          changeType="up"
          subtitle="Token ที่ใช้ไปทั้งหมด"
          iconColor="bg-[#8B8680]"
          gradient={['#8B8680', '#8B8680']}
          sparklineData={metrics.tokenUsageChart.map(d => d.tokens / 10000)}
          bgColor="bg-white"
          delay={300}
          onCardClick={() => scrollToChart(tokenUsageChartRef)}
        />
        {/* Combined Bot and Knowledge Card */}
        <div 
          className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          <div className="relative overflow-hidden">
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-500"
              style={{ 
                background: `#F5C200`,
                transform: 'scale(1)'
              }}
            />
            <div className="relative">
              {/* Title with Icon */}
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="rounded-lg p-2"
                  style={{ background: `#F5C200` }}
                >
                  <HiDesktopComputer className="text-white text-lg" />
                </div>
                <h3 className="text-base font-bold text-gray-800">จำนวน Bot & Knowledge</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiDesktopComputer className="text-[#8B8680] text-base" />
                    <span className="text-xs text-gray-600">Bot ทั้งหมด</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    <AnimatedCounter value={metrics.totalBots} />
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiBookOpen className="text-[#F5C200] text-base" />
                    <span className="text-xs text-gray-600">Knowledge Base</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    <AnimatedCounter value={metrics.totalKnowledge} />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Card */}
        <div 
          className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '500ms' }}
        >
          <div className="relative overflow-hidden">
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-500"
              style={{ 
                background: `#8B8680`,
                transform: 'scale(1)'
              }}
            />
            <div className="relative">
              {/* Title with Icon */}
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="rounded-lg p-2"
                  style={{ background: `#8B8680` }}
                >
                  <HiLink className="text-white text-lg" />
                </div>
                <h3 className="text-base font-bold text-gray-800">Integration</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiLink className="text-[#8B8680] text-base" />
                    <span className="text-xs text-gray-600">Integration Line</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    <AnimatedCounter value={metrics.totalIntegrationLines} />
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiGlobe className="text-[#F5C200] text-base" />
                    <span className="text-xs text-gray-600">Widget</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    <AnimatedCounter value={metrics.totalWidgets} />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <StatCard
          title="จำนวน Group"
          value={metrics.totalGroups}
          icon={HiUserGroup}
          subtitle="Group ทั้งหมด"
          iconColor="bg-[#F5C200]"
          gradient={GRADIENT_COLORS.pale}
          delay={600}
          bgColor="bg-white"
        />
      </div>
      )}

      {/* Charts Section with Enhanced Design - Hide when System filter */}
      {filter !== 'system' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Users Line Chart */}
        <div 
          ref={dailyUsersChartRef}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#F5C200] rounded-xl p-3 shadow-lg">
                <HiUsers className="text-white text-2xl" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">แนวโน้มผู้ใช้งานรายวัน</h3>
                <p className="text-sm text-gray-600">7 วันล่าสุด</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#F2E9DA] px-3 py-1 rounded-full">
              <HiTrendingUp className="text-[#8B8680]" />
              <span className="text-sm font-semibold text-[#8B8680]">+{metrics.dailyUsers.change}%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={metrics.dailyUsersChart}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5C200" stopOpacity={1}/>
                  <stop offset="95%" stopColor="#F5C200" stopOpacity={1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                style={{ fontSize: '12px', fontWeight: '500' }}
                tickLine={false}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px', fontWeight: '500' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="users" 
                name="จำนวนผู้ใช้"
                stroke="#B8A878" 
                strokeWidth={3}
                dot={{ fill: '#B8A878', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, stroke: '#B8A878', strokeWidth: 2 }}
                fill="url(#colorUsers)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Token Usage Area Chart */}
        <div 
          ref={tokenUsageChartRef}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#F5C200] rounded-xl p-3 shadow-lg">
                <HiKey className="text-white text-2xl" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">การใช้ Token รายวัน</h3>
                <p className="text-sm text-gray-600">7 วันล่าสุด</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#F2E9DA] px-3 py-1 rounded-full">
              <HiLightningBolt className="text-[#8B8680]" />
              <span className="text-sm font-semibold text-[#8B8680]">+{metrics.tokenUsage.change}%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={metrics.tokenUsageChart}>
              <defs>
                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5C200" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#F5C200" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                style={{ fontSize: '12px', fontWeight: '500' }}
                tickLine={false}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px', fontWeight: '500' }}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="tokens" 
                name="Token"
                stroke="#F5C200" 
                fillOpacity={1}
                fill="url(#colorTokens)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* Additional Charts Section - Hide when System filter */}
      {filter !== 'system' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Role Distribution Pie Chart */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#F5C200] rounded-xl p-3 shadow-lg">
              <HiUserGroup className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">การกระจายบทบาทผู้ใช้</h3>
              <p className="text-sm text-gray-600">จำนวนผู้ใช้ตามบทบาท</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={metrics.userRoleDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ role, percent }) => `${role}\n${(percent * 100).toFixed(0)}%`}
                outerRadius={110}
                fill="#8884d8"
                dataKey="count"
                animationBegin={0}
                animationDuration={800}
              >
                {metrics.userRoleDistribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Frequently Asked Questions Bar Chart */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#F5C200] rounded-xl p-3 shadow-lg">
              <HiQuestionMarkCircle className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">ประเภทคำถามที่พบบ่อย</h3>
              <p className="text-sm text-gray-600">จำนวนคำถามตามประเภท</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart 
              data={metrics.frequentlyAskedQuestions}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#F5C200" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#F5C200" stopOpacity={1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
              <XAxis 
                type="number" 
                stroke="#6B7280" 
                style={{ fontSize: '12px', fontWeight: '500' }} 
                tickLine={false}
                domain={[0, 'dataMax']}
              />
              <YAxis 
                dataKey="type" 
                type="category" 
                stroke="#6B7280"
                style={{ fontSize: '12px', fontWeight: '500' }}
                width={140}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                name="จำนวนคำถาม"
                fill="url(#barGradient)"
                radius={[0, 8, 8, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* Hourly Activity Chart - Hide when System filter */}
      {filter !== 'system' && (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#F5C200] rounded-xl p-3 shadow-lg">
            <HiLightningBolt className="text-white text-2xl" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">กิจกรรมรายชั่วโมง</h3>
            <p className="text-sm text-gray-600">การใช้งานตามช่วงเวลา</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.hourlyActivity}>
            <defs>
              <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5C200" stopOpacity={1}/>
                <stop offset="95%" stopColor="#F5C200" stopOpacity={1}/>
              </linearGradient>
              <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B8680" stopOpacity={1}/>
                <stop offset="95%" stopColor="#8B8680" stopOpacity={1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
            <XAxis 
              dataKey="hour" 
              stroke="#6B7280"
              style={{ fontSize: '12px', fontWeight: '500' }}
              tickLine={false}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px', fontWeight: '500' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="users" 
              name="จำนวนผู้ใช้"
              fill="url(#userGradient)"
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="tokens" 
              name="Token (÷1000)"
              fill="url(#tokenGradient)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* System Status & Week Comparison */}
      <div className={`grid gap-6 mb-8 ${filter === 'system' ? 'grid-cols-1' : filter !== 'user' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* System Status - Only show when not User filter */}
        {filter !== 'user' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#10B981] rounded-xl p-3 shadow-lg">
              <HiCheckCircle className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">สถานะระบบ</h3>
              <p className="text-sm text-gray-600">System Health</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">API Status</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-[#059669]">Healthy</span>
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Uptime: {metrics.systemStatus.api.uptime}</p>
                <p>Response Time: {metrics.systemStatus.api.responseTime}</p>
              </div>
            </div>
            <div className="p-4 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Database</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-[#059669]">Healthy</span>
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Uptime: {metrics.systemStatus.database.uptime}</p>
                <p>Response Time: {metrics.systemStatus.database.responseTime}</p>
              </div>
            </div>
            <div className="p-4 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Storage</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-[#059669]">Healthy</span>
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Usage: {metrics.systemStatus.storage.usage}</p>
                <p>Available: {metrics.systemStatus.storage.available}</p>
              </div>
            </div>
            
            {/* AI Status */}
            <div className="p-4 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">AI Service</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-[#059669]">Healthy</span>
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Uptime: {metrics.systemStatus.ai.uptime}</p>
                <p>Response Time: {metrics.systemStatus.ai.responseTime}</p>
                <p>Model: {metrics.systemStatus.ai.model}</p>
                <p>Requests Today: {metrics.systemStatus.ai.requests.toLocaleString('th-TH')}</p>
              </div>
            </div>
            
            {/* OCR Status */}
            <div className="p-4 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">OCR Service</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-[#059669]">Healthy</span>
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Uptime: {metrics.systemStatus.ocr.uptime}</p>
                <p>Response Time: {metrics.systemStatus.ocr.responseTime}</p>
                <p>Processed Today: {metrics.systemStatus.ocr.processed.toLocaleString('th-TH')}</p>
                <p>Accuracy: {metrics.systemStatus.ocr.accuracy}</p>
              </div>
            </div>
            
            {/* Server Status */}
            <div className="p-4 bg-[#F0FDF4] rounded-xl border border-[#D1FAE5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Server</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-[#059669]">Healthy</span>
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Uptime: {metrics.systemStatus.server.uptime}</p>
                <p>CPU Usage: {metrics.systemStatus.server.cpu}</p>
                <p>Memory Usage: {metrics.systemStatus.server.memory}</p>
                <p>Disk Usage: {metrics.systemStatus.server.disk}</p>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Week Comparison - Hide when System filter */}
        {filter !== 'system' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#F5C200] rounded-xl p-3 shadow-lg">
              <HiTrendingUp className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">เปรียบเทียบรายสัปดาห์</h3>
              <p className="text-sm text-gray-600">Week over Week</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-[#FFFAF0] rounded-xl border border-[#F5E5B8]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">ผู้ใช้</span>
                <span className="flex items-center gap-1 text-[#F5C200]">
                  <HiArrowUp className="text-sm" />
                  <span className="text-sm font-bold">+{metrics.weekComparison.users.change}%</span>
                </span>
              </div>
              <div className="text-xs text-gray-600">
                <p>สัปดาห์นี้: {metrics.weekComparison.users.thisWeek.toLocaleString('th-TH')}</p>
                <p>สัปดาห์ที่แล้ว: {metrics.weekComparison.users.lastWeek.toLocaleString('th-TH')}</p>
              </div>
            </div>
            <div className="p-4 bg-[#FFFAF0] rounded-xl border border-[#F5E5B8]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Token</span>
                <span className="flex items-center gap-1 text-[#F5C200]">
                  <HiArrowUp className="text-sm" />
                  <span className="text-sm font-bold">+{metrics.weekComparison.tokens.change}%</span>
                </span>
              </div>
              <div className="text-xs text-gray-600">
                <p>สัปดาห์นี้: {(metrics.weekComparison.tokens.thisWeek / 1000000).toFixed(1)}M</p>
                <p>สัปดาห์ที่แล้ว: {(metrics.weekComparison.tokens.lastWeek / 1000000).toFixed(1)}M</p>
              </div>
            </div>
            <div className="p-4 bg-[#FFFAF0] rounded-xl border border-[#F5E5B8]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Interactions</span>
                <span className="flex items-center gap-1 text-[#F5C200]">
                  <HiArrowUp className="text-sm" />
                  <span className="text-sm font-bold">+{metrics.weekComparison.interactions.change}%</span>
                </span>
              </div>
              <div className="text-xs text-gray-600">
                <p>สัปดาห์นี้: {metrics.weekComparison.interactions.thisWeek.toLocaleString('th-TH')}</p>
                <p>สัปดาห์ที่แล้ว: {metrics.weekComparison.interactions.lastWeek.toLocaleString('th-TH')}</p>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Bot Knowledge Accuracy */}
      <div className="grid gap-6 mb-8 items-stretch grid-cols-1">
        {/* Bot Knowledge Accuracy - Hide when System filter */}
        {filter !== 'system' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6 flex-shrink-0">
            <div className="bg-[#F5C200] rounded-xl p-3 shadow-lg">
              <HiFire className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">ความแม่นยำของ Bot</h3>
              <p className="text-sm text-gray-600">Bot Knowledge Accuracy (รวมทั้งหมด)</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {/* Overall Accuracy Display */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-[#F5C200] shadow-2xl mb-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">{metrics.botKnowledgeAccuracy.overallAccuracy}%</p>
                  <p className="text-xs text-[#F3EBDD] mt-1">ความแม่นยำ</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <HiTrendingUp className="text-[#8B8680]" />
                <span className="text-sm font-semibold text-[#8B8680]">+{metrics.botKnowledgeAccuracy.improvement}%</span>
                <span className="text-sm text-gray-500">จากเดือนที่แล้ว</span>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-[#FFFAF0] rounded-xl border border-[#F5E5B8]">
                <p className="text-xs text-gray-600 mb-1">คำถามทั้งหมด</p>
                <p className="text-xl font-bold text-gray-900">{metrics.botKnowledgeAccuracy.totalQuestions.toLocaleString('th-TH')}</p>
              </div>
              <div className="p-4 bg-[#FFFAF0] rounded-xl border border-[#F5E5B8]">
                <p className="text-xs text-gray-600 mb-1">ตอบจาก Knowledge</p>
                <p className="text-xl font-bold text-[#10B981]">{metrics.botKnowledgeAccuracy.knowledgeMatches.toLocaleString('th-TH')}</p>
              </div>
              <div className="p-4 bg-[#FFFAF0] rounded-xl border border-[#F5E5B8]">
                <p className="text-xs text-gray-600 mb-1">ไม่ได้ตอบจาก Knowledge</p>
                <p className="text-xl font-bold text-red-600">{metrics.botKnowledgeAccuracy.nonKnowledgeAnswers.toLocaleString('th-TH')}</p>
              </div>
              <div className="p-4 bg-[#FFFAF0] rounded-xl border border-[#F5E5B8]">
                <p className="text-xs text-gray-600 mb-1">เวลาตอบเฉลี่ย</p>
                <p className="text-xl font-bold text-[#F5C200]">{metrics.botKnowledgeAccuracy.averageResponseTime}</p>
              </div>
            </div>

            {/* Accuracy Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">ความแม่นยำจาก Knowledge</span>
                <span className="font-bold text-[#8B8680]">{metrics.botKnowledgeAccuracy.overallAccuracy}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-[#F5C200] h-4 rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                  style={{ width: `${metrics.botKnowledgeAccuracy.overallAccuracy}%` }}
                >
                  <span className="text-xs font-semibold text-white">{metrics.botKnowledgeAccuracy.overallAccuracy}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                <span>ตอบจาก Knowledge: {metrics.botKnowledgeAccuracy.knowledgeMatches.toLocaleString('th-TH')} ({metrics.botKnowledgeAccuracy.overallAccuracy}%)</span>
                <span>ไม่ได้ตอบ: {metrics.botKnowledgeAccuracy.nonKnowledgeAnswers.toLocaleString('th-TH')} ({((metrics.botKnowledgeAccuracy.nonKnowledgeAnswers / metrics.botKnowledgeAccuracy.totalQuestions) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;

