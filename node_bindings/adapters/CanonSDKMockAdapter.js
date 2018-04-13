const AbstractAdapter = require('./AbstractAdapter');
const path = require('path');
const fs = require('fs-extra');

class CanonSDKMockAdapter extends AbstractAdapter {
    /**
     * @param {CameraInfo[]} cameras
     * @param {{ liveViewPhotoSize: string, photoSize: string }} [opts]
     */
    constructor(cameras = [], opts = {}) {
        super();

        /**
         * @type {string}
         */
        this.liveViewPhotoSize = opts.liveViewPhotoSize || '960x640';

        /**
         * @type {string}
         */
        this.photoSize = opts.photoSize || '1920x1080';

        /**
         * @type {string}
         */
        this.assetsPath = path.join(__dirname, 'assets/mock');

        /**
         * @type {Buffer[]}
         */
        this.previews = [];

        /**
         * @type {Buffer[]}
         */
        this.photos = [];

        /**
         * @type {int}
         */
        this.liveViewPhotoCount = 0;

        /**
         * @type {int}
         */
        this.photoCount = 0;

        /**
         * @type {CameraInfo[]}
         */
        this.cameras = cameras;
    }

    /**
     * @returns {Promise}
     */
    init() {
        return this.loadAssets().then(() => {
            this.initialised = true;
        });
    }

    /**
     * @returns {Promise}
     */
    loadAssets() {
        return Promise.resolve()
            .then(() =>
                Promise.all(
                    [0, 1, 2, 3, 4, 5].map(index =>
                        fs.readFile(
                            path.join(
                                this.assetsPath,
                                `preview-${this.liveViewPhotoSize}-${index}.jpg`
                            )
                        )
                    )
                )
            )
            .then(previews => {
                this.previews = previews;
            })
            .then(() =>
                Promise.all(
                    [0, 1].map(index =>
                        fs.readFile(
                            path.join(
                                this.assetsPath,
                                `photo-${this.photoSize}-${index}.jpg`
                            )
                        )
                    )
                )
            )
            .then(photos => {
                this.photos = photos;
            });
    }

    /**
     * @returns {Promise}
     */
    close() {
        this.initialised = false;

        return Promise.resolve();
    }

    /**
     * @returns {Promise.<CameraInfo[]>}
     */
    getCameras() {
        return Promise.resolve(this.cameras);
    }

    /**
     * @param {int} index
     * @returns {Promise.<CameraInfo[]|null>}
     */
    getCamera(index = 0) {
        return Promise.resolve(this.cameras[index] || null);
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    openCameraSession(index = 0) {
        this.cameraSessionOpened = true;
        return Promise.resolve();
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    closeCameraSession(index = 0) {
        this.cameraSessionOpened = false;
        return Promise.resolve();
    }

    /**
     * @returns {Buffer}
     */
    getNextPhotoAsset() {
        const photo = this.photos[this.photoCount % this.photos.length];
        this.photoCount++;
        return photo;
    }

    /**
     * @param {int} [index]
     * @param {boolean} [resumePreview]
     * @returns {Promise.<Buffer>}
     */
    capturePhoto(index = 0, resumePreview = true) {
        return Promise.resolve(this.getNextPhotoAsset());
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    startLiveView(index = 0) {
        return Promise.resolve();
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    stopLiveView(index = 0) {
        return Promise.resolve();
    }

    /**
     * @returns {Buffer}
     */
    getNextLiveViewPhotoAsset() {
        const preview = this.previews[
            this.liveViewPhotoCount % this.previews.length
        ];
        this.liveViewPhotoCount++;
        return preview;
    }

    /**
     * @param {int} [index]
     * @returns {Promise.<Buffer>}
     */
    getLiveViewPhoto(index = 0) {
        return Promise.resolve(this.getNextLiveViewPhotoAsset());
    }
}

module.exports = CanonSDKMockAdapter;
