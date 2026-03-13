import { HiBell } from 'react-icons/hi';

function Dropdown({ options = [], selectedValue, onSelect, placeholder = "Select..." }) {
  // ...existing code for Dropdown component...
}

function NotificationBell({ onClick }) {
  return (
    <button
      className="relative bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-full p-2 shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center"
      title="Notifications"
      onClick={onClick}
    >
      <HiBell className="text-gray-700 text-xl" />
      {/* Optionally add badge */}
      {/* <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">3</span> */}
    </button>
  );
}

export { Dropdown, NotificationBell };
