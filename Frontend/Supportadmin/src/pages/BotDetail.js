import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { api } from '../services/api';
import { getStoredUser } from '../services/api';

function BotDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const bot = location.state?.bot;
  const storedUser = useMemo(() => getStoredUser(), []);
  const isAdmin = storedUser?.role === 'admin';

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    name: bot?.name || '',
    description: bot?.description || '',
    prompt: bot?.prompt ?? '',
  });

  useEffect(() => {
    setForm({
      name: bot?.name || '',
      description: bot?.description || '',
      prompt: bot?.prompt ?? '',
    });
  }, [bot?.name, bot?.description, bot?.prompt]);

  // Groups data for mapping group IDs to names
  const groupsData = [
    { id: 1, name: 'พพอ.', description: 'กลุ่มงานหลัก' },
    { id: 2, name: 'บิงชู', description: 'กลุ่มฝ่ายขาย' },
    { id: 3, name: 'ถั่วแระ', description: 'กลุ่มดูแลลูกค้า' },
    { id: 4, name: 'อชจ.', description: 'กลุ่มทดสอบระบบ' },
    { id: 5, name: 'บักอะ', description: 'กลุ่มสำรอง' }
  ];

  // Get group names from IDs
  const getGroupNames = (groupIds) => {
    if (!groupIds || !Array.isArray(groupIds)) return [];
    return groupIds.map(id => {
      const group = groupsData.find(g => g.id === id);
      return group ? group.name : `Group ${id}`;
    });
  };

  // ใช้ข้อมูลจากบอทที่ผู้ใช้สร้าง (prompt จริงจาก backend)
  const botData = {
    name: bot?.name || 'Bot Name',
    supportId: bot?.id ? `Support${bot.id.toString().padStart(3, '0')}` : 'Support001',
    avatar: bot?.color || 'bg-gray-300',
    basicInfo: bot?.name || '',
    description: bot?.description || '',
    systemPrompt: bot?.prompt ?? '',
    knowledge: bot?.knowledge || [],
    groups: getGroupNames(bot?.groups)
  };

  const handleBack = () => {
    navigate('/bots');
  };

  const canEdit = isAdmin && bot?.id;
  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.updateAdminBot(bot.id, {
        name: form.name,
        description: form.description,
        prompt: form.prompt,
      });
      setIsEditing(false);
      navigate('/bots');
    } catch (e) {
      setSaveError(e?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='pb-10'>
      {/* Back Button */}
      <button
        onClick={handleBack}
        className='flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors'
      >
        <HiArrowLeft className='text-2xl' />
      </button>

      {/* Bot Header */}
      <div className='flex items-center gap-4 mb-8'>
        <div className={`w-20 h-20 rounded-full ${botData.avatar} flex-shrink-0`}></div>
        <div>
          <h1 className='text-2xl font-semibold text-gray-800'>{botData.name}</h1>
          <p className='text-gray-500'>{botData.supportId}</p>
        </div>
      </div>

      {/* Form */}
      <div className='space-y-6 max-w-3xl'>
        {canEdit && (
          <div className='flex items-center justify-between'>
            <div className='text-sm text-gray-600'>โหมดแก้ไข (Admin)</div>
            <div className='flex gap-2'>
              {!isEditing ? (
                <button
                  type='button'
                  onClick={() => setIsEditing(true)}
                  className='px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm'
                >
                  แก้ไข
                </button>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={() => {
                      setIsEditing(false);
                      setSaveError('');
                      setForm({
                        name: bot?.name || '',
                        description: bot?.description || '',
                        prompt: bot?.prompt ?? '',
                      });
                    }}
                    className='px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 bg-white border border-gray-300 text-gray-700'
                    disabled={saving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type='button'
                    onClick={handleSave}
                    className='px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm disabled:opacity-60'
                    disabled={saving}
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {saveError && (
          <div className='p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700'>
            {saveError}
          </div>
        )}

        {/* Bot Name */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            ชื่อบอท
          </label>
          <input
            type='text'
            value={isEditing ? form.name : botData.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value.slice(0, 120) }))}
            readOnly={!isEditing}
            maxLength={120}
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${isEditing ? 'bg-white' : 'bg-gray-50 cursor-default'} text-gray-700`}
          />
          {isEditing && <p className='text-xs text-gray-500 mt-1'>ไม่เกิน 120 ตัวอักษร</p>}
        </div>

        {/* Basic Info */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            โมเดลพื้นฐาน (จาก)
          </label>
          <input
            type='text'
            value={botData.basicInfo}
            readOnly
            className='w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-default text-gray-700'
            placeholder='BingSu & Timsum'
          />
        </div>

        {/* Description */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            คำอธิบาย
          </label>
          <textarea
            value={isEditing ? form.description : botData.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value.slice(0, 2000) }))}
            readOnly={!isEditing}
            maxLength={2000}
            rows={8}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${isEditing ? 'bg-white' : 'bg-gray-50 cursor-default'} resize-none text-gray-700 break-words`}
            placeholder='อธิบายฟังก์ชันหรือวัตถุประสงค์ของบอท...'
          />
          {isEditing && <p className='text-xs text-gray-500 mt-1'>ไม่เกิน 2,000 ตัวอักษร</p>}
        </div>

        {/* System Prompt */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            พรอมต์ระบบของบอท
          </label>
          <textarea
            value={isEditing ? form.prompt : botData.systemPrompt}
            onChange={(e) => setForm((s) => ({ ...s, prompt: e.target.value.slice(0, 10000) }))}
            readOnly={!isEditing}
            maxLength={10000}
            rows={6}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${isEditing ? 'bg-white' : 'bg-gray-50 cursor-default'} resize-none font-mono text-sm text-gray-700 break-words`}
            placeholder='System prompt...'
          />
          {isEditing && <p className='text-xs text-gray-500 mt-1'>ไม่เกิน 10,000 ตัวอักษร</p>}
        </div>

        {/* Knowledge */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            ความรู้
          </label>
          <div className='flex flex-wrap gap-2'>
            {botData.knowledge && botData.knowledge.length > 0 ? (
              botData.knowledge.map((item, index) => (
                <span
                  key={index}
                  title={typeof item === 'string' ? item : ''}
                  className='inline-flex items-center max-w-full px-4 py-2 bg-yellow-400 text-gray-800 rounded-full text-sm font-medium truncate'
                >
                  {typeof item === 'string' ? (item.length > 40 ? item.slice(0, 37) + '...' : item) : item}
                </span>
              ))
            ) : (
              <span className='text-gray-500 text-sm'>ไม่มีข้อมูล</span>
            )}
          </div>
        </div>

        {/* Groups */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            กลุ่ม
          </label>
          <div className='flex flex-wrap gap-2'>
            {botData.groups && botData.groups.length > 0 ? (
              botData.groups.map((group, index) => (
                <span
                  key={index}
                  title={typeof group === 'string' ? group : ''}
                  className='inline-flex items-center max-w-full px-4 py-2 bg-yellow-400 text-gray-800 rounded-full text-sm font-medium truncate'
                >
                  {typeof group === 'string' ? (group.length > 30 ? group.slice(0, 27) + '...' : group) : group}
                </span>
              ))
            ) : (
              <span className='text-gray-500 text-sm'>ไม่มีข้อมูล</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BotDetail;
