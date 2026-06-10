/**
 * display-name.js — 會員顯示名字驗證
 * 純中文最多 6 字；純英文／數字最多 15 字；中英混合最多 8 字（空格算 1 字）
 */
(function () {
    const CJK_RE = /\p{Script=Han}/u;
    const LATIN_RE = /[A-Za-z]/;
    const DIGIT_RE = /[0-9]/;
    const ALLOWED_RE = /^[\p{Script=Han}A-Za-z0-9_ ]+$/u;
    const EMOJI_RE = /\p{Extended_Pictographic}/u;

    function normalizeDisplayName(raw) {
        return String(raw ?? '').trim();
    }

    function getDisplayNameCategory(name) {
        const hasCJK = [...name].some((ch) => CJK_RE.test(ch));
        const hasLatin = LATIN_RE.test(name);
        const hasDigit = DIGIT_RE.test(name);

        if (hasCJK && (hasLatin || hasDigit)) return 'mixed';
        if (hasCJK) return 'chinese';
        return 'latin';
    }

    function getDisplayNameMaxLength(category) {
        if (category === 'mixed') return 8;
        if (category === 'chinese') return 6;
        return 15;
    }

    window.validateDisplayName = function validateDisplayName(raw) {
        const name = normalizeDisplayName(raw);

        function msg(key) {
            return typeof window.t === 'function' ? window.t(key) : key;
        }

        if (!name) {
            return { ok: false, message: msg('displayName.empty'), value: name, code: 'displayName.empty' };
        }

        if (EMOJI_RE.test(name)) {
            return { ok: false, message: msg('displayName.noEmoji'), value: name, code: 'displayName.noEmoji' };
        }

        if (!ALLOWED_RE.test(name)) {
            return { ok: false, message: msg('displayName.invalidChars'), value: name, code: 'displayName.invalidChars' };
        }

        const spaceCount = (name.match(/ /g) || []).length;
        if (spaceCount > 1) {
            return { ok: false, message: msg('displayName.tooManySpaces'), value: name, code: 'displayName.tooManySpaces' };
        }

        const hasAlnum =
            [...name].some((ch) => CJK_RE.test(ch)) || LATIN_RE.test(name) || DIGIT_RE.test(name);
        if (!hasAlnum) {
            return { ok: false, message: msg('displayName.symbolsOnly'), value: name, code: 'displayName.symbolsOnly' };
        }

        const category = getDisplayNameCategory(name);
        const maxLen = getDisplayNameMaxLength(category);
        const length = [...name].length;

        if (length > maxLen) {
            const limitKey = category === 'mixed'
                ? 'displayName.limitMixed'
                : category === 'chinese'
                    ? 'displayName.limitChinese'
                    : 'displayName.limitLatin';
            return { ok: false, message: msg(limitKey), value: name, code: limitKey };
        }

        return { ok: true, value: name, category, length, maxLength: maxLen };
    };

    window.normalizeDisplayName = normalizeDisplayName;
})();
