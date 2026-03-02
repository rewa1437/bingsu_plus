import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiSearch } from 'react-icons/hi';
import { knowledgeListRaw } from '../data/knowledgeData';

function KnowledgeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchQuery, setSearchQuery] = useState('');

  const groupsData = useMemo(() => [
    { id: 1, name: 'พพอ.' },
    { id: 2, name: 'บิงชู' },
    { id: 3, name: 'ถั่วแระ' },
    { id: 4, name: 'อชจ.' },
    { id: 5, name: 'บักอะ' },
  ], []);

  const fallbackKnowledgeNames = useMemo(
    () => ({
      1: 'Customer Service Guide',
      2: 'Product Catalog',
      3: 'Technical Documentation',
      4: 'Company Policy',
      5: 'FAQ Database',
      6: 'Training Materials',
      7: 'API Documentation',
      8: 'Marketing Content',
      9: 'Legal Documents',
      10: 'Health & Safety',
      11: 'Sales Playbook',
      12: 'Onboarding Guide',
      13: 'Brand Guidelines',
      14: 'IT Security',
      15: 'Quality Standards',
      16: 'Financial Procedures',
      17: 'Project Management',
      18: 'Customer Data',
      19: 'Product Roadmap',
      20: 'Contract Templates',
    }),
    []
  );

  const knowledge = useMemo(() => {
    const found = knowledgeListRaw.find(k => k.id === Number(id));
    return found || { id: Number(id), name: fallbackKnowledgeNames[Number(id)] || `Knowledge ${id}`, groups: [] };
  }, [id, fallbackKnowledgeNames]);

  const knowledgeName = knowledge.name;

  const getGroupNames = (groupIds) => {
    if (!groupIds || !Array.isArray(groupIds)) return [];
    return groupIds.map(groupId => {
      const group = groupsData.find(g => g.id === groupId);
      return group ? group.name : `Group ${groupId}`;
    });
  };

  const files = useMemo(
    () => [
      { id: 1, name: 'ข้าวมันไก่-สูตรดั้งเดิม.pdf', size: '3.26 mb' },
      { id: 2, name: 'ข้าวมันไก่-น้ำจิ้ม.pdf', size: '2.94 mb' },
      { id: 3, name: 'คู่มือครัวกลาง.pdf', size: '3.10 mb' },
      { id: 4, name: 'มาตรฐานวัตถุดิบ.pdf', size: '2.71 mb' },
      { id: 5, name: 'ขั้นตอนเตรียมไก่.pdf', size: '3.22 mb' },
      { id: 6, name: 'การจัดเสิร์ฟเมนู.pdf', size: '2.88 mb' },
      { id: 7, name: 'การควบคุมคุณภาพ.pdf', size: '3.18 mb' },
      { id: 8, name: 'คู่มือความปลอดภัยอาหาร.pdf', size: '3.35 mb' },
    ],
    []
  );

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return files;
    }
    const query = searchQuery.toLowerCase();
    return files.filter((file) => file.name.toLowerCase().includes(query));
  }, [files, searchQuery]);

  return (
    <div className='max-w-5xl'>
      <button
        onClick={() => navigate('/knowledge')}
        className='flex items-center gap-2 text-sm text-gray-800 hover:text-gray-900 mb-6'
      >
        <HiOutlineArrowLeft className='text-lg' />
        Back
      </button>

      <div className='mb-6'>
        <h1 className='text-3xl font-semibold text-gray-900 mb-1'>{knowledgeName}</h1>
        <p className='text-xs text-gray-500'>ชื่อนี้เป็นการกำหนดให้ AI และชื่อจึงข้อมูลจากเอกสารที่เก็บไว้เป็นไฟล์มาจากแหล่งอื่น</p>
      </div>

      <div className='mb-8'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>ไฟล์ที่อัปโหลด</h2>

        <div className='relative max-w-md mb-5'>
          <HiSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg' />
          <input
            type='text'
            placeholder='Search Data'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm'
          />
        </div>

        <div className='border border-gray-300 rounded-3xl p-4 min-h-[290px]'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl'>
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className='bg-gray-200 rounded-lg px-4 py-3 flex items-center justify-between text-sm text-gray-800'
              >
                <span className='truncate pr-2'>{file.name}</span>
                <span className='text-xs text-gray-700 whitespace-nowrap'>{file.size}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>กลุ่ม</h2>
        <div className='flex gap-3'>
          {knowledge?.groups && knowledge.groups.length > 0 ? (
            knowledge.groups.map((groupId, index) => (
              <div
                key={index}
                className='px-8 py-2.5 bg-yellow-400 rounded-full text-sm font-medium text-gray-900'
              >
                {getGroupNames([groupId])[0]}
              </div>
            ))
          ) : (
            <span className='text-gray-500 text-sm'>ไม่มีข้อมูล</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default KnowledgeDetail;