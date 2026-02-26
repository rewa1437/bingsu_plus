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
  HiChat,
  HiBell,
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
import { supportUsersRaw } from '../data/supportUsersData';

// Mock data for dashboard metrics
const mockDashboardData = {
  dailyUsers: {
    today: 1247,
    yesterday: 1189,
    change: 4.9
  },
  tokenUsage: {
    today: 2458934,
    yesterday: 2312456,
    change: 6.3
  },
  // 7 days data for charts
  dailyUsersChart: [
    { date: '6 วันก่อน', users: 1123 },
    { date: '5 วันก่อน', users: 1156 },
    { date: '4 วันก่อน', users: 1189 },
    { date: '3 วันก่อน', users: 1201 },
    { date: '2 วันก่อน', users: 1198 },
    { date: 'เมื่อวาน', users: 1189 },
    { date: 'วันนี้', users: 1247 }
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
  recentActivities: [
    { id: 1, type: 'bot_created', message: 'Bot "Customer Support Bot" ถูกสร้างโดย วิชัย เทคโน', time: '2 นาทีที่แล้ว', icon: HiDesktopComputer, color: 'text-blue-600' },
    { id: 2, type: 'user_registered', message: 'ผู้ใช้ใหม่: สมชาย วงศ์ใหญ่ ลงทะเบียน', time: '15 นาทีที่แล้ว', icon: HiUsers, color: 'text-green-600' },
    { id: 3, type: 'knowledge_updated', message: 'Knowledge Base "Customer Service Guide" ถูกอัปเดต', time: '1 ชั่วโมงที่แล้ว', icon: HiBookOpen, color: 'text-purple-600' },
    { id: 4, type: 'high_usage', message: 'Token usage สูงกว่าค่าเฉลี่ย 20%', time: '2 ชั่วโมงที่แล้ว', icon: HiKey, color: 'text-orange-600' },
    { id: 5, type: 'bot_enabled', message: 'Bot "Sales Assistant" ถูกเปิดใช้งาน', time: '3 ชั่วโมงที่แล้ว', icon: HiCheckCircle, color: 'text-green-600' },
    { id: 6, type: 'bot_disabled', message: 'Bot "Travel Guide" ถูกปิดใช้งานโดย รัชนี ผู้บริหาร', time: '4 ชั่วโมงที่แล้ว', icon: HiXCircle, color: 'text-red-600' },
    { id: 7, type: 'knowledge_created', message: 'Knowledge Base "API Documentation" ถูกสร้างโดย ประยุทธ์ มั่นคง', time: '5 ชั่วโมงที่แล้ว', icon: HiBookOpen, color: 'text-purple-600' },
    { id: 8, type: 'user_updated', message: 'ข้อมูลผู้ใช้ "สุภาพร น้อยหน่า" ถูกอัปเดต', time: '6 ชั่วโมงที่แล้ว', icon: HiUsers, color: 'text-blue-600' },
    { id: 9, type: 'bot_updated', message: 'Bot "Tech Support Pro" ถูกอัปเดตการตั้งค่า', time: '7 ชั่วโมงที่แล้ว', icon: HiDesktopComputer, color: 'text-blue-600' },
    { id: 10, type: 'high_interaction', message: 'Bot "FAQ Assistant" มีการโต้ตอบสูงสุดวันนี้: 756 ครั้ง', time: '8 ชั่วโมงที่แล้ว', icon: HiChat, color: 'text-indigo-600' },
    { id: 11, type: 'user_expired', message: 'บัญชีผู้ใช้ "กนกวรรณ ใจดี" หมดอายุแล้ว', time: '9 ชั่วโมงที่แล้ว', icon: HiExclamationCircle, color: 'text-red-600' },
    { id: 12, type: 'knowledge_deleted', message: 'Knowledge Base "Old Training Materials" ถูกลบโดย ชนิดา แสงทอง', time: '10 ชั่วโมงที่แล้ว', icon: HiBookOpen, color: 'text-red-600' },
    { id: 13, type: 'system_backup', message: 'ระบบสำรองข้อมูลสำเร็จ - 2.4 GB', time: '11 ชั่วโมงที่แล้ว', icon: HiCheckCircle, color: 'text-green-600' },
    { id: 14, type: 'user_role_changed', message: 'บทบาทของ "ชาญชัย สมบูรณ์" เปลี่ยนเป็น "ผู้ดูแล"', time: '12 ชั่วโมงที่แล้ว', icon: HiUserGroup, color: 'text-orange-600' },
    { id: 15, type: 'bot_performance', message: 'Bot "Product Info Bot" มีอัตราความสำเร็จ 95.2% วันนี้', time: '13 ชั่วโมงที่แล้ว', icon: HiTrendingUp, color: 'text-green-600' }
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
    totalGroups: 24,
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
      { date: '6 วันก่อน', users: 756 },
      { date: '5 วันก่อน', users: 789 },
      { date: '4 วันก่อน', users: 812 },
      { date: '3 วันก่อน', users: 823 },
      { date: '2 วันก่อน', users: 818 },
      { date: 'เมื่อวาน', users: 812 },
      { date: 'วันนี้', users: 856 }
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
    dailyUsers: {
      today: 391,
      yesterday: 377,
      change: 3.7
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

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
const GRADIENT_COLORS = {
  blue: ['#3B82F6', '#1D4ED8'],
  purple: ['#8B5CF6', '#6D28D9'],
  green: ['#10B981', '#059669'],
  orange: ['#F59E0B', '#D97706'],
  indigo: ['#6366F1', '#4F46E5'],
  red: ['#EF4444', '#DC2626']
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

function Dashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'user', 'system'

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Calculate metrics from existing data
  const metrics = useMemo(() => {
    const totalBots = botListRaw.length;
    const totalKnowledge = knowledgeListRaw.length;
    const totalUsers = supportUsersRaw.length;
    
    // Calculate users expiring soon (within 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const usersExpiringSoon = supportUsersRaw.filter(user => {
      if (!user.expiresAt) return false;
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
          return expireDate >= today && expireDate <= thirtyDaysFromNow;
        }
      }
      return false;
    }).length;

    // Calculate users pending approval
    const usersPendingApproval = supportUsersRaw.filter(user => user.roleType === 'pending').length;

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

    const totalGroups = filter !== 'system' ? mockDashboardData.userData.totalGroups : null;
    const totalIntegrationLines = mockDashboardData.botIntegrations.totalIntegrationLines;
    const totalWidgets = mockDashboardData.botIntegrations.totalWidgets;

    return {
      totalBots,
      totalKnowledge,
      totalUsers,
      totalGroups,
      totalIntegrationLines,
      totalWidgets,
      usersExpiringSoon,
      usersPendingApproval,
      dailyUsers,
      tokenUsage,
      dailyUsersChart,
      tokenUsageChart,
      frequentlyAskedQuestions: mockDashboardData.frequentlyAskedQuestions,
      userRoleDistribution: mockDashboardData.userRoleDistribution,
      hourlyActivity: mockDashboardData.hourlyActivity,
      recentActivities: mockDashboardData.recentActivities,
      botKnowledgeAccuracy: mockDashboardData.botKnowledgeAccuracy,
      systemStatus: mockDashboardData.systemStatus,
      weekComparison: mockDashboardData.weekComparison
    };
  }, [filter]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    change, 
    changeType, 
    subtitle, 
    iconColor = 'bg-blue-500',
    gradient = ['#3B82F6', '#1D4ED8'],
    sparklineData,
    delay = 0
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: `${delay}ms` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative overflow-hidden">
          {/* Gradient Background */}
          <div 
            className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-500"
            style={{ 
              background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
              transform: isHovered ? 'scale(1.5)' : 'scale(1)'
            }}
          />
          
          <div className="relative flex items-start justify-between">
            <div className="flex-1 z-10">
              <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
              <p className="text-4xl font-bold text-gray-900 mb-2">
                <AnimatedCounter value={value} />
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
              )}
              {change !== undefined && (
                <div className={`flex items-center gap-1 ${changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {changeType === 'up' ? (
                    <HiArrowUp className="text-sm" />
                  ) : (
                    <HiArrowDown className="text-sm" />
                  )}
                  <span className="text-sm font-semibold">{Math.abs(change)}%</span>
                  <span className="text-xs text-gray-500 ml-1">จากเมื่อวาน</span>
                </div>
              )}
            </div>
            <div 
              className={`${iconColor} rounded-xl p-4 shadow-lg transform transition-all duration-300 ${
                isHovered ? 'scale-110 rotate-3' : 'scale-100'
              }`}
              style={{
                background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
              }}
            >
              <Icon className="text-white text-3xl" />
            </div>
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
    <div className="w-full h-full  p-6 min-h-screen">
      {/* Header with Animation */}
      <div className={`mb-8 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-3 shadow-lg">
              <HiSparkles className="text-white text-3xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">ภาพรวมระบบและสถิติการใช้งานแบบ Real-time</p>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-lg border border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilter('user')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                filter === 'user'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
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
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
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
        <StatCard
          title="จำนวนผู้ใช้ต่อวัน"
          value={metrics.dailyUsers.today}
          icon={HiUsers}
          change={metrics.dailyUsers.change}
          changeType="up"
          subtitle="ผู้ใช้ที่ใช้งานวันนี้"
          iconColor="bg-blue-500"
          gradient={GRADIENT_COLORS.blue}
          sparklineData={metrics.dailyUsersChart.map(d => d.users)}
          delay={0}
        />
        <StatCard
          title="ยอดใช้งาน Token วันนี้"
          value={metrics.tokenUsage.today}
          icon={HiKey}
          change={metrics.tokenUsage.change}
          changeType="up"
          subtitle="Token ที่ใช้ไปทั้งหมด"
          iconColor="bg-purple-500"
          gradient={GRADIENT_COLORS.purple}
          sparklineData={metrics.tokenUsageChart.map(d => d.tokens / 10000)}
          delay={100}
        />
        {/* Combined Bot and Knowledge Card */}
        <div 
          className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          <div className="relative overflow-hidden">
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-500"
              style={{ 
                background: `linear-gradient(135deg, ${GRADIENT_COLORS.green[0]}, ${GRADIENT_COLORS.green[1]})`,
                transform: 'scale(1)'
              }}
            />
            <div className="relative flex items-start justify-between">
              <div className="flex-1 z-10">
                <p className="text-sm font-medium text-gray-600 mb-2">จำนวน Bot & Knowledge</p>
                <div className="space-y-2 mb-2">
                  <div className="flex items-center gap-3">
                    <HiDesktopComputer className="text-green-600 text-xl" />
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        <AnimatedCounter value={metrics.totalBots} />
                      </p>
                      <p className="text-xs text-gray-500">Bot ทั้งหมดในระบบ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <HiBookOpen className="text-orange-600 text-xl" />
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        <AnimatedCounter value={metrics.totalKnowledge} />
                      </p>
                      <p className="text-xs text-gray-500">Knowledge Base ทั้งหมด</p>
                    </div>
                  </div>
                </div>
              </div>
              <div 
                className="bg-green-500 rounded-xl p-4 shadow-lg transform transition-all duration-300 scale-100"
                style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS.green[0]}, ${GRADIENT_COLORS.green[1]})` }}
              >
                <HiDesktopComputer className="text-white text-3xl" />
              </div>
            </div>
          </div>
        </div>
        {/* Integration Card */}
        <div 
          className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          <div className="relative overflow-hidden">
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-500"
              style={{ 
                background: `linear-gradient(135deg, ${GRADIENT_COLORS.indigo[0]}, ${GRADIENT_COLORS.indigo[1]})`,
                transform: 'scale(1)'
              }}
            />
            <div className="relative flex items-start justify-between">
              <div className="flex-1 z-10">
                <p className="text-sm font-medium text-gray-600 mb-2">Integration</p>
                <div className="space-y-2 mb-2">
                  <div className="flex items-center gap-3">
                    <HiLink className="text-blue-600 text-xl" />
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        <AnimatedCounter value={metrics.totalIntegrationLines} />
                      </p>
                      <p className="text-xs text-gray-500">Integration Line ที่เชื่อมต่อ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <HiGlobe className="text-purple-600 text-xl" />
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        <AnimatedCounter value={metrics.totalWidgets} />
                      </p>
                      <p className="text-xs text-gray-500">Widget ที่เชื่อมต่อ</p>
                    </div>
                  </div>
                </div>
              </div>
              <div 
                className="bg-indigo-500 rounded-xl p-4 shadow-lg transform transition-all duration-300 scale-100"
                style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS.indigo[0]}, ${GRADIENT_COLORS.indigo[1]})` }}
              >
                <HiLink className="text-white text-3xl" />
              </div>
            </div>
          </div>
        </div>
        <StatCard
          title="จำนวน User"
          value={metrics.totalUsers}
          icon={HiUserGroup}
          subtitle="ผู้ใช้งานทั้งหมด"
          iconColor="bg-indigo-500"
          gradient={GRADIENT_COLORS.indigo}
          delay={400}
        />
        <StatCard
          title="User ที่ใกล้หมดอายุ"
          value={metrics.usersExpiringSoon}
          icon={HiExclamationCircle}
          subtitle="หมดอายุภายใน 30 วัน"
          iconColor="bg-red-500"
          gradient={GRADIENT_COLORS.red}
          delay={500}
        />
        {/* Group Card - Show for All and User filter */}
        {filter !== 'system' && metrics.totalGroups !== null && (
        <StatCard
          title="จำนวน Group"
          value={metrics.totalGroups}
          icon={HiUserGroup}
          subtitle="Group ทั้งหมด"
          iconColor="bg-teal-500"
          gradient={['#14B8A6', '#0D9488']}
          delay={600}
        />
        )}
        {/* Users Pending Approval Card - Show for All and User filter */}
        {filter !== 'system' && (
        <StatCard
          title="User ที่รอ Approve"
          value={metrics.usersPendingApproval}
          icon={HiClock}
          subtitle="รอการอนุมัติ"
          iconColor="bg-amber-500"
          gradient={['#F59E0B', '#D97706']}
          delay={700}
        />
        )}
      </div>
      )}

      {/* Charts Section with Enhanced Design - Hide when System filter */}
      {filter !== 'system' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Users Line Chart */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 shadow-lg">
                <HiUsers className="text-white text-2xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">แนวโน้มผู้ใช้งานรายวัน</h3>
                <p className="text-xs text-gray-600">7 วันล่าสุด</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
              <HiTrendingUp className="text-green-600" />
              <span className="text-sm font-semibold text-green-600">+{metrics.dailyUsers.change}%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={metrics.dailyUsersChart}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
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
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                fill="url(#colorUsers)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Token Usage Area Chart */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 shadow-lg">
                <HiKey className="text-white text-2xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">การใช้ Token รายวัน</h3>
                <p className="text-xs text-gray-600">7 วันล่าสุด</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full">
              <HiLightningBolt className="text-purple-600" />
              <span className="text-sm font-semibold text-purple-600">+{metrics.tokenUsage.change}%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={metrics.tokenUsageChart}>
              <defs>
                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
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
                stroke="#8B5CF6" 
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
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-3 shadow-lg">
              <HiUserGroup className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">การกระจายบทบาทผู้ใช้</h3>
              <p className="text-xs text-gray-600">จำนวนผู้ใช้ตามบทบาท</p>
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
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-3 shadow-lg">
              <HiQuestionMarkCircle className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">ประเภทคำถามที่พบบ่อย</h3>
              <p className="text-xs text-gray-600">จำนวนคำถามตามประเภท</p>
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
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity={1}/>
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
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 shadow-lg">
            <HiLightningBolt className="text-white text-2xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">กิจกรรมรายชั่วโมง</h3>
            <p className="text-xs text-gray-600">การใช้งานตามช่วงเวลา</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.hourlyActivity}>
            <defs>
              <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.2}/>
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
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 shadow-lg">
              <HiCheckCircle className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">สถานะระบบ</h3>
              <p className="text-xs text-gray-600">System Health</p>
            </div>
          </div>
          <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: 'calc(3 * (120px + 16px))' }}>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">API Status</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-green-600">Healthy</span>
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Uptime: {metrics.systemStatus.api.uptime}</p>
                <p>Response Time: {metrics.systemStatus.api.responseTime}</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Database</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-green-600">Healthy</span>
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Uptime: {metrics.systemStatus.database.uptime}</p>
                <p>Response Time: {metrics.systemStatus.database.responseTime}</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Storage</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-green-600">Healthy</span>
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Usage: {metrics.systemStatus.storage.usage}</p>
                <p>Available: {metrics.systemStatus.storage.available}</p>
              </div>
            </div>
            
            {/* AI Status */}
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">AI Service</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-green-600">Healthy</span>
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
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">OCR Service</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-green-600">Healthy</span>
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
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Server</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-green-600">Healthy</span>
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
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 shadow-lg">
              <HiTrendingUp className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">เปรียบเทียบรายสัปดาห์</h3>
              <p className="text-xs text-gray-600">Week over Week</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">ผู้ใช้</span>
                <span className="flex items-center gap-1 text-green-600">
                  <HiArrowUp className="text-sm" />
                  <span className="text-sm font-bold">+{metrics.weekComparison.users.change}%</span>
                </span>
              </div>
              <div className="text-xs text-gray-600">
                <p>สัปดาห์นี้: {metrics.weekComparison.users.thisWeek.toLocaleString('th-TH')}</p>
                <p>สัปดาห์ที่แล้ว: {metrics.weekComparison.users.lastWeek.toLocaleString('th-TH')}</p>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Token</span>
                <span className="flex items-center gap-1 text-green-600">
                  <HiArrowUp className="text-sm" />
                  <span className="text-sm font-bold">+{metrics.weekComparison.tokens.change}%</span>
                </span>
              </div>
              <div className="text-xs text-gray-600">
                <p>สัปดาห์นี้: {(metrics.weekComparison.tokens.thisWeek / 1000000).toFixed(1)}M</p>
                <p>สัปดาห์ที่แล้ว: {(metrics.weekComparison.tokens.lastWeek / 1000000).toFixed(1)}M</p>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Interactions</span>
                <span className="flex items-center gap-1 text-green-600">
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

      {/* Recent Activity & Top Performing Bots */}
      <div className={`grid gap-6 mb-8 items-stretch ${filter !== 'user' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Recent Activity - Only show when not User filter */}
        {filter !== 'user' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6 flex-shrink-0">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 shadow-lg">
              <HiBell className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">กิจกรรมล่าสุด</h3>
              <p className="text-xs text-gray-600">Recent Activity</p>
            </div>
          </div>
          <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: '672px' }}>
            {metrics.recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div 
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-all duration-300 border border-gray-100"
                >
                  <div className={`${activity.color} bg-opacity-10 rounded-lg p-2`}>
                    <Icon className={`${activity.color} text-xl`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 mb-1">{activity.message}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <HiClock className="text-xs" />
                      <span>{activity.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Bot Knowledge Accuracy - Hide when System filter */}
        {filter !== 'system' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6 flex-shrink-0">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 shadow-lg">
              <HiFire className="text-white text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">ความแม่นยำของ Bot</h3>
              <p className="text-xs text-gray-600">Bot Knowledge Accuracy (รวมทั้งหมด)</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {/* Overall Accuracy Display */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-2xl mb-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">{metrics.botKnowledgeAccuracy.overallAccuracy}%</p>
                  <p className="text-xs text-orange-100 mt-1">ความแม่นยำ</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <HiTrendingUp className="text-green-600" />
                <span className="text-sm font-semibold text-green-600">+{metrics.botKnowledgeAccuracy.improvement}%</span>
                <span className="text-xs text-gray-500">จากเดือนที่แล้ว</span>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">คำถามทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.botKnowledgeAccuracy.totalQuestions.toLocaleString('th-TH')}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <p className="text-xs text-gray-600 mb-1">ตอบจาก Knowledge</p>
                <p className="text-2xl font-bold text-green-700">{metrics.botKnowledgeAccuracy.knowledgeMatches.toLocaleString('th-TH')}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <p className="text-xs text-gray-600 mb-1">ไม่ได้ตอบจาก Knowledge</p>
                <p className="text-2xl font-bold text-purple-700">{metrics.botKnowledgeAccuracy.nonKnowledgeAnswers.toLocaleString('th-TH')}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <p className="text-xs text-gray-600 mb-1">เวลาตอบเฉลี่ย</p>
                <p className="text-2xl font-bold text-orange-700">{metrics.botKnowledgeAccuracy.averageResponseTime}</p>
              </div>
            </div>

            {/* Accuracy Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">ความแม่นยำจาก Knowledge</span>
                <span className="font-bold text-orange-600">{metrics.botKnowledgeAccuracy.overallAccuracy}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-4 rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                  style={{ width: `${metrics.botKnowledgeAccuracy.overallAccuracy}%` }}
                >
                  <span className="text-xs font-semibold text-white">{metrics.botKnowledgeAccuracy.overallAccuracy}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
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
