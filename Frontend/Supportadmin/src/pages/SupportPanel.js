import React, { useState } from 'react';
import { HiOutlineUsers, HiOutlineUserGroup } from "react-icons/hi";

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
  },
  // ...remaining mockUsers...
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

function SupportPanel() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState(() => mockUsers.map(u => ({ ...u, status: true })));
  const [confirmRole, setConfirmRole] = useState({ open: false, idx: null, newRole: '' });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [page, setPage] = useState(1);
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
    setUsers(prev => prev.map((u, i) => i === confirmRole.idx ? { ...u, role: confirmRole.newRole } : u));
    setConfirmRole({ open: false, idx: null, newRole: '' });
    setOpenDropdown(null);
  };
  const cancelRoleChange = () => {
    setConfirmRole({ open: false, idx: null, newRole: '' });
    setOpenDropdown(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Support Panel</h1>
        <p className="text-gray-600">
          Support Panel page 
        </p>
      </div>

      {/* User Count */}
      <div className="px-4 pt-2 pb-0 min-w-[1100px]">
        <div className="text-[18px] font-medium">User <span className="font-bold text-[22px]">{filteredUsers.length}</span></div>
      </div>
      {/* Search Bar */}
      <div className="px-4 pt-1 pb-1 flex min-w-[1100px]">
        <div className="flex-1">
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
      <div className="px-4 pt-2 overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2 font-semibold text-[13px] text-gray-700">บทบาท</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700">ชื่อ</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700">อีเมล</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700">ใช้งานล่าสุด</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700">สร้างเมื่อ</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700">วันหมดอายุ</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700">สถานะ</th>
              <th className="py-2 font-semibold text-[13px] text-gray-700 text-right"></th>
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
                  <div className="flex items-center gap-2">
                    <img src={user.avatar} alt="avatar" className="w-7 h-7 rounded-full border object-cover" />
                    <span className={`text-[13px] ${!user.status ? 'text-gray-400' : 'text-gray-900'}`}>{user.name}</span>
                  </div>
                </td>
                <td className={`py-2 align-middle text-[13px] ${!user.status ? 'text-gray-400' : 'text-gray-700'}`}>{user.email}</td>
                <td className={`py-2 align-middle text-[13px] ${!user.status ? 'text-gray-400' : 'text-gray-700'}`}>{user.lastActive}</td>
                <td className={`py-2 align-middle text-[13px] ${!user.status ? 'text-gray-400' : 'text-gray-700'}`}>{formatDate(user.createdAt)}</td>
                <td className="py-2 align-middle">
                  <span className="text-red-500 font-semibold text-[13px]">{formatDate(user.expiredAt)}</span>
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
      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 flex items-center gap-1 disabled:opacity-50"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          <span>&lt;</span> Back
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            className={`px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 font-medium ${page === i + 1 ? 'bg-black text-white border-black' : ''}`}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        <button
          className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 flex items-center gap-1 disabled:opacity-50"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        >
          Next <span>&gt;</span>
        </button>
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
