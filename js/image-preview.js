/**
 * 本地圖片預覽（FileReader / Object URL）與上傳中遮罩
 */
(function () {
    function escapeAttr(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;');
    }

    function readFilePreviewUrl(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('缺少圖片檔案'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('讀取圖片失敗'));
            reader.readAsDataURL(file);
        });
    }

    function buildImagePreviewHtml(src, uploading = false, alt = '') {
        return `
            <div class="image-preview-frame">
                <img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" class="image-preview-img">
                <div class="image-preview-overlay${uploading ? ' is-visible' : ''}" aria-hidden="${uploading ? 'false' : 'true'}">
                    <span class="image-preview-spinner" aria-hidden="true"></span>
                    <span class="image-preview-overlay-text">正在上傳...</span>
                </div>
            </div>
        `;
    }

    function setPreviewLoading(container, uploading) {
        if (!container) return;
        const overlay = container.querySelector('.image-preview-overlay')
            || container.parentElement?.querySelector('.image-preview-overlay');
        if (overlay) {
            overlay.classList.toggle('is-visible', !!uploading);
            overlay.setAttribute('aria-hidden', uploading ? 'false' : 'true');
        }
    }

    function renderPreviewContainer(container, src, options = {}) {
        if (!container || !src) return;
        const { uploading = false, alt = '' } = options;
        if (container.classList.contains('host-qr-preview') || container.id?.includes('preview')) {
            container.innerHTML = buildImagePreviewHtml(src, uploading, alt);
            container.classList.add('is-visible');
            return;
        }
        container.innerHTML = buildImagePreviewHtml(src, uploading, alt);
    }

    window.readFilePreviewUrl = readFilePreviewUrl;
    window.buildImagePreviewHtml = buildImagePreviewHtml;
    window.setPreviewLoading = setPreviewLoading;
    window.renderPreviewContainer = renderPreviewContainer;
})();
