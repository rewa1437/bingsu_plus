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
          <div className='w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 text-xl'>
            <span className='text-gray-700 font-medium'>{selectedAvatar || profileInitial || 'P'}</span>
          </div>
          <span className='text-lg leading-none text-gray-900 font-medium'>จัดการบัญชี</span>
        </button>

        <div className='mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200'>
          <div className='text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1'>
            <HiShieldCheck className='text-sm' />
            เลือก Role
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => {
                onRoleChange('admin');
                onClose();
              }}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                userRole === 'admin'
                  ? 'bg-[#8B8680] text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiShieldCheck className='text-sm' />
              Admin
            </button>
            <button
              onClick={() => {
                onRoleChange('support');
                onClose();
              }}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                userRole === 'support'
                  ? 'bg-[#F5C200] text-gray-800 shadow-md'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiUser className='text-sm' />
              Support
            </button>
          </div>
          <div className='text-xs text-gray-500 mt-2 text-center'>
            {userRole === 'admin' ? 'สิทธิเต็ม' : 'สิทธิจำกัด'}
          </div>
        </div>

        <button
          onClick={() => {
            onSignOut();
            onClose();
          }}
          className='w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-left mt-3'
        >
          <div className='w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0'>
            <HiLogout className='text-red-500 text-xl' />
          </div>
          <span className='text-lg leading-none text-red-500 font-medium'>Sign Out</span>
        </button>
      </div>
    </>
  );
}

export default ProfileModal;
