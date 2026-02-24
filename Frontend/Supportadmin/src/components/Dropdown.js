function Dropdown({ options = [], selectedValue, onSelect, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center justify-between w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedValue ? selectedValue : placeholder}</span>
        <HiChevronDown className="ml-2 text-gray-500" />
      </button>
      {isOpen && (
        <ul className="absolute left-0 mt-2 w-full bg-white border border-gray-300 rounded shadow-lg z-10">
          {options.map((option, idx) => (
            <li
              key={option}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Dropdown;
