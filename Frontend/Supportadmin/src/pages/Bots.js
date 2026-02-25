import { HiSearch, HiTrash } from 'react-icons/hi';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { botListRaw, BOT_LIMIT_PER_USER } from '../data/botsData';

function Bots() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const itemsPerPage = 12;
  
  // Avatar color variants
  const avatarColors = [
    'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400',
    'bg-green-400', 'bg-yellow-400', 'bg-red-400', 'bg-teal-400',
    'bg-orange-400', 'bg-cyan-400', 'bg-lime-400', 'bg-rose-400',
    'bg-violet-400', 'bg-fuchsia-400', 'bg-emerald-400', 'bg-amber-400',
    'bg-sky-400', 'bg-slate-400', 'bg-blue-500', 'bg-purple-500',
    'bg-pink-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-cyan-500', 'bg-rose-500',
    'bg-violet-500', 'bg-orange-500'
  ];
  
  const getCappedBotList = (rawList) => {
    const userBotCount = {};
    return rawList.filter((bot) => {
      const nextCount = (userBotCount[bot.username] || 0) + 1;
      userBotCount[bot.username] = nextCount;
      return nextCount <= BOT_LIMIT_PER_USER;
    });
  };

  const [botList, setBotList] = useState(() =>
    getCappedBotList(botListRaw).map((bot, index) => ({
      ...bot,
      color: avatarColors[index % avatarColors.length],
    }))
  );

  // Filter bots with useMemo for performance
  const filteredBots = useMemo(() => {
    return botList.filter(bot => 
      bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bot.description && bot.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (bot.username && bot.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [botList, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBots.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBots = filteredBots.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleStatusToggle = (e, botId) => {
    e.stopPropagation();
    // Frontend only - just update local state
    setBotList(botList.map(b => b.id === botId ? { ...b, enabled: !b.enabled } : b));
  };

  const handleBotClick = (bot) => {
    navigate(`/bots/${bot.id}`, { state: { bot } });
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId === null) return;
    setBotList(botList.filter((bot) => bot.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  };

  return (
    <>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-semibold text-gray-800 mb-4'>
          Bots <span className='text-gray-600 font-normal'>{filteredBots.length}</span>
        </h1>
        
        {/* Search Input */}
        <div className='relative max-w-md'>
          <HiSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl' />
          <input
            type='text'
            placeholder='Search Bots / Username'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-700 placeholder-gray-400'
            aria-label='Search bots'
          />
        </div>
      </div>

      {/* Content - Bot List */}
      <div className='flex-1 flex flex-col'>
        {filteredBots.length > 0 ? (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3'>
              {paginatedBots.map(bot => {
              return (
                <div 
                  key={bot.id} 
                  className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col'
                >
                  {/* Top row: Avatar/Name + Status Switch */}
                  <div className='flex items-start justify-between gap-4 mb-4'>
                    <div className='flex items-start gap-4 flex-1'>
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full ${bot.color} flex-shrink-0 transition-all ${
                        !bot.enabled ? 'grayscale opacity-50' : ''
                      }`}></div>
                      
                      {/* Content */}
                      <div className={`flex-1 min-w-0 transition-all ${
                        !bot.enabled ? 'opacity-50' : ''
                      }`}>
                        <h3 className={`text-base font-semibold mb-1 ${
                          bot.enabled ? 'text-gray-800' : 'text-gray-400'
                        }`}>{bot.name}</h3>
                      </div>
                    </div>

                    {/* Status Toggle */}
                    <button
                      type='button'
                      onClick={(e) => handleStatusToggle(e, bot.id)}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none flex-shrink-0 ${
                          bot.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                        bot.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Description */}
                  <div className='mb-3'>
                    <p className='text-sm text-gray-600'>{bot.description || 'No description'}</p>
                  </div>
                  
                  {/* Bottom row: Username and Detail Button */}
                  <div className='flex justify-between items-center mt-auto'>
                    <p className={`text-xs ${
                      bot.enabled ? 'text-gray-500' : 'text-gray-400'
                    }`}>By {bot.username}</p>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => handleBotClick(bot)}
                        className='px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm'
                      >
                        รายละเอียด
                      </button>
                      <button
                        type='button'
                        onClick={() => setConfirmDeleteId(bot.id)}
                        className='inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium'
                      >
                        <HiTrash className='text-lg' />
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex justify-center items-center gap-2 mt-auto pt-3'>
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                ←
              </button>

              {/* Page Numbers */}
              {[...Array(totalPages)].map((_, index) => {
                const pageNum = index + 1;
                // Show first page, last page, current page, and pages around current
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-yellow-400 text-gray-800'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 2 ||
                  pageNum === currentPage + 2
                ) {
                  return <span key={pageNum} className='px-2 text-gray-400'>...</span>;
                }
                return null;
              })}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                →
              </button>
            </div>
          )}
          </>
        ) : (
          <div className='text-center py-16'>
            <p className='text-gray-500 text-lg mb-4'>No bots found</p>
            <p className='text-gray-400 text-sm'>Try adjusting your search query</p>
          </div>
        )}
      </div>

      {confirmDeleteId !== null && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-sm rounded-xl bg-white p-6 shadow-lg'>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>ยืนยันการลบ</h3>
            <p className='text-sm text-gray-600 mb-5'>ต้องการลบบอทนี้ใช่ไหม?</p>
            <div className='flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setConfirmDeleteId(null)}
                className='px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50'
              >
                ยกเลิก
              </button>
              <button
                type='button'
                onClick={handleConfirmDelete}
                className='px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600'
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Bots;
