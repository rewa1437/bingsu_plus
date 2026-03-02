import { useNavigate } from 'react-router-dom';
import { HiSearch, HiTrash } from 'react-icons/hi';
import { useState, useMemo, useEffect } from 'react';
import { knowledgeListRaw, KNOWLEDGE_LIMIT_PER_USER } from '../data/knowledgeData';

function Knowledge({ userRole = 'support' }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const itemsPerPage = 12;
  const isAdmin = userRole !== 'support';
  const getCappedKnowledgeList = (rawList) => {
    const userKnowledgeCount = {};
    return rawList.filter((knowledge) => {
      const nextCount = (userKnowledgeCount[knowledge.username] || 0) + 1;
      userKnowledgeCount[knowledge.username] = nextCount;
      return nextCount <= KNOWLEDGE_LIMIT_PER_USER;
    });
  };

  const [knowledgeList, setKnowledgeList] = useState(() => getCappedKnowledgeList(knowledgeListRaw));

  // Filter knowledge based on search query
  const filteredKnowledgeList = useMemo(() => {
    if (!searchQuery.trim()) {
      return knowledgeList;
    }
    const query = searchQuery.toLowerCase();
    return knowledgeList.filter(k => 
      k.name.toLowerCase().includes(query) ||
      (k.description && k.description.toLowerCase().includes(query)) ||
      (k.username && k.username.toLowerCase().includes(query))
    );
  }, [knowledgeList, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredKnowledgeList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedKnowledgeList = filteredKnowledgeList.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleConfirmDelete = () => {
    if (confirmDeleteId === null) return;
    setKnowledgeList(knowledgeList.filter((knowledge) => knowledge.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  };

  return (
    <>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-semibold text-gray-800 mb-4'>
          Knowledge <span className='text-gray-600 font-normal'>{filteredKnowledgeList.length}</span>
        </h1>
        
        {/* Search Input */}
        <div className='relative max-w-md'>
          <HiSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl' />
          <input
            type='text'
            placeholder='Search Knowledge'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-700 placeholder-gray-400'
          />
        </div>
      </div>

      {/* Knowledge List */}
      <div className='flex-1 flex flex-col'>
        {filteredKnowledgeList.length > 0 ? (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3'>
              {paginatedKnowledgeList.map((knowledge) => (
              <div
                key={knowledge.id}
                className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col'
              >
                <div className='flex-1'>
                  <h3 className='text-base font-semibold text-gray-800 mb-1'>{knowledge.name}</h3>
                  <p className='text-sm text-gray-600'>{knowledge.description || 'No description'}</p>
                </div>
                <div className='flex justify-between items-center mt-4'>
                  <p className='text-xs text-gray-500'>By {knowledge.username}</p>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() =>
                        navigate(`/knowledge/${knowledge.id}/add-data`, {
                          state: { knowledgeName: knowledge.name },
                        })
                      }
                      className='px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm'
                    >
                      รายละเอียด
                    </button>
                    {isAdmin && (
                    <button
                      type='button'
                      onClick={() => setConfirmDeleteId(knowledge.id)}
                      className='inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium'
                    >
                      <HiTrash className='text-lg' />
                      ลบ
                    </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
            <p className='text-gray-500 text-lg mb-4'>No knowledge found</p>
            <p className='text-gray-400 text-sm'>Try adjusting your search query</p>
          </div>
        )}
      </div>

      {confirmDeleteId !== null && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-sm rounded-xl bg-white p-6 shadow-lg'>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>ยืนยันการลบ</h3>
            <p className='text-sm text-gray-600 mb-5'>ต้องการลบรายการนี้ใช่ไหม?</p>
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

export default Knowledge;
