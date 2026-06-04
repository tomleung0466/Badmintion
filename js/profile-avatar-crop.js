/**
 * 大頭照選擇後先裁切（1:1），再上傳較小的 JPEG，減少流量並精準顯示範圍。
 */
(function () {
    const AVATAR_OUTPUT_SIZE = 512;
    const AVATAR_JPEG_QUALITY = 0.85;

    let cropper = null;
    let objectUrl = null;
    let pendingAvatarFile = null;

    function byId(id) {
        return document.getElementById(id);
    }

    function revokeObjectUrl() {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
        }
    }

    function destroyCropper() {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    function setAvatarHint(visible) {
        const hint = byId('profile-avatar-hint');
        if (!hint) return;
        hint.classList.toggle('hidden', !visible);
    }

    function closeCropModal() {
        const modal = byId('avatar-crop-modal');
        if (modal) modal.classList.add('hidden');
        destroyCropper();
        revokeObjectUrl();
        const img = byId('avatar-crop-image');
        if (img) {
            img.removeAttribute('src');
            img.style.display = 'none';
        }
    }

    function openCropModal(file) {
        const modal = byId('avatar-crop-modal');
        const img = byId('avatar-crop-image');
        if (!modal || !img) return;

        revokeObjectUrl();
        destroyCropper();

        objectUrl = URL.createObjectURL(file);
        img.style.display = 'block';
        modal.classList.remove('hidden');

        img.onload = function onCropImageReady() {
            img.onload = null;
            destroyCropper();
            cropper = new Cropper(img, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.92,
                responsive: true,
                background: false,
                guides: true,
                center: true,
                movable: true,
                zoomable: true,
                scalable: false,
                rotatable: false,
                cropBoxMovable: true,
                cropBoxResizable: true
            });
        };
        img.src = objectUrl;
    }

    function exportCroppedFile() {
        return new Promise((resolve, reject) => {
            if (!cropper) {
                reject(new Error('裁切器未就緒'));
                return;
            }
            const canvas = cropper.getCroppedCanvas({
                width: AVATAR_OUTPUT_SIZE,
                height: AVATAR_OUTPUT_SIZE,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            if (!canvas) {
                reject(new Error('無法產生裁切圖片'));
                return;
            }
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('無法產生裁切圖片'));
                        return;
                    }
                    const file = new File([blob], 'avatar.jpg', {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(file);
                },
                'image/jpeg',
                AVATAR_JPEG_QUALITY
            );
        });
    }

    function onAvatarFileSelected(event) {
        const input = event.target;
        const file = input.files && input.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('請選擇圖片檔案（JPG、PNG 等）。');
            input.value = '';
            return;
        }

        openCropModal(file);
    }

    async function onCropConfirm() {
        const confirmBtn = byId('avatar-crop-confirm');
        const originalText = confirmBtn ? confirmBtn.textContent : '';
        try {
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = '處理中...';
            }
            pendingAvatarFile = await exportCroppedFile();
            setAvatarHint(true);
            closeCropModal();
            const input = byId('profile-avatar-input');
            if (input) input.value = '';
        } catch (err) {
            console.error('裁切大頭照失敗:', err);
            alert('裁切失敗，請再試一次或換一張圖片。');
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText || '確認裁切';
            }
        }
    }

    function onCropCancel() {
        const input = byId('profile-avatar-input');
        if (input) input.value = '';
        closeCropModal();
    }

    function bindAvatarCropUI() {
        byId('profile-avatar-input')?.addEventListener('change', onAvatarFileSelected);
        byId('avatar-crop-confirm')?.addEventListener('click', onCropConfirm);
        byId('avatar-crop-cancel')?.addEventListener('click', onCropCancel);
        byId('avatar-crop-close')?.addEventListener('click', onCropCancel);
    }

    window.getPendingProfileAvatarFile = function getPendingProfileAvatarFile() {
        return pendingAvatarFile;
    };

    window.clearPendingProfileAvatarFile = function clearPendingProfileAvatarFile() {
        pendingAvatarFile = null;
        setAvatarHint(false);
        const input = byId('profile-avatar-input');
        if (input) input.value = '';
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAvatarCropUI);
    } else {
        bindAvatarCropUI();
    }
})();
