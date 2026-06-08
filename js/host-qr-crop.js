/**
 * 場主 PayMe / FPS QR 上傳前裁切（1:1 正方形），避免整張手機截圖上傳。
 */
(function () {
    const QR_OUTPUT_SIZE = 800;
    const QR_JPEG_QUALITY = 0.92;
    const CROP_BOX_SIZE = 250;

    let cropper = null;
    let objectUrl = null;
    let pendingCropType = null;
    let pendingSourceInput = null;

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

    function getTypeLabel(type) {
        return type === 'payme' ? 'PayMe' : '轉數快 (FPS)';
    }

    async function closeCropModal() {
        const modal = byId('host-qr-crop-modal');
        if (modal) {
            if (typeof window.closeMujiOverlay === 'function') {
                await window.closeMujiOverlay(modal);
            } else {
                modal.classList.add('hidden');
            }
        }
        destroyCropper();
        revokeObjectUrl();
        const img = byId('host-qr-crop-image');
        if (img) {
            img.removeAttribute('src');
            img.style.display = 'none';
        }
        pendingCropType = null;
        pendingSourceInput = null;
    }

    function centerSquareCropBox() {
        if (!cropper) return;
        const container = cropper.getContainerData();
        const size = Math.min(CROP_BOX_SIZE, container.width - 24, container.height - 24);
        cropper.setCropBoxData({
            width: size,
            height: size,
            left: (container.width - size) / 2,
            top: (container.height - size) / 2
        });
    }

    async function openCropModal(type, file, sourceInput) {
        const modal = byId('host-qr-crop-modal');
        const img = byId('host-qr-crop-image');
        const title = byId('host-qr-crop-title');
        if (!modal || !img || !file) return;

        pendingCropType = type;
        pendingSourceInput = sourceInput || null;

        if (title) {
            title.textContent = `裁切 ${getTypeLabel(type)} QR Code`;
        }

        revokeObjectUrl();
        destroyCropper();

        objectUrl = URL.createObjectURL(file);
        img.style.display = 'block';
        if (typeof window.openMujiOverlay === 'function') {
            await window.openMujiOverlay(modal);
        } else {
            modal.classList.remove('hidden');
        }

        img.onload = function onQrCropImageReady() {
            img.onload = null;
            destroyCropper();
            cropper = new Cropper(img, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                responsive: true,
                background: false,
                guides: false,
                center: true,
                movable: true,
                zoomable: true,
                zoomOnTouch: true,
                zoomOnWheel: true,
                scalable: false,
                rotatable: false,
                cropBoxMovable: false,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false,
                ready() {
                    centerSquareCropBox();
                }
            });
        };
        img.src = objectUrl;
    }

    function exportCroppedFile(type) {
        return new Promise((resolve, reject) => {
            if (!cropper) {
                reject(new Error('裁切器未就緒'));
                return;
            }
            const canvas = cropper.getCroppedCanvas({
                width: QR_OUTPUT_SIZE,
                height: QR_OUTPUT_SIZE,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            if (!canvas) {
                reject(new Error('無法產生裁切圖片'));
                return;
            }
            const filename = type === 'payme' ? 'payme-qr.jpg' : 'fps-qr.jpg';
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('無法產生裁切圖片'));
                        return;
                    }
                    resolve(new File([blob], filename, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                },
                'image/jpeg',
                QR_JPEG_QUALITY
            );
        });
    }

    async function showInstantQrPreview(type, file) {
        if (!file || typeof window.readFilePreviewUrl !== 'function') return;
        try {
            const previewUrl = await window.readFilePreviewUrl(file);
            if (typeof window.setHostQrLocalPreview === 'function') {
                window.setHostQrLocalPreview(type, previewUrl, { uploading: false });
            }
        } catch (err) {
            console.warn('QR 本地預覽失敗:', err);
        }
    }

    function onQrFileSelected(type, event) {
        const input = event.target;
        const file = input.files && input.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('請選擇圖片檔案（JPG、PNG 等）。');
            input.value = '';
            return;
        }

        showInstantQrPreview(type, file);
        openCropModal(type, file, input);
    }

    async function onCropConfirm() {
        const type = pendingCropType;
        const confirmBtn = byId('host-qr-crop-confirm');
        const originalText = confirmBtn ? confirmBtn.textContent : '';

        if (!type) return;

        try {
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = '上傳中...';
            }

            const croppedFile = await exportCroppedFile(type);

            if (typeof window.readFilePreviewUrl === 'function' && typeof window.setHostQrLocalPreview === 'function') {
                const croppedPreviewUrl = await window.readFilePreviewUrl(croppedFile);
                window.setHostQrLocalPreview(type, croppedPreviewUrl, { uploading: true });
            }

            if (pendingSourceInput) pendingSourceInput.value = '';
            closeCropModal();

            if (typeof window.uploadCroppedHostQr !== 'function') {
                throw new Error('上傳服務未就緒');
            }

            await window.uploadCroppedHostQr(type, croppedFile);
        } catch (err) {
            console.error('裁切或上傳 QR 失敗:', err);
            const code = err?.code ? `（${err.code}）` : '';
            alert(`裁切或上傳失敗${code}，請再試一次。`);
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText || '確認裁剪並上傳';
            }
        }
    }

    function onCropCancel() {
        if (pendingSourceInput) pendingSourceInput.value = '';
        closeCropModal();
        if (typeof window.refreshHostPaymentSettings === 'function') {
            window.refreshHostPaymentSettings();
        }
    }

    function bindHostQrCropUI() {
        byId('host-payme-qr-input')?.addEventListener('change', (event) => {
            onQrFileSelected('payme', event);
        });
        byId('host-fps-qr-input')?.addEventListener('change', (event) => {
            onQrFileSelected('fps', event);
        });
        byId('host-qr-crop-confirm')?.addEventListener('click', onCropConfirm);
        byId('host-qr-crop-cancel')?.addEventListener('click', onCropCancel);
        byId('host-qr-crop-close')?.addEventListener('click', onCropCancel);
    }

    window.openHostQrCropModal = openCropModal;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindHostQrCropUI);
    } else {
        bindHostQrCropUI();
    }
})();
