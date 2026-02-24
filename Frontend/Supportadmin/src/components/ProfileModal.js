import { HiLogout } from 'react-icons/hi';

function ProfileModal({ isOpen, onClose, onManageAccount, onSignOut, selectedAvatar, profileInitial }) {
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

        <button
          onClick={() => {
            onSignOut();
            onClose();
          }}
          className='w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-left mt-1'
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
