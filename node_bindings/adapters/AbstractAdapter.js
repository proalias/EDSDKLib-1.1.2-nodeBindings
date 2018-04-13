class AbstractAdapter {
    constructor() {
        /**
         * @type {boolean}
         */
        this.initialised = false;

        /**
         * @type {boolean}
         */
        this.cameraSessionOpened = false;
    }

    /**
     * @returns {Promise}
     */
    init() {
        return Promise.resolve();
    }

    /**
     * @returns {Promise}
     */
    close() {
        return Promise.resolve();
    }

    /**
     * @returns {boolean}
     */
    isInitialised() {
        return this.initialised;
    }

    /**
     * @returns {Promise.<CameraInfo[]>}
     */
    getCameras() {
        throw new Error('Method not implemented');
    }

    /**
     * @param {int} [index]
     * @returns {Promise.<CameraInfo[]|null>}
     */
    getCamera(index = 0) {
        throw new Error('Method not implemented');
    }

    /**
     * @param {int} [index]
     * @returns {boolean}
     */
    isCameraSessionOpened(index = 0) {
        return this.initialised && this.cameraSessionOpened;
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    openCameraSession(index = 0) {
        throw new Error('Method not implemented');
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    closeCameraSession(index = 0) {
        throw new Error('Method not implemented');
    }

    /**
     * @param {int} [index]
     * @param {boolean} [resumePreview]
     * @returns {Promise.<Buffer>}
     */
    capturePhoto(index = 0, resumePreview = true) {
        throw new Error('Method not implemented');
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    startLiveView(index = 0) {
        throw new Error('Method not implemented');
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    stopLiveView(index = 0) {
        throw new Error('Method not implemented');
    }

    /**
     * @param {int} [index]
     * @returns {Promise.<Buffer>}
     */
    getLiveViewPhoto(index = 0) {
        throw new Error('Method not implemented');
    }

    /**
     * @param {int} [index]
     * @returns {boolean}
     */
    isLiveViewPaused(index = 0) {
        throw new Error('Method not implemented');
    }
}

module.exports = AbstractAdapter;
