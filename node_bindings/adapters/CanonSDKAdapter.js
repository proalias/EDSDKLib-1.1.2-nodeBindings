const debug = require('debug')('CanonSDKAdapter');
const AbstractAdapter = require('./AbstractAdapter');
const CanonSDKAdapterUtils = require('./CanonSDKAdapterUtils');
const CameraInfo = require('../CameraInfo');

class CanonSDKAdapter extends AbstractAdapter {
    constructor() {
        super();

        /**
         * @type {boolean}
         */
        this.liveViewRunning = false;

        /**
         * @type {boolean}
         */
        this.liveViewPaused = false;
    }

    /**
     * @returns {Promise}
     */
    init() {
        this.initialised = false;
        this.cameraSessionOpened = false;

        return Promise.resolve()
            .then(() => CanonSDKAdapterUtils.stopHandlerApp())
            .then(() => CanonSDKAdapterUtils.startHandlerApp())
            .then(() => CanonSDKAdapterUtils.initCameraSDKWrapper())
            .then(() => CanonSDKAdapterUtils.findCameraApplication())
            .then(() => CanonSDKAdapterUtils.initSDK())
            .then(() => CanonSDKAdapterUtils.startSDK())
            .then(() => {
                this.initialised = true;
            });
    }

    /**
     * @returns {Promise}
     */
    close() {
        this.initialised = false;
        this.cameraSessionOpened = false;

        return Promise.resolve()
            .then(() => CanonSDKAdapterUtils.stopLiveView())
            .then(() => CanonSDKAdapterUtils.closeAllCameraSessions())
            .then(() => CanonSDKAdapterUtils.stopHandlerApp());
    }

    /**
     * @returns {Promise.<CameraInfo[]>}
     */
    getCameras() {
        return Promise.resolve()
            .then(() => CanonSDKAdapterUtils.getAllCameras())
            .then(() => CanonSDKAdapterUtils.getCamerasSettings())
            .then(camerasDetails =>
                camerasDetails
                    .filter(cameraDetails => cameraDetails.SerialNumber)
                    .map(
                        cameraDetails =>
                            new CameraInfo(
                                `${cameraDetails.SerialNumber}`,
                                `${cameraDetails.CameraName}`,
                                parseInt(cameraDetails.id)
                            )
                    )
            );
    }

    /**
     * @param {int} index
     * @returns {Promise.<CameraInfo[]|null>}
     */
    getCamera(index = 0) {
        return this.getCameras().then(
            camerasInfo => camerasInfo[index] || null
        );
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    openCameraSession(index = 0) {
        return Promise.resolve()
            .then(() => CanonSDKAdapterUtils.openCameraSession())
            .then(() => {
                this.cameraSessionOpened = true;
            });
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    closeCameraSession(index = 0) {
        return Promise.resolve()
            .then(() => CanonSDKAdapterUtils.closeAllCameraSessions())
            .then(() => {
                this.cameraSessionOpened = false;
            });
    }

    /**
     * @param {int} [index]
     * @param {boolean} [resumePreview]
     * @returns {Promise.<Buffer>}
     */
    capturePhoto(index = 0, resumePreview = true) {
        let promise = Promise.resolve();

        debug('Capturing photo');

        if (this.liveViewRunning) {
            this.liveViewPaused = resumePreview;
            promise = promise.then(() => this.stopLiveView(index));
        }

        let result = null;
        promise = promise
            .then(() => CanonSDKAdapterUtils.capturePhoto())
            .then(buffer => {
                debug('Photo captured (1)');
                result = buffer;
            });

        if (this.liveViewPaused) {
            this.liveViewPaused = false;
            promise = promise.then(() => this.startLiveView(index));
        }

        return promise.then(() => {
            debug('Photo captured (2)');
            return result;
        });
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    startLiveView(index = 0) {
        debug('Starting live view');
        this.liveViewRunning = true;
        return CanonSDKAdapterUtils.startLiveView().then(() => {
            debug('Live view started');
        });
    }

    /**
     * @param {int} [index]
     * @returns {Promise}
     */
    stopLiveView(index = 0) {
        debug('Stopping live view');
        return CanonSDKAdapterUtils.stopLiveView().then(() => {
            debug('Live view stopped');
            this.liveViewRunning = false;
        });
    }

    /**
     * @param {int} [index]
     * @returns {Promise.<Buffer>}
     */
    getLiveViewPhoto(index = 0) {
        return CanonSDKAdapterUtils.getLiveViewPhoto();
    }

    /**
     * @param {int} [index]
     * @returns {boolean}
     */
    isLiveViewPaused(index = 0) {
        return this.liveViewPaused;
    }
}

module.exports = CanonSDKAdapter;
