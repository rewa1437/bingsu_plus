import { useEffect, useRef, useState } from 'react';
import { HiLightBulb, HiChevronDown, HiChevronRight, HiDownload, HiBookOpen, HiCurrencyDollar, HiPresentationChartBar } from 'react-icons/hi';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function Home() {
  const viewerRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(900);
  const [openDocument, setOpenDocument] = useState(null);
  const [openSubcategory, setOpenSubcategory] = useState(null);

  const documents = [
    { 
      id: 'form', 
      type: 'content',
      title: 'แบบฟอร์มบันทึก', 
      description: 'รวมแบบฟอร์มการใช้งานที่เกี่ยวข้องกับระบบ BingSu', 
      icon: HiLightBulb, 
      iconBg: 'bg-yellow-100', 
      iconColor: 'text-yellow-500',
      subcategories: [
        {
          id: 'form-trial',
          title: 'แบบฟอร์มขอทดลองใช้งาน BingSu',
          content: [
            { type: 'pdf', file: '/BingSu Trial Request Form.pdf' }
          ]
        },
        {
          id: 'form-issue',
          title: 'แบบฟอร์มสำหรับแจ้งปัญหาการใช้งาน BingSu',
          content: [
            { type: 'pdf', file: '/BingSu Issue Report Form.pdf' }
          ]
        },
        {
          id: 'form-poc',
          title: 'แบบฟอร์มสำหรับขอข้อมูล POC ของ BingSu',
          content: [
            { type: 'pdf', file: '/BingSu POC Request.pdf' }
          ]
        },
        {
          id: 'form-tech-issue',
          title: 'แบบฟอร์มแจ้งปัญหาการใช้งานด้านเทคนิค',
          content: [
            { type: 'pdf', file: '/BingSu Technical Issue Report Form.pdf' }
          ]
        }
      ]
    },
    { 
      id: 'manual', 
      type: 'content',
      title: 'คู่มือการใช้งาน', 
      description: 'คู่มือการใช้งานระบบอย่างละเอียด', 
      icon: HiBookOpen, 
      iconBg: 'bg-blue-100', 
      iconColor: 'text-blue-500',
      subcategories: [
        {
          id: 'manual-getting-started',
          title: 'เริ่มต้นใช้งาน',
          content: [
            { type: 'text', value: 'ขั้นตอนการเริ่มต้นใช้งานระบบ BingSu Support & Admin' },
            { type: 'list', items: ['สร้างบัญชีผู้ใช้งาน', 'ตั้งค่าโปรไฟล์', 'เชื่อมต่อบอท', 'จัดการฐานความรู้'] }
          ]
        },
        {
          id: 'manual-features',
          title: 'ฟีเจอร์หลัก',
          content: [
            { type: 'text', value: 'ฟีเจอร์และความสามารถต่างๆ ของระบบ' },
            { type: 'list', items: ['การจัดการบอท', 'ระบบ Knowledge Base', 'แดชบอร์ดและรายงาน', 'การจัดการผู้ใช้'] }
          ]
        },
        {
          id: 'manual-troubleshooting',
          title: 'แก้ไขปัญหา',
          content: [
            { type: 'text', value: 'วิธีแก้ไขปัญหาที่พบบ่อย' },
            { type: 'list', items: ['บอทไม่ตอบสนอง', 'ปัญหาการเชื่อมต่อ', 'ข้อผิดพลาดในการอัปโหลด', 'ติดต่อฝ่ายสนับสนุน'] }
          ]
        }
      ]
    },
    { 
      id: 'pricing', 
      type: 'content',
      title: 'ราคา', 
      description: 'รายละเอียดราคาและแพ็คเกจต่างๆ', 
      icon: HiCurrencyDollar, 
      iconBg: 'bg-green-100', 
      iconColor: 'text-green-500',
      subcategories: [
        {
          id: 'pricing-basic',
          title: 'แพ็คเกจ Basic',
          content: [
            { type: 'price', value: '฿999/เดือน' },
            { type: 'list', items: ['1 บอท', '1,000 conversations/เดือน', 'ฐานความรู้ 100 MB', 'รองรับพื้นฐาน'] }
          ]
        },
        {
          id: 'pricing-pro',
          title: 'แพ็คเกจ Pro',
          content: [
            { type: 'price', value: '฿2,999/เดือน' },
            { type: 'list', items: ['5 บอท', '10,000 conversations/เดือน', 'ฐานความรู้ 1 GB', 'รองรับ 24/7', 'วิเคราะห์ขั้นสูง'] }
          ]
        },
        {
          id: 'pricing-enterprise',
          title: 'แพ็คเกจ Enterprise',
          content: [
            { type: 'price', value: 'ติดต่อเรา' },
            { type: 'list', items: ['บอทไม่จำกัด', 'Conversations ไม่จำกัด', 'ฐานความรู้ไม่จำกัด', 'รองรับเฉพาะทาง', 'ปรับแต่งได้เต็มรูปแบบ'] }
          ]
        }
      ]
    },
    { 
      id: 'presentation', 
      type: 'content',
      title: 'สไลด์นำเสนอ', 
      description: 'สไลด์นำเสนอข้อมูลระบบ', 
      icon: HiPresentationChartBar, 
      iconBg: 'bg-purple-100', 
      iconColor: 'text-purple-500',
      subcategories: [
        {
          id: 'presentation-overview',
          title: 'ภาพรวมระบบ',
          content: [
            { type: 'text', value: 'แนะนำระบบ BingSu Support & Admin' },
            { type: 'list', items: ['ระบบ AI Chatbot อัจฉริยะ', 'รองรับหลายช่องทาง', 'จัดการง่าย ใช้งานสะดวก', 'รายงานและวิเคราะห์แบบ Real-time'] }
          ]
        },
        {
          id: 'presentation-benefits',
          title: 'ประโยชน์และข้อดี',
          content: [
            { type: 'text', value: 'ประโยชน์ที่คุณจะได้รับ' },
            { type: 'list', items: ['ลดต้นทุนการบริการลูกค้า', 'ตอบคำถามอัตโนมัติ 24/7', 'เพิ่มประสิทธิภาพทีมงาน', 'ข้อมูลเชิงลึกเพื่อการตัดสินใจ'] }
          ]
        },
        {
          id: 'presentation-demo',
          title: 'ตัวอย่างการใช้งาน',
          content: [
            { type: 'text', value: 'กรณีศึกษาและตัวอย่างการใช้งานจริง' },
            { type: 'list', items: ['E-commerce Support', 'การบริการลูกค้า', 'ศูนย์ช่วยเหลือภายใน', 'Lead Generation'] }
          ]
        }
      ]
    }
  ];

  useEffect(() => {
    const updatePageWidth = () => {
      if (!viewerRef.current) return;
      const width = viewerRef.current.clientWidth;
      setPageWidth(Math.max(320, Math.min(width - 48, 1400)));
    };

    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);
    return () => window.removeEventListener('resize', updatePageWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages: totalPages }) => {
    setNumPages(totalPages);
  };

  return (
    <div className='w-full h-full p-4 md:p-6'>
      <div className='mb-6 flex items-end justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold text-gray-800 mb-2'>Manual</h1>
          <p className='text-sm text-gray-600'>เอกสารคู่มือการใช้งานระบบ</p>
        </div>
      </div>

      <div className='space-y-6'>
        {documents.map((doc) => (
          <div key={doc.id} className='bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm'>
            <button
              type='button'
              onClick={() => {
                setOpenDocument(openDocument === doc.id ? null : doc.id);
                setOpenSubcategory(null); // Reset subcategory when switching documents
              }}
              className='w-full flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors rounded-lg px-2 py-2 -mx-2'
            >
              <div className='flex items-center gap-3'>
                <div className={`w-11 h-11 rounded-xl ${doc.iconBg} flex items-center justify-center shrink-0`}>
                  <doc.icon className={`${doc.iconColor} text-2xl`} />
                </div>
                <div>
                  <h2 className='text-xl font-semibold text-gray-800 leading-tight'>{doc.title}</h2>
                  <p className='text-sm text-gray-500 mt-1'>{doc.description}</p>
                </div>
              </div>
              {openDocument === doc.id ? (
                <HiChevronDown className='text-gray-500 text-2xl shrink-0' />
              ) : (
                <HiChevronRight className='text-gray-500 text-2xl shrink-0' />
              )}
            </button>

            {openDocument === doc.id && (
              <>
                <div className='border-t border-gray-100 mt-4 pt-4'>
                  {doc.type === 'pdf' ? (
                    // PDF Viewer
                    <>
                      <div className='flex justify-end mb-4'>
                        <a
                          href={doc.file}
                          download={doc.file}
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium transition-colors'
                        >
                          <HiDownload className='text-base' />
                          ดาวน์โหลดเอกสาร
                        </a>
                      </div>
                      <div ref={viewerRef} className='rounded-xl overflow-auto bg-gray-100 h-[85vh] p-6'>
                        <Document
                          file={doc.file}
                          onLoadSuccess={onDocumentLoadSuccess}
                          loading={<p className='text-sm text-gray-500 text-center py-6'>กำลังโหลดเอกสาร...</p>}
                          error={<p className='text-sm text-red-500 text-center py-6'>ไม่สามารถโหลดไฟล์ PDF ได้</p>}
                        >
                          <div className='flex flex-col items-center gap-4'>
                            {Array.from(new Array(numPages), (_, index) => (
                              <Page
                                key={`${doc.id}-page-${index + 1}`}
                                pageNumber={index + 1}
                                width={pageWidth}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                              />
                            ))}
                          </div>
                        </Document>
                      </div>
                    </>
                  ) : (
                    // Content with Subcategories
                    <div className='space-y-3'>
                      {doc.subcategories.map((subcat) => {
                        const hasPDF = subcat.content.some(item => item.type === 'pdf');
                        const pdfFile = hasPDF ? subcat.content.find(item => item.type === 'pdf')?.file : null;
                        
                        return (
                        <div key={subcat.id} className='border border-gray-200 rounded-xl overflow-hidden'>
                          <button
                            type='button'
                            onClick={() => setOpenSubcategory(openSubcategory === subcat.id ? null : subcat.id)}
                            className='w-full flex items-center justify-between gap-3 p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left'
                          >
                            <h3 className='text-base font-semibold text-gray-800'>{subcat.title}</h3>
                            {openSubcategory === subcat.id ? (
                              <HiChevronDown className='text-gray-500 text-lg shrink-0' />
                            ) : (
                              <HiChevronRight className='text-gray-500 text-lg shrink-0' />
                            )}
                          </button>
                          
                          {openSubcategory === subcat.id && hasPDF && pdfFile && (
                            <div className='flex justify-end p-3 border-b border-gray-200'>
                              <a
                                href={pdfFile}
                                download={pdfFile.split('/').pop()}
                                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium transition-colors'
                              >
                                <HiDownload className='text-base' />
                                ดาวน์โหลดเอกสาร
                              </a>
                            </div>
                          )}
                          
                          {openSubcategory === subcat.id && (
                            <div className={`${hasPDF ? 'p-4' : 'bg-white p-4 space-y-3'}`}>
                              {subcat.content.map((item, idx) => (
                                <div key={idx}>
                                  {item.type === 'text' && (
                                    <p className='text-gray-700 text-sm leading-relaxed'>{item.value}</p>
                                  )}
                                  {item.type === 'price' && (
                                    <div className='text-2xl font-bold text-green-600 mb-2'>{item.value}</div>
                                  )}
                                  {item.type === 'list' && (
                                    <ul className='space-y-2 ml-4'>
                                      {item.items.map((listItem, listIdx) => (
                                        <li key={listIdx} className='flex items-start gap-2 text-sm text-gray-600'>
                                          <span className='text-blue-500 mt-1'>•</span>
                                          <span>{listItem}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {item.type === 'pdf' && (
                                    <div className='rounded-xl overflow-hidden shadow-sm h-[80vh]'>
                                      <div className='h-full overflow-auto p-6'>
                                      <Document
                                        file={item.file}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        loading={<p className='text-sm text-gray-500 text-center py-6'>กำลังโหลดเอกสาร...</p>}
                                        error={<p className='text-sm text-red-500 text-center py-6'>ไม่สามารถโหลดไฟล์ PDF ได้</p>}
                                      >
                                        <div className='flex flex-col items-center gap-4'>
                                          {Array.from(new Array(numPages), (_, index) => (
                                            <Page
                                              key={`subcat-pdf-page-${index + 1}`}
                                              pageNumber={index + 1}
                                              width={Math.min(pageWidth, 1200)}
                                              renderTextLayer={false}
                                              renderAnnotationLayer={false}
                                            />
                                          ))}
                                        </div>
                                      </Document>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
