import { useEffect, useRef, useState } from 'react';
import { HiLightBulb, HiChevronDown, HiChevronRight } from 'react-icons/hi';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function Home() {
  const viewerRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(900);
  const [isManualOpen, setIsManualOpen] = useState(false);

  useEffect(() => {
    const updatePageWidth = () => {
      if (!viewerRef.current) return;
      const width = viewerRef.current.clientWidth;
      setPageWidth(Math.max(320, Math.min(width - 24, 1000)));
    };

    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);
    return () => window.removeEventListener('resize', updatePageWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages: totalPages }) => {
    setNumPages(totalPages);
  };

  return (
    <div className='w-full h-full bg-gray-50 p-4 md:p-6'>
      <div className='mb-6 flex items-end justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold text-gray-800 mb-2'>Manual</h1>
          <p className='text-sm text-gray-600'>เอกสารคู่มือการใช้งานระบบ</p>
        </div>
        <a
          href='/1.pdf'
          target='_blank'
          rel='noopener noreferrer'
          className='px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors'
        >
          เปิดเอกสารในแท็บใหม่
        </a>
      </div>

      <div className='bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm'>
        <button
          type='button'
          onClick={() => setIsManualOpen((previousState) => !previousState)}
          className='w-full flex items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100 text-left'
        >
          <div className='flex items-center gap-3'>
            <div className='w-11 h-11 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0'>
              <HiLightBulb className='text-yellow-500 text-2xl' />
            </div>
            <div>
              <h2 className='text-xl font-semibold text-gray-800 leading-tight'>คู่มือการใช้งาน</h2>
              <p className='text-sm text-gray-500 mt-1'>ไฟล์เอกสาร PDF สำหรับอ้างอิงการใช้งานระบบ</p>
            </div>
          </div>
          {isManualOpen ? (
            <HiChevronDown className='text-gray-500 text-2xl shrink-0' />
          ) : (
            <HiChevronRight className='text-gray-500 text-2xl shrink-0' />
          )}
        </button>

        {isManualOpen && (
          <div ref={viewerRef} className='rounded-xl overflow-auto bg-gray-100 h-[74vh] p-3'>
            <Document
              file='/1.pdf'
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<p className='text-sm text-gray-500 text-center py-6'>กำลังโหลดเอกสาร...</p>}
              error={<p className='text-sm text-red-500 text-center py-6'>ไม่สามารถโหลดไฟล์ PDF ได้</p>}
            >
              <div className='flex flex-col items-center gap-3'>
                {Array.from(new Array(numPages), (_, index) => (
                  <Page
                    key={`manual-page-${index + 1}`}
                    pageNumber={index + 1}
                    width={pageWidth}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                ))}
              </div>
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
