import { useEffect, useState } from 'react';
import { HiOutlineUser, HiTrash } from 'react-icons/hi';

const avatarOptions = [
  { key: 'dog', label: 'หมา', emoji: '🐶' },
  { key: 'cat', label: 'แมว', emoji: '🐱' },
  { key: 'pig', label: 'หมู', emoji: '🐷' }
];

function AccountModal({
  isOpen,
  onClose,
  selectedAvatar,
  onAvatarChange,
  profileName,
  onProfileNameChange,
  profileInitial
}) {
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowAvatarPicker(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-6' onClick={onClose}>
      <div
        className='w-full max-w-6xl bg-gray-200 rounded-[3rem] p-8'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='bg-white rounded-[2.5rem] p-10 flex gap-8 min-h-[500px]'>
          <aside className='w-1/3'>
            <div className='flex items-center gap-5 text-gray-800'>
              <HiOutlineUser className='text-2xl' />
              <span className='text-2xl font-light'>บัญชี</span>
            </div>
          </aside>

          <section className='flex-1'>
            <div className='flex items-start gap-5 mb-7'>
              <div className='w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center text-3xl'>
                <span className='text-gray-700 font-medium'>{selectedAvatar || profileInitial || 'P'}</span>
              </div>
              <div>
                <h2 className='text-3xl text-gray-900 leading-tight font-normal'>รูปโปรไฟล์</h2>
                <button
                  type='button'
                  onClick={() => setShowAvatarPicker((prev) => !prev)}
                  className='mt-3 px-3 py-1 rounded-full bg-gray-300 text-gray-800 text-sm font-light hover:bg-gray-400 transition-colors'
                >
                  Change Profile
                </button>
              </div>
            </div>

            {showAvatarPicker && (
              <div className='mb-6'>
                <p className='text-sm text-gray-700 mb-3'>เลือกอวาตาร์การ์ตูน</p>
                <div className='flex gap-3'>
                  {avatarOptions.map((option) => {
                    const isSelected = selectedAvatar === option.emoji;

                    return (
                      <button
                        key={option.key}
                        type='button'
                        onClick={() => {
                          onAvatarChange(option.emoji);
                          setShowAvatarPicker(false);
                        }}
                        className={`px-4 py-3 rounded-2xl border transition-colors ${
                          isSelected
                            ? 'border-gray-900 bg-gray-100'
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className='text-2xl leading-none'>{option.emoji}</div>
                        <div className='text-xs text-gray-700 mt-2'>{option.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className='mb-5'>
              <label className='block text-base font-light text-gray-900 mb-2'>Name</label>
              <input
                type='text'
                placeholder='Enter your name'
                value={profileName}
                onChange={(event) => onProfileNameChange(event.target.value)}
                className='w-full border border-gray-500 rounded-full px-4 py-2 text-base outline-none focus:ring-2 focus:ring-gray-300'
              />
            </div>

            <button className='text-blue-600 text-base font-light mb-6 hover:text-blue-700'>Change Password</button>

            <div className='flex items-center gap-3 text-red-500 text-base'>
              <HiTrash className='text-xl' />
              <button className='font-light hover:text-red-600'>Delete Account</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AccountModal;
