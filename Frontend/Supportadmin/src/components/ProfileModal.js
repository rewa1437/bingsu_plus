import { HiLogout, HiShieldCheck, HiUser } from 'react-icons/hi';

function ProfileModal({ isOpen, onClose, onManageAccount, onSignOut, selectedAvatar, profileInitial, userRole, onRoleChange }) {
  if (!isOpen) return null;

  return (
    <>
      <div className='fixed inset-0 bg-transparent z-40' onClick={onClose} />

      <div
        className='absolute bottom-20 left-4 bg-white rounded-3xl shadow-lg w-60 z-50 border border-gray-200 p-4'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            onManageAccount();
            onClose();
          }}
          className='w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-left'
        >
          <div className='w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold bg-gradient-to-br from-[#F5C200] to-[#F0A500] text-gray-800 shadow-md'>
            {selectedAvatar || profileInitial || 'P'}
          </div>
          <span className='text-lg leading-none text-gray-900 font-semibold'>จัดการบัญชี</span>
        </button>

        <div className='mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm'>
          <div className='text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wide'>
            <HiShieldCheck className='text-sm' />
            เลือก Role
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => {
                onRoleChange('support');
                onClose();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 transform ${
                userRole === 'support'
                  ? 'bg-[#F5C200] text-gray-800 shadow-lg scale-105'
                  : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#F5C200] hover:bg-yellow-50'
              }`}
            >
              <HiUser className='text-base' />
              Support
            </button>
            <button
              onClick={() => {
                onRoleChange('admin');
                onClose();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 transform ${
                userRole === 'admin'
                  ? 'bg-[#8B8680] text-white shadow-lg scale-105'
                  : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#8B8680] hover:bg-gray-100'
              }`}
            >
              <HiShieldCheck className='text-base' />
              Admin
            </button>
          </div>
          <div className='text-xs text-gray-500 mt-3 text-center font-medium'>
            {userRole === 'admin' ? '✓ สิทธิเต็ม' : '⊙ สิทธิจำกัด'}
          </div>
        </div>

        <button
          onClick={() => {
            onSignOut();
            onClose();
          }}
          className='w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-all duration-200 text-left mt-4 group'
        >
          <div className='w-12 h-12 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-all'>
            <HiLogout className='text-red-600 text-lg font-semibold' />
          </div>
          <span className='text-lg leading-none text-red-600 font-semibold'>Sign Out</span>
        </button>
      </div>
    </>
  );
}

export default ProfileModal;
