import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiSearch, HiFilter, HiPlus, HiUserGroup, HiEye, HiEyeOff } from 'react-icons/hi';
import { botListRaw, BOT_LIMIT_PER_USER } from '../data/botsData';
import { knowledgeListRaw, KNOWLEDGE_LIMIT_PER_USER } from '../data/knowledgeData';

function SupportPanel({ users, setUsers }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilters, setRoleFilters] = useState([]);
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [openActionMenuUserId, setOpenActionMenuUserId] = useState(null);
  const [openGroupActionMenuId, setOpenGroupActionMenuId] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupProfileModal, setShowGroupProfileModal] = useState(false);
  const [showEditMembersModal, setShowEditMembersModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupProfileName, setGroupProfileName] = useState('');
  const [groupProfileDescription, setGroupProfileDescription] = useState('');
  const [editMembersSearchQuery, setEditMembersSearchQuery] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [targetUserId, setTargetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [extendDays, setExtendDays] = useState('30');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const filterRef = useRef(null);
  const actionMenuRef = useRef(null);
  const groupActionMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const itemsPerPage = 20;

  // Mock groups data
  const [groups, setGroups] = useState([
    { id: 1, name: 'พพอ.', description: 'กลุ่มงานหลัก', avatar: 'พ', members: [3, 6] },
    { id: 2, name: 'บิงชู', description: 'กลุ่มฝ่ายขาย', avatar: 'บ', members: [8, 10] },
    { id: 3, name: 'ถั่วแระ', description: 'กลุ่มดูแลลูกค้า', avatar: 'ถ', members: [14, 16, 18, 21] },
    { id: 4, name: 'อชจ.', description: 'กลุ่มทดสอบระบบ', avatar: 'อ', members: [23, 24, 27] },
    { id: 5, name: 'บักอะ', description: 'กลุ่มสำรอง', avatar: 'บ', members: [29, 30, 33] }
  ]);

  const handleToggleStatus = (userId) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, isEnabled: !user.isEnabled } : user
    ));
  };

  const handleRoleClick = (userId, roleType) => {
    if (roleType === 'pending') {
      setHighlightedUserId(null);
      setSelectedUserId(userId);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmApprove = () => {
    setUsers(users.map(user => {
      if (user.id === selectedUserId) {
        // Calculate expiry date 3 months from creation date
        const createdDate = parseThaiDate(user.createdAt);
        const expiryDate = new Date(createdDate);
        expiryDate.setMonth(expiryDate.getMonth() + 3);
        const expiresAt = formatShortDate(expiryDate);
        
        return { ...user, role: 'ผู้ใช้งาน', roleType: 'user', expiresAt, isEnabled: true };
      }
      return user;
    }));
    setShowConfirmModal(false);
    setSelectedUserId(null);
  };

  const handleCancelApprove = () => {
    setShowConfirmModal(false);
    setSelectedUserId(null);
  };

  const handleRoleFilterToggle = (roleType) => {
    setRoleFilters(prev => 
      prev.includes(roleType)
        ? prev.filter(r => r !== roleType)
        : [...prev, roleType]
    );
  };

  const roleOptions = [
    { type: 'pending', label: 'รอดำเนินการ', color: 'bg-gray-400' },
    { type: 'user', label: 'ผู้ใช้งาน', color: 'bg-yellow-400' },
    { type: 'moderator', label: 'ผู้ดูแล', color: 'bg-blue-500' },
    { type: 'admin', label: 'แอดมิน', color: 'bg-green-400' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowRoleFilter(false);
      }

      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuUserId(null);
      }

      if (groupActionMenuRef.current && !groupActionMenuRef.current.contains(event.target)) {
        setOpenGroupActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const focusUserId = location.state?.focusUserId;

    if (!focusUserId) {
      return;
    }

    setActiveTab('overview');
    setSearchQuery('');
    setRoleFilters([]);

    const sortedUsers = [...users].sort((a, b) => parseThaiDate(b.createdAt) - parseThaiDate(a.createdAt));
    const targetIndex = sortedUsers.findIndex((user) => user.id === focusUserId);

    if (targetIndex !== -1) {
      setCurrentPage(Math.floor(targetIndex / itemsPerPage) + 1);
      setHighlightedUserId(focusUserId);
    }

    navigate(location.pathname, { replace: true, state: null });

    const timer = setTimeout(() => {
      setHighlightedUserId(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [location.pathname, location.state, navigate, users]);

  const parseThaiDate = (thaiDateStr) => {
    const thaiMonths = {
      'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2, 'เมษายน': 3,
      'พฤษภาคม': 4, 'มิถุนายน': 5, 'กรกฎาคม': 6, 'สิงหาคม': 7,
      'กันยายน': 8, 'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11
    };
    const parts = thaiDateStr.split(' ');
    const day = parseInt(parts[0]);
    const month = thaiMonths[parts[1]];
    const year = parseInt(parts[2]) - 543; // Convert Buddhist year to Christian year
    return new Date(year, month, day);
  };

  const parseDisplayDateToDate = (value) => {
    if (!value || value === '-') return null;

    if (value.includes('/')) {
      const [day, month, shortYear] = value.split('/').map((part) => parseInt(part, 10));
      const buddhistYear = 2500 + shortYear;
      return new Date(buddhistYear - 543, month - 1, day);
    }

    return parseThaiDate(value);
  };

  const formatShortDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String((date.getFullYear() + 543) % 100).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const formatDisplayDate = (value) => {
    if (!value || value === '-') return '-';
    if (value.includes('/')) return value;
    return formatShortDate(parseThaiDate(value));
  };

  const targetUser = useMemo(
    () => users.find((user) => user.id === targetUserId) || null,
    [users, targetUserId]
  );

  const calculatedExtendedDate = (() => {
    if (!targetUser) return null;

    const baseDate = parseDisplayDateToDate(targetUser.expiresAt);
    if (!baseDate || Number.isNaN(baseDate.getTime())) return null;

    const updatedDate = new Date(baseDate);
    updatedDate.setDate(updatedDate.getDate() + Number(extendDays));
    return updatedDate;
  })();

  const getRoleBadgeColor = (roleType) => {
    switch(roleType) {
      case 'pending':
        return 'bg-gray-400 text-white cursor-pointer hover:bg-gray-500';
      case 'user':
        return 'bg-yellow-400 text-gray-900';
      case 'moderator':
        return 'bg-blue-500 text-white';
      case 'admin':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const botCountByUsername = useMemo(() => {
    const userBotCount = {};
    const cappedBotList = botListRaw.filter((bot) => {
      const nextCount = (userBotCount[bot.username] || 0) + 1;
      userBotCount[bot.username] = nextCount;
      return nextCount <= BOT_LIMIT_PER_USER;
    });

    return cappedBotList.reduce((acc, bot) => {
      acc[bot.username] = (acc[bot.username] || 0) + 1;
      return acc;
    }, {});
  }, []);

  const knowledgeCountByUsername = useMemo(() => {
    const userKnowledgeCount = {};
    const cappedKnowledgeList = knowledgeListRaw.filter((knowledge) => {
      const nextCount = (userKnowledgeCount[knowledge.username] || 0) + 1;
      userKnowledgeCount[knowledge.username] = nextCount;
      return nextCount <= KNOWLEDGE_LIMIT_PER_USER;
    });

    return cappedKnowledgeList.reduce((acc, knowledge) => {
      acc[knowledge.username] = (acc[knowledge.username] || 0) + 1;
      return acc;
    }, {});
  }, []);

  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilters.length === 0 || roleFilters.includes(user.roleType);
      return matchesSearch && matchesRole;
    });

    // Always sort by creation date (newest first)
    return filtered.sort((a, b) => {
      const dateA = parseThaiDate(a.createdAt);
      const dateB = parseThaiDate(b.createdAt);
      return dateB - dateA; // Descending order (newest first)
    });
  }, [users, searchQuery, roleFilters]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const userByIdMap = useMemo(() => {
    return users.reduce((accumulator, user) => {
      accumulator[user.id] = user;
      return accumulator;
    }, {});
  }, [users]);

  const groupedUsers = useMemo(() => users.filter((user) => user.roleType === 'user'), [users]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const selectedGroupMembers = useMemo(() => {
    if (!selectedGroup) return [];
    return (selectedGroup.members || [])
      .map((memberId) => userByIdMap[memberId])
      .filter(Boolean);
  }, [selectedGroup, userByIdMap]);

  const selectableMembers = useMemo(() => {
    if (!selectedGroup) return [];

    const currentGroupMemberIds = new Set(selectedGroup.members || []);
    const memberIdsInOtherGroups = new Set(
      groups
        .filter((group) => group.id !== selectedGroup.id)
        .flatMap((group) => group.members || [])
    );

    const normalizedSearch = editMembersSearchQuery.trim().toLowerCase();

    return groupedUsers
      .filter((user) => {
        if (!currentGroupMemberIds.has(user.id) && memberIdsInOtherGroups.has(user.id)) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          user.username.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((firstUser, secondUser) => firstUser.username.localeCompare(secondUser.username, 'th'));
  }, [editMembersSearchQuery, groupedUsers, groups, selectedGroup]);

  const orderedSelectableMembers = useMemo(() => {
    const selectedIds = new Set(selectedMemberIds);

    return [...selectableMembers].sort((firstUser, secondUser) => {
      const firstSelected = selectedIds.has(firstUser.id);
      const secondSelected = selectedIds.has(secondUser.id);

      if (firstSelected !== secondSelected) {
        return firstSelected ? -1 : 1;
      }

      return firstUser.username.localeCompare(secondUser.username, 'th');
    });
  }, [selectableMembers, selectedMemberIds]);

  const getGroupMemberCount = (group) => {
    if (Array.isArray(group.members)) {
      return group.members.length;
    }
    return group.memberCount || 0;
  };

  const handleOpenPasswordModal = (userId) => {
    setTargetUserId(userId);
    setOpenActionMenuUserId(null);
    setShowExtendModal(false);
    setShowPasswordModal(true);
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleOpenExtendModal = (userId) => {
    setTargetUserId(userId);
    setExtendDays('30');
    setOpenActionMenuUserId(null);
    setShowPasswordModal(false);
    setShowExtendModal(true);
  };

  const handleConfirmPasswordChange = () => {
    if (!newPassword || !confirmNewPassword) {
      setPasswordError('กรุณากรอกรหัสผ่านให้ครบทั้งสองช่อง');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setPasswordError('');
    setShowPasswordModal(false);
    setTargetUserId(null);
  };

  const handleConfirmExtendExpiry = () => {
    if (!targetUser || !calculatedExtendedDate) return;

    const nextExpiry = formatShortDate(calculatedExtendedDate);
    setUsers(users.map((user) => (user.id === targetUser.id ? { ...user, expiresAt: nextExpiry } : user)));
    setShowExtendModal(false);
    setTargetUserId(null);
  };

  const handleOpenCreateGroupModal = () => {
    setNewGroupName('');
    setNewGroupDescription('');
    setShowCreateGroupModal(true);
  };

  const handleCloseCreateGroupModal = () => {
    setShowCreateGroupModal(false);
  };

  const handleCreateGroup = () => {
    const trimmedGroupName = newGroupName.trim();
    const trimmedGroupDescription = newGroupDescription.trim();

    if (!trimmedGroupName) {
      return;
    }

    setGroups((prevGroups) => {
      const nextId = prevGroups.length > 0 ? Math.max(...prevGroups.map((group) => group.id)) + 1 : 1;
      return [
        {
          id: nextId,
          name: trimmedGroupName,
          description: trimmedGroupDescription,
          members: [],
          avatar: trimmedGroupName.charAt(0)
        },
        ...prevGroups
      ];
    });

    setShowCreateGroupModal(false);
  };

  const handleOpenGroupProfileModal = (groupId) => {
    const targetGroup = groups.find((group) => group.id === groupId);
    if (!targetGroup) return;

    setSelectedGroupId(groupId);
    setGroupProfileName(targetGroup.name || '');
    setGroupProfileDescription(targetGroup.description || '');
    setOpenGroupActionMenuId(null);
    setShowGroupProfileModal(true);
  };

  const handleConfirmGroupDescription = () => {
    if (!selectedGroupId) return;

    const trimmedName = groupProfileName.trim();

    setGroups((previousGroups) =>
      previousGroups.map((group) =>
        group.id === selectedGroupId
          ? {
              ...group,
              name: trimmedName || group.name,
              avatar: (trimmedName || group.name).charAt(0),
              description: groupProfileDescription.trim()
            }
          : group
      )
    );
  };

  const handleOpenEditMembersModal = (groupId) => {
    const targetGroup = groups.find((group) => group.id === groupId);
    if (!targetGroup) return;

    setSelectedGroupId(groupId);
    setSelectedMemberIds([...(targetGroup.members || [])]);
    setEditMembersSearchQuery('');
    setOpenGroupActionMenuId(null);
    setShowEditMembersModal(true);
  };

  const handleToggleMemberSelection = (userId) => {
    setSelectedMemberIds((previousSelectedMemberIds) => {
      if (previousSelectedMemberIds.includes(userId)) {
        return previousSelectedMemberIds.filter((memberId) => memberId !== userId);
      }
      return [...previousSelectedMemberIds, userId];
    });
  };

  const handleSaveGroupMembers = () => {
    if (!selectedGroupId) return;

    setGroups((previousGroups) =>
      previousGroups.map((group) =>
        group.id === selectedGroupId
          ? { ...group, members: selectedMemberIds, memberCount: selectedMemberIds.length }
          : group
      )
    );

    setShowEditMembersModal(false);
  };

  return (
    <div className="w-full px-8 py-8">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="font-medium">Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            <span className="font-medium">Groups</span>
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        // Overview Tab Content
        <>
          {/* User Count */}
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">User <span className="font-normal">{filteredUsers.length}</span></h2>
          </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search User"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg overflow-visible">
        <div className="overflow-visible">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">
                <div className="flex items-center space-x-2 relative z-[130]" ref={filterRef}>
                  <span>บทบาท</span>
                  <button
                    onClick={() => setShowRoleFilter(!showRoleFilter)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <HiFilter className="w-4 h-4" />
                  </button>
                  {roleFilters.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {roleFilters.length}
                    </span>
                  )}
                  {showRoleFilter && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[140] w-48">
                      <div className="p-3 space-y-2">
                        {roleOptions.map((option) => (
                          <label
                            key={option.type}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={roleFilters.includes(option.type)}
                              onChange={() => handleRoleFilterToggle(option.type)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className={`inline-block w-3 h-3 rounded ${option.color}`}></span>
                            <span className="text-sm text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 p-2">
                        <button
                          onClick={() => setRoleFilters([])}
                          className="w-full text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 py-1 rounded"
                        >
                          ล้างทั้งหมด
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">ชื่อ</th>
              <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">อีเมล</th>
              <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">Bot</th>
              <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">Knowledge</th>
              <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">ใช้งานล่าสุด</th>
              <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">สร้างเมื่อ</th>
              <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">วันหมดอายุ</th>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUsers.map((user) => (
              <tr
                key={user.id}
                className={`hover:bg-gray-50 transition-colors ${
                  highlightedUserId === user.id
                    ? 'bg-red-50 animate-pulse'
                    : user.roleType === 'user' && !user.isEnabled
                      ? 'opacity-50'
                      : ''
                }`}
              >
                <td className="px-4 py-4">
                  <span 
                    onClick={() => handleRoleClick(user.id, user.roleType)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors ${
                      getRoleBadgeColor(user.roleType)
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${user.avatarColor}`}>
                      {user.avatar}
                    </div>
                    <span className="text-gray-900">{user.username}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-600">{user.email}</td>
                <td className="px-4 py-4 text-gray-600">
                  {user.roleType === 'user' ? `${botCountByUsername[user.username] || 0}/${BOT_LIMIT_PER_USER}` : '-'}
                </td>
                <td className="px-4 py-4 text-gray-600">
                  {user.roleType === 'user' ? `${knowledgeCountByUsername[user.username] || 0}/${KNOWLEDGE_LIMIT_PER_USER}` : '-'}
                </td>
                <td className="px-4 py-4 text-gray-600">
                  {user.roleType !== 'pending' ? user.lastActive : '-'}
                </td>
                <td className="px-4 py-4 text-gray-600">{formatDisplayDate(user.createdAt)}</td>
                <td className="px-4 py-4 text-red-500">
                  {user.roleType !== 'pending' ? formatDisplayDate(user.expiresAt) : '-'}
                </td>
                <td className="px-4 py-4">
                  {(user.roleType === 'user' || user.roleType === 'pending') && (
                    <button
                      onClick={() => user.roleType === 'user' && handleToggleStatus(user.id)}
                      disabled={user.roleType === 'pending'}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                        user.roleType === 'pending'
                          ? 'bg-gray-300 cursor-not-allowed'
                          : user.isEnabled
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                          user.roleType === 'pending'
                            ? 'translate-x-1'
                            : user.isEnabled
                              ? 'translate-x-6'
                              : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="relative" ref={openActionMenuUserId === user.id ? actionMenuRef : null}>
                      {user.roleType === 'pending' ? (
                        <button
                          disabled
                          className="text-gray-400 cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      ) : (
                      <button
                        onClick={() => setOpenActionMenuUserId((prev) => (prev === user.id ? null : user.id))}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      )}

                      {user.roleType !== 'pending' && openActionMenuUserId === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[110] overflow-hidden">
                          <button
                            onClick={() => handleOpenPasswordModal(user.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            แก้ไขรหัสผ่าน
                          </button>
                          <button
                            onClick={() => handleOpenExtendModal(user.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                          >
                            ต่อวันหมดอายุ
                          </button>
                        </div>
                      )}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center space-x-2 mt-6">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ก่อนหน้า
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-4 py-2 rounded-lg ${
              currentPage === page
                ? 'bg-yellow-400 text-gray-900'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ถัดไป
        </button>
      </div>
        </>
      ) : (
        // Groups Tab Content
        <>
          {/* Group Count and Search */}
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Group <span className="font-normal">{groups.length}</span></h2>
          </div>

          {/* Search and Create Button */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative flex-1 mr-4">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search Group"
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleOpenCreateGroupModal}
              className="flex items-center space-x-2 bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg hover:bg-yellow-500 transition-colors font-medium"
            >
              <span>Create group</span>
              <HiPlus className="w-5 h-5" />
            </button>
          </div>

          {/* Groups Table */}
          <div className="bg-white rounded-lg overflow-visible">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">กลุ่ม</th>
                  <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">คำอธิบาย</th>
                  <th className="px-4 py-3 text-left text-sm font-normal text-gray-600">จำนวนผู้ใช้</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groups
                  .filter(group => group.name.toLowerCase().includes(groupSearchQuery.toLowerCase()))
                  .map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                            {group.avatar}
                          </div>
                          <span className="text-gray-900">{group.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{group.description || '-'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <HiUserGroup className="w-5 h-5" />
                          <span>{getGroupMemberCount(group)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative" ref={openGroupActionMenuId === group.id ? groupActionMenuRef : null}>
                          <button
                            onClick={() => setOpenGroupActionMenuId((previousId) => (previousId === group.id ? null : group.id))}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>

                          {openGroupActionMenuId === group.id && (
                            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-[120] overflow-hidden">
                              <button
                                onClick={() => handleOpenGroupProfileModal(group.id)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                โปรไฟล์กลุ่ม
                              </button>
                              <button
                                onClick={() => handleOpenEditMembersModal(group.id)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                              >
                                แก้ไขสมาชิก
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ยืนยันการให้สิทธิ์
            </h3>
            <p className="text-gray-600 mb-6">
              ต้องการยืนยันการให้สิทธิ์การใช้งานผู้ใช้นี้หรือไม่?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelApprove}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ไม่
              </button>
              <button
                onClick={handleConfirmApprove}
                className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition-colors"
              >
                ใช่
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">แก้ไขรหัสผ่าน</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">รหัสผ่านใหม่</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="กรอกรหัสผ่านใหม่"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">ยืนยันรหัสผ่านใหม่</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ยืนยันรหัสผ่านใหม่"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setTargetUserId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmPasswordChange}
                className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition-colors"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {showExtendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ต่อวันหมดอายุ</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">เลือกระยะเวลาการต่อ</label>
                <select
                  value={extendDays}
                  onChange={(event) => setExtendDays(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="30">30 วัน</option>
                  <option value="60">60 วัน</option>
                  <option value="90">90 วัน</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
                {calculatedExtendedDate
                  ? `วันหมดอายุใหม่: ${formatShortDate(calculatedExtendedDate)}`
                  : 'ไม่พบวันหมดอายุเดิมสำหรับคำนวณ'}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowExtendModal(false);
                  setTargetUserId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmExtendExpiry}
                disabled={!calculatedExtendedDate}
                className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateGroupModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[130] px-4"
          onClick={handleCloseCreateGroupModal}
        >
          <div
            className="w-full max-w-2xl bg-gray-300 rounded-3xl p-8 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-5">
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-2">ชื่อกลุ่ม</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  placeholder="ใส่ชื่อกลุ่ม"
                  className="w-full rounded-full px-5 py-3 text-base text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-900 mb-2">คำอธิบาย</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(event) => setNewGroupDescription(event.target.value)}
                  placeholder="ใส่คำอธิบาย"
                  rows={5}
                  className="w-full rounded-3xl px-5 py-4 text-base text-gray-900 placeholder-gray-400 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="flex items-center justify-center pt-2">
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="px-8 py-3 bg-yellow-400 text-gray-900 rounded-full hover:bg-yellow-500 transition-colors font-semibold text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ยืนยันการสร้างกลุ่ม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGroupProfileModal && selectedGroup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[135] px-4"
          onClick={() => setShowGroupProfileModal(false)}
        >
          <div
            className="w-full max-w-4xl bg-gray-100 rounded-3xl p-8 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-3xl font-normal text-gray-900 mb-6">โปรไฟล์กลุ่ม</h3>

            <div className="mb-5 text-lg text-gray-900">
              <span className="mr-4">ชื่อ</span>
              <input
                type="text"
                value={groupProfileName}
                onChange={(event) => setGroupProfileName(event.target.value)}
                className="w-full mt-2 rounded-xl border border-gray-400 bg-transparent px-4 py-2 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="ใส่ชื่อกลุ่ม"
              />
            </div>

            <div className="mb-6">
              <p className="text-lg text-gray-900 mb-2">คำอธิบาย</p>
              <textarea
                value={groupProfileDescription}
                onChange={(event) => setGroupProfileDescription(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-gray-400 bg-transparent p-4 text-base text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="ใส่คำอธิบาย"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleConfirmGroupDescription}
                  className="px-4 py-1.5 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-medium"
                >
                  บันทึก
                </button>
              </div>
            </div>

            <div className="mb-7">
              <p className="text-lg text-gray-900 mb-3">สมาชิก</p>
              <div className="grid grid-cols-3 gap-y-4 gap-x-8">
                {selectedGroupMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${member.avatarColor}`}>
                      {member.avatar}
                    </div>
                    <span className="text-base text-gray-800 truncate">{member.username}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditMembersModal && selectedGroup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[136] px-4"
          onClick={() => setShowEditMembersModal(false)}
        >
          <div
            className="w-full max-w-5xl bg-gray-100 rounded-3xl p-8 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-3xl font-semibold text-gray-900 mb-4">แก้ไขสมาชิก</h3>

            <div className="text-lg font-medium text-gray-900 mb-2">Users</div>
            <div className="relative mb-5 border-b border-gray-400 pb-2">
              <HiSearch className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={editMembersSearchQuery}
                onChange={(event) => setEditMembersSearchQuery(event.target.value)}
                placeholder="Search Bots"
                className="w-full pl-8 pr-2 text-base bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none"
              />
            </div>

            <div className="max-h-[420px] overflow-y-auto pr-2 space-y-3">
              {orderedSelectableMembers.map((user) => {
                const isSelected = selectedMemberIds.includes(user.id);

                return (
                  <label key={user.id} className="flex items-center justify-between px-2 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleMemberSelection(user.id)}
                        className="w-5 h-5 accent-black"
                      />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${user.avatarColor}`}>
                        {user.avatar}
                      </div>
                      <span className="text-base text-gray-800">{user.username}</span>
                    </div>

                    {isSelected && (
                      <span className="px-3 py-1 rounded-lg bg-lime-300 text-gray-900 text-sm font-medium">MEMBER</span>
                    )}
                  </label>
                );
              })}

              {orderedSelectableMembers.length === 0 && (
                <p className="text-base text-gray-500 px-2 py-4">ไม่มีผู้ใช้ที่เลือกได้</p>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={handleSaveGroupMembers}
                className="px-10 py-2.5 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-base font-semibold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupportPanel;
