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
