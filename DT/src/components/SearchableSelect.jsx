import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

const SearchableSelect = ({
    value,
    onChange,
    options = [],
    placeholder = '',
    className = '',
    onFocus,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [isKeyboard, setIsKeyboard] = useState(false);

    // value가 변경되면 filterText도 동기화 (단, 타이핑 중에는 유지)
    useEffect(() => {
        if (!isKeyboard) {
            setFilterText(value || '');
        }
    }, [value, isKeyboard]);

    const containerRef = useRef(null);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsKeyboard(false);
                // 닫힐 때, 입력값이 유효하지 않으면? (선택사항: 그냥 둠)
                // 입력된 텍스트가 value와 다르면, 입력된 텍스트를 value로 업데이트 (자유 입력 허용 시)
                if (filterText !== value) {
                    onChange(filterText);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [filterText, value, onChange]);

    const handleInputChange = (e) => {
        const text = e.target.value;
        setFilterText(text);
        onChange(text); // 부모에게 변경 알림 (필터링용)
        setIsOpen(true); // 타이핑 시 드롭다운 열기
        setIsKeyboard(true);
    };

    const handleOptionClick = (optionValue) => {
        onChange(optionValue);
        setFilterText(optionValue);
        setIsOpen(false);
        setIsKeyboard(false);
    };

    const toggleDropdown = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        // 화살표 클릭 시에는 필터링 없이 전체 목록을 보고 싶어하는 경우가 많음
        // 하지만 UX상 현재 입력값이 있으면 그것을 기준으로 필터링된 걸 보여주는게 나을 수도 있음.
        // User Request: "화살표를 클릭하면 드롭다운 전체 메뉴를 보여줘" -> OK.
    };

    // 옵션 필터링 로직
    // 1. 타이핑으로 열렸을 때 (isKeyboard): 입력값 기준 필터링
    // 2. 화살표로 열렸을 때 (!isKeyboard): 전체 목록 표시 (또는 현재 값이 있어도 전체 표시)
    // 사용자 요청: "화살표 클릭하면 전체 메뉴" -> isOpen && !isKeyboard 일때 전체 표시?
    // 하지만 타이핑하다가 화살표 누를 수도 있음.
    // 전략: 
    // - Input focus/change -> Filtered List
    // - Arrow Click -> Full List

    // 단순화: 
    // Arrow Click (toggle) -> 만약 열리면 무조건 전체 리스트 보여주기 모드로?
    // 하지만 SearchableSelect니까 검색도 되어야 함.

    // 절충안:
    // 렌더링할 옵션 목록을 결정할 때,
    // - 만약 사용자가 '타이핑' 중이라면 (input focus & typing) -> 필터링
    // - 만약 사용자가 '화살표'를 눌렀다면 -> 전체

    // 여기서는 간단히:
    // 화살표 버튼을 누르면 filterText를 비우진 않지만, 보여주는 리스트는 전체를 보여주도록 함.
    // 하지만 filterText가 있는데 리스트는 전체라면 괴리감이 있음.
    // -> 화살표 누르면 "전체 목록을 보여주되, 현재 선택된 것은 하이라이트"가 정석.
    // 여기서는 "보여주는 목록"을 `displayOptions`로 분리.

    let displayOptions = options;
    if (isOpen && isKeyboard && filterText) {
        // 키보드 입력 중일 때만 필터링
        displayOptions = options.filter(opt =>
            String(opt).toUpperCase().includes(filterText.toUpperCase())
        );
    }
    // 화살표 클릭 등으로 그냥 열렸을 때는 displayOptions = options (전체)

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="flex items-center border border-gray-300 rounded bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <input
                    type="text"
                    value={filterText}
                    onChange={handleInputChange}
                    onFocus={(e) => {
                        if (onFocus) onFocus(e);
                        // 포커스 시 자동으로 열리게 할지? 보통은 아님. 타이핑 시작하거나 화살표 눌러야 함.
                        // 하지만 "검색형"이므로 포커스하면 전체 목록 보여주는 것도 방법.
                        // 일단 사용자 요청은 "화살표 클릭 시"임.
                    }}
                    placeholder={placeholder}
                    className="w-full px-2 py-1 outline-none text-center bg-transparent disabled:bg-gray-100"
                    disabled={disabled}
                />
                <button
                    type="button"
                    onClick={() => {
                        setIsKeyboard(false); // 키보드 모드 해제 (전체 목록 표시)
                        setIsOpen(!isOpen);   // 토글
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 border-l border-gray-200"
                    disabled={disabled}
                    tabIndex={-1} // 탭으로 이동 안되게
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>

            {isOpen && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto text-left">
                    {displayOptions.length > 0 ? (
                        displayOptions.map((opt, idx) => (
                            <li
                                key={idx}
                                onClick={() => handleOptionClick(opt)}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${String(opt) === String(value) ? 'bg-blue-100 font-medium' : ''}`}
                            >
                                {opt}
                            </li>
                        ))
                    ) : (
                        <li className="px-3 py-2 text-sm text-gray-400 text-center">결과 없음</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchableSelect;
