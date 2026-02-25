import React, { useState } from 'react';
import { HiChevronLeft, HiChevronRight, HiChevronDoubleLeft, HiChevronDoubleRight, HiOutlineUsers, HiOutlineUserGroup } from 'react-icons/hi';

const mockUsers = [
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    name: 'สตอร์วันเดอร์ธีรนาต',
    email: 'bingSuSUSU@gmail.com',
    lastActive: '2 วันที่แล้ว',
    createdAt: '29 มกราคม 2569',
    expiredAt: '22 กุมภาพันธ์ 2569',
    expired: true,
    status: true,
    bots: 2,
    knowledge: 4,
  },
  {
    role: 'รอดำเนินการ',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    name: 'Test01',
    email: 'TestTest00001@gmail.com',
    lastActive: '54 นาทีที่แล้ว',
    createdAt: '2 เมษายน 2569',
    expiredAt: '15 กรกฎาคม 2569',
    expired: true,
    status: false,
    bots: 0,
    knowledge: 0,
  },
  {
    role: 'แอดมิน',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    name: 'สมหญิง ใจดี',
    email: 'admin@bingsu.com',
    lastActive: '10 นาทีที่แล้ว',
    createdAt: '1 มกราคม 2569',
    expiredAt: '31 ธันวาคม 2569',
    expired: false,
    status: true,
    bots: 3,
    knowledge: 5,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    name: 'ปิยะดา สุขสันต์',
    email: 'piyada.s@example.com',
    lastActive: '1 ชั่วโมงที่แล้ว',
    createdAt: '15 กุมภาพันธ์ 2569',
    expiredAt: '15 สิงหาคม 2569',
    expired: false,
    status: true,
    bots: 1,
    knowledge: 3,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
    name: 'วิชัย ประสงค์',
    email: 'wichai.p@gmail.com',
    lastActive: '3 วันที่แล้ว',
    createdAt: '10 มีนาคม 2569',
    expiredAt: '10 กันยายน 2569',
    expired: false,
    status: true,
    bots: 3,
    knowledge: 5,
  },
  {
    role: 'รอดำเนินการ',
    avatar: 'https://randomuser.me/api/portraits/women/6.jpg',
    name: 'นิภา รักษา',
    email: 'nipha.r@yahoo.com',
    lastActive: '5 นาทีที่แล้ว',
    createdAt: '20 กุมภาพันธ์ 2569',
    expiredAt: '20 สิงหาคม 2569',
    expired: false,
    status: false,
    bots: 0,
    knowledge: 0,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/men/7.jpg',
    name: 'สมชาย มานะ',
    email: 'somchai.m@hotmail.com',
    lastActive: '1 สัปดาห์ที่แล้ว',
    createdAt: '5 มกราคม 2569',
    expiredAt: '5 กรกฎาคม 2569',
    expired: false,
    status: true,
    bots: 2,
    knowledge: 2,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/women/8.jpg',
    name: 'จันทร์เพ็ญ สว่าง',
    email: 'chanpen.s@outlook.com',
    lastActive: '30 นาทีที่แล้ว',
    createdAt: '12 กุมภาพันธ์ 2569',
    expiredAt: '12 สิงหาคม 2569',
    expired: false,
    status: true,
    bots: 1,
    knowledge: 4,
  },
  {
    role: 'แอดมิน',
    avatar: 'https://randomuser.me/api/portraits/men/9.jpg',
    name: 'ธนากร วิทยา',
    email: 'thanakorn.v@admin.com',
    lastActive: '2 ชั่วโมงที่แล้ว',
    createdAt: '1 มกราคม 2569',
    expiredAt: '31 ธันวาคม 2569',
    expired: false,
    status: true,
    bots: 3,
    knowledge: 5,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
    name: 'สุภาพร ใจงาม',
    email: 'supaporn.j@gmail.com',
    lastActive: '4 วันที่แล้ว',
    createdAt: '18 มกราคม 2569',
    expiredAt: '18 กรกฎาคม 2569',
    expired: false,
    status: false,
    bots: 1,
    knowledge: 2,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
    name: 'ประยุทธ สมบูรณ์',
    email: 'prayut.s@example.com',
    lastActive: '12 ชั่วโมงที่แล้ว',
    createdAt: '8 กุมภาพันธ์ 2569',
    expiredAt: '8 สิงหาคม 2569',
    expired: false,
    status: true,
    bots: 2,
    knowledge: 3,
  },
  {
    role: 'รอดำเนินการ',
    avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
    name: 'อรพิน ทรัพย์',
    email: 'orapin.t@yahoo.com',
    lastActive: '20 นาทีที่แล้ว',
    createdAt: '22 กุมภาพันธ์ 2569',
    expiredAt: '22 สิงหาคม 2569',
    expired: false,
    status: false,
    bots: 0,
    knowledge: 0,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/men/13.jpg',
    name: 'ชัยยา ชนะ',
    email: 'chaiya.c@hotmail.com',
    lastActive: '6 ชั่วโมงที่แล้ว',
    createdAt: '3 มีนาคม 2569',
    expiredAt: '3 กันยายน 2569',
    expired: false,
    status: true,
    bots: 3,
    knowledge: 4,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/women/14.jpg',
    name: 'วราพร สุขใจ',
    email: 'waraporn.s@gmail.com',
    lastActive: '15 นาทีที่แล้ว',
    createdAt: '25 มกราคม 2569',
    expiredAt: '25 กรกฎาคม 2569',
    expired: false,
    status: true,
    bots: 1,
    knowledge: 1,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/men/15.jpg',
    name: 'ธีรพล ดี',
    email: 'teeraphol.d@outlook.com',
    lastActive: '2 วันที่แล้ว',
    createdAt: '14 กุมภาพันธ์ 2569',
    expiredAt: '14 สิงหาคม 2569',
    expired: false,
    status: true,
    bots: 2,
    knowledge: 5,
  },
  {
    role: 'แอดมิน',
    avatar: 'https://randomuser.me/api/portraits/women/16.jpg',
    name: 'พรทิพย์ เจริญ',
    email: 'porntip.j@admin.com',
    lastActive: '5 ชั่วโมงที่แล้ว',
    createdAt: '1 มกราคม 2569',
    expiredAt: '31 ธันวาคม 2569',
    expired: false,
    status: true,
    bots: 3,
    knowledge: 5,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/men/17.jpg',
    name: 'อนุชา มั่นคง',
    email: 'anucha.m@example.com',
    lastActive: '8 ชั่วโมงที่แล้ว',
    createdAt: '7 มกราคม 2569',
    expiredAt: '7 กรกฎาคม 2569',
    expired: false,
    status: false,
    bots: 1,
    knowledge: 3,
  },
  {
    role: 'รอดำเนินการ',
    avatar: 'https://randomuser.me/api/portraits/women/18.jpg',
    name: 'สุดารัตน์ ยิ้ม',
    email: 'sudarat.y@gmail.com',
    lastActive: '25 นาทีที่แล้ว',
    createdAt: '23 กุมภาพันธ์ 2569',
    expiredAt: '23 สิงหาคม 2569',
    expired: false,
    status: false,
    bots: 0,
    knowledge: 0,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/men/19.jpg',
    name: 'ณัฐพล วงศ์',
    email: 'nattaphon.w@yahoo.com',
    lastActive: '3 ชั่วโมงที่แล้ว',
    createdAt: '11 กุมภาพันธ์ 2569',
    expiredAt: '11 สิงหาคม 2569',
    expired: false,
    status: true,
    bots: 2,
    knowledge: 4,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/women/20.jpg',
    name: 'มาลี ดอกไม้',
    email: 'malee.d@hotmail.com',
    lastActive: '1 วันที่แล้ว',
    createdAt: '5 กุมภาพันธ์ 2569',
    expiredAt: '5 สิงหาคม 2569',
    expired: false,
    status: true,
    bots: 1,
    knowledge: 2,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/men/21.jpg',
    name: 'พิชัย ก้าวหน้า',
    email: 'phichai.k@gmail.com',
    lastActive: '10 ชั่วโมงที่แล้ว',
    createdAt: '16 มกราคม 2569',
    expiredAt: '16 กรกฎาคม 2569',
    expired: false,
    status: true,
    bots: 3,
    knowledge: 5,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
    name: 'รัตนา แสงสว่าง',
    email: 'rattana.s@outlook.com',
    lastActive: '45 นาทีที่แล้ว',
    createdAt: '19 กุมภาพันธ์ 2569',
    expiredAt: '19 สิงหาคม 2569',
    expired: false,
    status: true,
    bots: 2,
    knowledge: 3,
  },
  {
    role: 'รอดำเนินการ',
    avatar: 'https://randomuser.me/api/portraits/men/23.jpg',
    name: 'กิตติ รุ่งเรือง',
    email: 'kitti.r@example.com',
    lastActive: '35 นาทีที่แล้ว',
    createdAt: '24 กุมภาพันธ์ 2569',
    expiredAt: '24 สิงหาคม 2569',
    expired: false,
    status: false,
    bots: 0,
    knowledge: 0,
  },
  {
    role: 'ผู้ใช้งาน',
    avatar: 'https://randomuser.me/api/portraits/women/24.jpg',
    name: 'ปราณี เพชร',
    email: 'pranee.p@yahoo.com',
    lastActive: '5 วันที่แล้ว',
    createdAt: '9 มกราคม 2569',
    expiredAt: '9 กรกฎาคม 2569',
    expired: false,
    status: false,
    bots: 1,
    knowledge: 1,
  },
  {
    role: 'แอดมิน',
    avatar: 'https://randomuser.me/api/portraits/men/25.jpg',
    name: 'สมศักดิ์ เจริญสุข',
    email: 'somsak.c@admin.com',
    lastActive: '1 ชั่วโมงที่แล้ว',
    createdAt: '1 มกราคม 2569',
    expiredAt: '31 ธันวาคม 2569',
    expired: false,
    status: true,
    bots: 3,
    knowledge: 5,
  },
];

function RoleBadge({ role }) {
  let color = '';
  let text = '';
  if (role === 'แอดมิน') {
    color = 'bg-green-400 text-white';
    text = 'แอดมิน';
  } else if (role === 'ผู้ใช้งาน') {
    color = 'bg-yellow-400 text-black';
    text = 'ผู้ใช้งาน';
  } else {
    color = 'bg-gray-200 text-gray-700';
    text = 'รอดำเนินการ';
  }
  return (
    <span className={`px-3 py-[2px] rounded-full text-xs font-semibold min-w-[48px] inline-block text-center ${color}`}>{text}</span>
  );
}

// Date formatter: converts '29 มกราคม 2569' to '29/01/69'
function formatDate(dateStr) {
  if (!dateStr) return '';
  const months = {
    'มกราคม': '01',
    'กุมภาพันธ์': '02',
    'มีนาคม': '03',
    'เมษายน': '04',
    'พฤษภาคม': '05',
    'มิถุนายน': '06',
    'กรกฎาคม': '07',
    'สิงหาคม': '08',
    'กันยายน': '09',
    'ตุลาคม': '10',
    'พฤศจิกายน': '11',
    'ธันวาคม': '12',
  };
  const parts = dateStr.split(' ');
  if (parts.length !== 3) return dateStr;
  const day = parts[0];
  const month = months[parts[1]] || '00';
  const year = parts[2].slice(-2); // Use last 2 digits
  return `${day}/${month}/${year}`;
}

// Calculate expiry date (6 months from today)
function calculateExpiryDate() {
  const today = new Date();
  const expiry = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
  
  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const day = expiry.getDate();
  const month = monthNames[expiry.getMonth()];
  const year = expiry.getFullYear();
  
  return `${day} ${month} ${year}`;
}

// Get initials from name
function getInitials(name) {
  if (!name) return '?';
  return name.trim()[0].toUpperCase();
}

// Get avatar color based on name hash
function getAvatarColor(name) {
  const colors = [
    { bg: 'bg-blue-500', text: 'text-white' },
    { bg: 'bg-green-500', text: 'text-white' },
    { bg: 'bg-purple-500', text: 'text-white' },
    { bg: 'bg-pink-500', text: 'text-white' },
    { bg: 'bg-indigo-500', text: 'text-white' },
    { bg: 'bg-red-500', text: 'text-white' },
    { bg: 'bg-yellow-500', text: 'text-gray-900' },
    { bg: 'bg-teal-500', text: 'text-white' },
    { bg: 'bg-orange-500', text: 'text-white' },
    { bg: 'bg-cyan-500', text: 'text-white' },
  ];
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Avatar component
function Avatar({ name, size = 'w-7 h-7', fontSize = 'text-[11px]' }) {
  const initials = getInitials(name);
  const color = getAvatarColor(name);
  
  return (
    <div className={`${size} ${color.bg} ${color.text} rounded-full flex items-center justify-center font-bold ${fontSize} shadow-sm`}>
      {initials}
    </div>
  );
}

function SupportPanel() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState(() => mockUsers.map(u => ({ ...u, status: true })));
  const [confirmRole, setConfirmRole] = useState({ open: false, idx: null, newRole: '' });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const pageSize = 20;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  // handle toggle
  const handleToggle = idx => {
    setUsers(prev => prev.map((u, i) => i === idx ? { ...u, status: !u.status } : u));
  };

  // handle role change
  const handleRoleChange = (idx, newRole) => {
    setOpenDropdown(null);
    setConfirmRole({ open: true, idx, newRole });
  };
  const confirmRoleChange = () => {
    const user = users[confirmRole.idx];
    const newExpiredAt = user.role === 'รอดำเนินการ' ? calculateExpiryDate() : user.expiredAt;
    
    setUsers(prev => prev.map((u, i) => 
      i === confirmRole.idx ? { ...u, role: confirmRole.newRole, expiredAt: newExpiredAt } : u
    ));
    setConfirmRole({ open: false, idx: null, newRole: '' });
    setOpenDropdown(null);
  };
  const cancelRoleChange = () => {
    setConfirmRole({ open: false, idx: null, newRole: '' });
    setOpenDropdown(null);
  };

  return (
    <div className="w-full px-6 py-8">
      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-t-lg border-b border-gray-200">
        <div className="flex gap-8 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-2 font-semibold text-[15px] border-b-2 transition-all duration-200 ${
              activeTab === 'overview'
                ? 'text-gray-900 border-blue-500'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <HiOutlineUsers /> Overview
            </span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-4 px-2 font-semibold text-[15px] border-b-2 transition-all duration-200 ${
              activeTab === 'groups'
                ? 'text-gray-900 border-blue-500'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <HiOutlineUserGroup /> Groups
            </span>
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-b-lg shadow">
        {/* User Count */}
        <div className="px-6 pt-4 pb-0">
          <div className="text-[18px] font-medium">User <span className="font-bold text-[22px]">{filteredUsers.length}</span></div>
        </div>
        {/* Search Bar */}
        <div className="px-6 pt-2 pb-2 flex">
          <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              className="w-full border-b border-gray-300 pl-8 pr-2 py-1 focus:outline-none focus:border-yellow-400 text-[15px]"
              placeholder="Search User"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <svg className="absolute left-1 top-1.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          </div>
        </div>
        </div>

      {/* Table */}
      <div className="px-6 pt-2 pb-2 overflow-x-auto" style={{ minHeight: '1000px' }}>
        <table className="w-full text-left border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2 font-semibold text-[13px] text-gray-700 w-[8%]">บทบาท</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 w-[14%]">ชื่อ</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 w-[16%]">อีเมล</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 w-[7%]">Bots</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 w-[7%]">Knowledge</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 w-[10%]">ใช้งานล่าสุด</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 w-[9%]">สร้างเมื่อ</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 w-[9%]">วันหมดอายุ</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 w-[6%]">สถานะ</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 text-right w-[4%]"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user, idx) => (
              <tr key={user.email} className={`border-b border-gray-100 hover:bg-gray-50 ${!user.status ? 'opacity-50' : ''}`} style={{height: 48}}>
                <td className="py-2 align-middle">
                  <div className="relative inline-block">
                    <button
                      className={`focus:outline-none ${confirmRole.open ? 'pointer-events-none opacity-50' : ''} ${!user.status ? 'pointer-events-none opacity-50' : ''}`}
                      disabled={confirmRole.open || !user.status}
                      tabIndex={confirmRole.open || !user.status ? -1 : 0}
                      onClick={() => {
                        if (confirmRole.open || !user.status) return;
                        setOpenDropdown(openDropdown === idx ? null : idx);
                      }}
                    >
                      <RoleBadge role={user.role} />
                    </button>
                    <div className={`absolute left-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow z-10 ${openDropdown === idx && !confirmRole.open ? '' : 'hidden'}${confirmRole.open ? ' pointer-events-none opacity-50' : ''}`}>
                      {['รอดำเนินการ', 'ผู้ใช้งาน', 'แอดมิน'].map(r => (
                        <button
                          key={r}
                          className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-100 ${user.role === r ? 'text-green-600 font-bold' : 'text-gray-700'}`}
                          onClick={() => { setOpenDropdown(null); handleRoleChange(idx, r); }}
                          disabled={user.role === r || confirmRole.open}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="py-2 align-middle">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={user.name} />
                    <span className={`text-[13px] truncate ${!user.status ? 'text-gray-400' : 'text-gray-900'}`} title={user.name}>{user.name}</span>
                  </div>
                </td>
                <td className={`py-2 align-middle text-[13px] truncate ${!user.status ? 'text-gray-400' : 'text-gray-700'}`} title={user.email}>{user.email}</td>
                <td className="py-2 align-middle text-center">
                  <span className="font-semibold text-[13px] text-gray-700">{user.bots}/3</span>
                </td>
                <td className="py-2 align-middle text-center">
                  <span className="font-semibold text-[13px] text-gray-700">{user.knowledge}/5</span>
                </td>
                <td className={`py-2 align-middle text-[13px] ${!user.status ? 'text-gray-400' : 'text-gray-700'}`}>{user.lastActive}</td>
                <td className={`py-2 align-middle text-[13px] ${!user.status ? 'text-gray-400' : 'text-gray-700'}`}>{formatDate(user.createdAt)}</td>
                <td className="py-2 align-middle">
                  {user.role === 'รอดำเนินการ' ? (
                    <span className="text-gray-400 text-[13px]">-</span>
                  ) : (
                    <span className="text-red-500 font-semibold text-[13px]">{formatDate(user.expiredAt)}</span>
                  )}
                </td>
                <td className="py-2 align-middle">
                    <label className={`inline-flex items-center ${user.role === 'รอดำเนินการ' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={user.status}
                        onChange={() => handleToggle(idx)}
                        className="sr-only peer"
                        disabled={user.role === 'รอดำเนินการ'}
                      />
                      <div
                        className={`w-11 h-6 flex items-center rounded-full transition-all duration-300 border ${user.role === 'รอดำเนินการ' ? 'bg-gray-300 border-gray-300' : (user.status ? 'bg-green-500 border-green-500' : 'bg-gray-200 border-gray-300')}`}
                        style={{ boxShadow: user.role === 'รอดำเนินการ' ? '0 1px 4px 0 rgba(156,163,175,0.10)' : (user.status ? '0 2px 8px 0 rgba(34,197,94,0.15)' : '0 1px 4px 0 rgba(156,163,175,0.10)') }}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${user.status ? 'translate-x-5' : 'translate-x-0'}`}
                          style={{ border: user.role === 'รอดำเนินการ' ? '2px solid #d1d5db' : (user.status ? '2px solid #22c55e' : '2px solid #d1d5db') }}
                        ></div>
                      </div>
                    </label>
                </td>
                <td className="py-2 align-middle text-right">
                  <button className="text-gray-500 hover:text-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 mt-6">
        {/* First Page Button */}
        <button
          className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow"
          onClick={() => setPage(1)}
          disabled={page === 1}
          title="หน้าแรก"
        >
          <HiChevronDoubleLeft className="text-lg" />
        </button>
        
        {/* Previous Page Button */}
        <button
          className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          title="ก่อนหน้า"
        >
          <HiChevronLeft className="text-lg" />
        </button>
        
        {/* Page Numbers with Ellipsis */}
        <div className="flex items-center gap-2">
          {(() => {
            const pages = [];
            const maxVisible = 5; // จำนวนหน้าที่แสดง
            
            if (totalPages <= maxVisible + 2) {
              // แสดงทุกหน้า ถ้าน้อยกว่า maxVisible+2
              for (let i = 1; i <= totalPages; i++) {
                pages.push(
                  <button
                    key={i}
                    className={`min-w-[40px] h-10 px-3 rounded-lg border-2 font-semibold transition-all duration-200 shadow-sm ${
                      page === i
                        ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-500 shadow-md hover:shadow-lg scale-105'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow'
                    }`}
                    onClick={() => setPage(i)}
                  >
                    {i}
                  </button>
                );
              }
            } else {
              // หลายหน้า ใช้ ellipsis
              const leftSiblingIndex = Math.max(page - 1, 1);
              const rightSiblingIndex = Math.min(page + 1, totalPages);
              
              const shouldShowLeftDots = leftSiblingIndex > 2;
              const shouldShowRightDots = rightSiblingIndex < totalPages - 1;
              
              // หน้าแรก
              pages.push(
                <button
                  key={1}
                  className={`min-w-[40px] h-10 px-3 rounded-lg border-2 font-semibold transition-all duration-200 shadow-sm ${
                    page === 1
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-500 shadow-md hover:shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow'
                  }`}
                  onClick={() => setPage(1)}
                >
                  1
                </button>
              );
              
              // Left ellipsis
              if (shouldShowLeftDots) {
                pages.push(
                  <span key="left-dots" className="px-2 text-gray-500 font-bold">
                    ...
                  </span>
                );
              }
              
              // หน้ากลาง
              for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
                if (i !== 1 && i !== totalPages) {
                  pages.push(
                    <button
                      key={i}
                      className={`min-w-[40px] h-10 px-3 rounded-lg border-2 font-semibold transition-all duration-200 shadow-sm ${
                        page === i
                          ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-500 shadow-md hover:shadow-lg scale-105'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow'
                      }`}
                      onClick={() => setPage(i)}
                    >
                      {i}
                    </button>
                  );
                }
              }
              
              // Right ellipsis
              if (shouldShowRightDots) {
                pages.push(
                  <span key="right-dots" className="px-2 text-gray-500 font-bold">
                    ...
                  </span>
                );
              }
              
              // หน้าสุดท้าย
              if (totalPages > 1) {
                pages.push(
                  <button
                    key={totalPages}
                    className={`min-w-[40px] h-10 px-3 rounded-lg border-2 font-semibold transition-all duration-200 shadow-sm ${
                      page === totalPages
                        ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-500 shadow-md hover:shadow-lg scale-105'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow'
                    }`}
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                );
              }
            }
            
            return pages;
          })()}
        </div>
        
        {/* Next Page Button */}
        <button
          className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
          title="ถัดไป"
        >
          <HiChevronRight className="text-lg" />
        </button>
        
        {/* Last Page Button */}
        <button
          className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow"
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
          title="หน้าสุดท้าย"
        >
          <HiChevronDoubleRight className="text-lg" />
        </button>
      </div>
      
      {/* Page Info */}
      <div className="text-center mt-3 text-sm text-gray-600">
        หน้า <span className="font-semibold text-orange-500">{page}</span> จาก <span className="font-semibold">{totalPages}</span>
      </div>
      {/* Confirm Role Popup */}
      {confirmRole.open && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-5 min-w-[220px] max-w-xs border border-gray-200">
            <div className="text-[16px] font-semibold mb-2">ยืนยันการเปลี่ยนบทบาท</div>
            <div className="mb-3 text-gray-700 text-[14px]">คุณต้องการเปลี่ยนบทบาทเป็น <span className="font-bold text-green-600">{confirmRole.newRole}</span> ใช่หรือไม่?</div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 text-[14px]" onClick={cancelRoleChange}>ยกเลิก</button>
              <button className="px-3 py-1 rounded bg-yellow-400 text-black font-semibold hover:bg-yellow-500 text-[14px]" onClick={confirmRoleChange}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupportPanel;
