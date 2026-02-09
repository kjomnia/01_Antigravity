export const CHOSUNG = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

/**
 * 문자열에서 초성을 추출하여 반환합니다.
 * @param {string} str - 입력 문자열
 * @returns {string} 초성 문자열
 */
export const getChosung = (str) => {
    if (!str) return '';

    return str.split('').map(char => {
        const code = char.charCodeAt(0);
        // 한글 유니코드 범위: 0xAC00(44032) ~ 0xD7A3(55203)
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const chosungIndex = Math.floor((code - 0xAC00) / (21 * 28));
            return CHOSUNG[chosungIndex];
        }
        return char; // 한글이 아니면 그대로 반환
    }).join('');
};

/**
 * 검색어가 초성으로만 구성되었는지 확인합니다.
 * @param {string} query - 검색어
 * @returns {boolean}
 */
export const isChosungOnly = (query) => {
    if (!query) return false;
    // ㄱ~ㅎ 사이에 있는 문자로만 구성되어 있는지 확인
    // (단, 공백이나 숫자가 섞여있을 수 있음, 여기서는 단순하게 자음 범위 체크)
    // 자음 범위: ㄱ(0x3131) ~ ㅎ(0x314E)
    return query.split('').every(char => {
        const code = char.charCodeAt(0);
        return (code >= 0x3131 && code <= 0x314E) || char === ' ';
    });
};

/**
 * 한글 초성 검색을 포함한 포함 여부 확인
 * @param {string} target - 대상 문자열 (예: "강남국사")
 * @param {string} query - 검색어 (예: "ㄱㄴ" 또는 "강남")
 * @returns {boolean}
 */
export const matchKorean = (target, query) => {
    if (!target || !query) return false;

    const t = String(target); // .toLowerCase() 제거 (한글은 대소문자 없음, 영문 섞일 경우 고려)
    const q = String(query);

    // 1. 일반적인 포함 여부 확인 (영문 대소문자 무시)
    if (t.toLowerCase().includes(q.toLowerCase())) return true;

    // 2. 초성 검색 확인
    if (isChosungOnly(q)) {
        const targetChosung = getChosung(t);
        return targetChosung.includes(q);
    }

    return false;
};

// 한글 자음/모음을 영문으로 매핑 (키보드 배열 기준)
const KOREAN_TO_ENGLISH_MAP = {
    'ㅂ': 'q', 'ㅃ': 'Q',
    'ㅈ': 'w', 'ㅉ': 'W',
    'ㄷ': 'e', 'ㄸ': 'E',
    'ㄱ': 'r', 'ㄲ': 'R',
    'ㅅ': 't', 'ㅆ': 'T',
    'ㅛ': 'y', 'ㅕ': 'u',
    'ㅑ': 'i', 'ㅐ': 'o',
    'ㅔ': 'p',
    'ㅁ': 'a', 'ㄴ': 's',
    'ㅇ': 'd', 'ㄹ': 'f',
    'ㅎ': 'g', 'ㅗ': 'h',
    'ㅓ': 'j', 'ㅏ': 'k',
    'ㅣ': 'l',
    'ㅋ': 'z', 'ㅌ': 'x',
    'ㅊ': 'c', 'ㅍ': 'v',
    'ㅠ': 'b', 'ㅜ': 'n',
    'ㅡ': 'm'
};

/**
 * 한글 입력을 영문으로 변환 (자음/모음 기준)
 * 예: 'ㅂ' -> 'Q', 'ㅈ' -> 'W'
 * @param {string} text - 입력 문자열
 * @returns {string} 영문 대문자로 변환된 문자열
 */
export const convertKoreanToEnglish = (text) => {
    if (!text) return '';

    return text.split('').map(char => {
        // 한글 자음/모음인 경우 영문으로 변환
        if (KOREAN_TO_ENGLISH_MAP[char]) {
            return KOREAN_TO_ENGLISH_MAP[char].toUpperCase();
        }
        // 이미 영문인 경우 대문자로 변환
        if (/[a-zA-Z]/.test(char)) {
            return char.toUpperCase();
        }
        // 숫자나 기타 문자는 그대로 반환
        return char;
    }).join('');
};
