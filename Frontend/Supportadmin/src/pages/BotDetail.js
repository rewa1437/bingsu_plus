import { useNavigate, useLocation } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { botListRaw } from '../data/botsData';

function BotDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const bot = location.state?.bot;

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

  // Default bot data if none provided
  const botData = {
    name: bot?.name || 'Bot Name',
    supportId: bot?.id ? `Support${bot.id.toString().padStart(3, '0')}` : 'Support001',
    avatar: bot?.color || 'bg-gray-300',
    basicInfo: bot?.name || '',
    description: bot?.description || '',
    systemPrompt: `You are a World-Class Professional Artist with deep knowledge in drawing, painting, anatomy, composition, color theory, and visual storytelling.
You also act as a patient teacher who can explain art clearly to beginners.
Personality:
Friendly and supportive
Patient and calm
Encouraging, not judgmental
Speak like a real art mentor
Explain things in simple language`,
    knowledge: bot?.knowledge || [],
    groups: getGroupNames(bot?.groups)
  };

  const handleBack = () => {
    navigate('/bots');
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
            value={botData.description}
            readOnly
            rows={8}
            className='w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 resize-none cursor-default text-gray-700'
            placeholder='อธิบายฟังก์ชันหรือวัตถุประสงค์ของบอท...'
          />
        </div>

        {/* System Prompt */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            พรอมต์ระบบของบอท
          </label>
          <textarea
            value={botData.systemPrompt}
            readOnly
            rows={6}
            className='w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 resize-none font-mono text-sm cursor-default text-gray-700'
            placeholder='System prompt...'
          />
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
                  className='inline-flex items-center px-4 py-2 bg-yellow-400 text-gray-800 rounded-full text-sm font-medium'
                >
                  {item}
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
                  className='inline-flex items-center px-4 py-2 bg-yellow-400 text-gray-800 rounded-full text-sm font-medium'
                >
                  {group}
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
