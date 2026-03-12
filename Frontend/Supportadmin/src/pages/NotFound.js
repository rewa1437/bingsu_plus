import { HiOutlineArrowLeft, HiOutlineHome, HiOutlineSearchCircle } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen flex items-center justify-center bg-white px-4 py-8 sm:px-6'>
      <div className='w-full max-w-3xl overflow-hidden rounded-3xl border border-yellow-100 bg-gradient-to-br from-yellow-50 via-white to-orange-50 shadow-sm'>
        <div className='grid md:grid-cols-[1.1fr_0.9fr]'>
          <div className='p-8 md:p-10'>
            <p className='inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700'>
              Page not found
            </p>
            <h1 className='mt-5 text-5xl font-bold tracking-tight text-gray-900 md:text-6xl'>404</h1>
            <h2 className='mt-3 text-2xl font-semibold text-gray-800'>ไม่พบหน้าที่คุณต้องการ</h2>
            <p className='mt-4 max-w-lg text-sm leading-6 text-gray-500 md:text-base'>
              ลิงก์อาจพิมพ์ผิด หน้านี้อาจถูกย้าย หรือไม่มีอยู่ในระบบแล้ว ลองกลับไปหน้าหลักหรือย้อนกลับไปยังหน้าก่อนหน้า
            </p>

            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <button
                type='button'
                onClick={() => navigate('/dashboard')}
                className='inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-yellow-500'
              >
                <HiOutlineHome className='text-lg' />
                กลับไป Dashboard
              </button>
              <button
                type='button'
                onClick={() => navigate(-1)}
                className='inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50'
              >
                <HiOutlineArrowLeft className='text-lg' />
                ย้อนกลับ
              </button>
            </div>
          </div>

          <div className='flex items-center justify-center bg-gradient-to-br from-yellow-100/80 via-yellow-50 to-orange-100/70 p-8 md:p-10'>
            <div className='relative flex h-56 w-56 items-center justify-center rounded-full border border-white/80 bg-white/70 shadow-inner'>
              <div className='absolute inset-6 rounded-full border border-dashed border-yellow-200'></div>
              <div className='absolute right-10 top-10 h-4 w-4 rounded-full bg-yellow-300'></div>
              <div className='absolute bottom-12 left-12 h-3 w-3 rounded-full bg-orange-300'></div>
              <div className='flex flex-col items-center text-center'>
                <HiOutlineSearchCircle className='text-7xl text-yellow-500' />
                <span className='mt-3 text-sm font-medium text-gray-500'>ตรวจสอบ URL อีกครั้ง</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFound;