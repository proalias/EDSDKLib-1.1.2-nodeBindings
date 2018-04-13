const debug = require('debug')('CanonSDKAdapterUtils');
const path = require('path');
const child_process = require('child_process');
const fs = require('fs-extra');
const fileType = require('file-type');
const isElectron = require('is-electron');
const CommandConstants = require('../CommandConstants');
const promiseDelay = require('../utils/promiseDelay');

const JPG_START_HEX = 'ffd8';
const JPG_END_HEX = 'ffd9';
const handlerPath = path.join(__dirname, '../handler/CanonCameraHandler.exe');
const handlerDir = path.dirname(handlerPath);

const liveViewImageSize = 500 * 1024 - 1;

let usePrebuilt = true;

let CameraSDKWrapper;

/**
 * @param {boolean} value 
 */
function setUsePrebuilt(value) {
    usePrebuilt = value;
}

/**
 * @returns {CameraSDKWrapper}
 */
function requireCameraSDKWrapper() {
    let requirePath;
    if (!usePrebuilt) {
        requirePath = '../build/Release/CameraSDKWrapper';
    } else {
        const target = isElectron() ? 'electron' : 'node';
        const plaftorm = require('os').platform();
        const prebuiltName = `${target}-${plaftorm}-${process.arch}`;
        requirePath = `../prebuilt/${prebuiltName}/Release/CameraSDKWrapper`;
    }

    return require(requirePath);
}

/**
 * @returns {Promise}
 */
function startHandlerApp() {
    return new Promise(resolve => {
        const childProcess = child_process.spawn(handlerPath, [], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore'],
            cwd: path.dirname(handlerPath),
        });

        childProcess.unref();

        resolve();
    }).then(() => promiseDelay(500));
}

/**
 * @returns {Promise}
 */
function stopHandlerApp() {
    return new Promise(resolve => {
        child_process.exec(
            `taskkill /F /IM "${path.basename(handlerPath)}"`,
            (error, stdout, stderr) => {
                if (error) {
                    debug(`Error while stopping handler app: ${error}`);
                }

                resolve();
            }
        );
    });
}

/**
 * @param {int} commandId
 * @returns {string}
 */
function commandNameById(commandId) {
    return (
        Object.keys(CommandConstants).find(key => {
            return CommandConstants[key] === commandId;
        }) || 'undefined'
    );
}

/**
 * @param {int} commandId
 * @param {string} [commandString]
 * @returns {Promise}
 */
function sendCommand(commandId, commandString) {
    return new Promise(resolve => {
        const cameraIndex = 0;
        const commandArgsString = [cameraIndex, commandId, commandString]
            .map(argument => {
                if (typeof argument === 'undefined') {
                    return 'undefined';
                } else if (typeof argument !== 'string') {
                    return JSON.stringify(argument);
                } else {
                    return argument;
                }
            })
            .join(', ');

        CameraSDKWrapper.SendCommand(
            cameraIndex,
            commandId,
            commandString,
            success => {
                if (!success) {
                    throw new Error(
                        `Command "${commandNameById(commandId)}"` +
                            ` SendCommand(${commandArgsString}) failed`
                    );
                }

                debug(
                    `Command "${commandNameById(commandId)}"` +
                        ` SendCommand(${commandArgsString}) succeeded`
                );
                resolve();
            }
        );
    });
}

/**
 * @returns {Promise}
 */
function initCameraSDKWrapper() {
    return new Promise(resolve => {
        CameraSDKWrapper = requireCameraSDKWrapper();
        resolve();
    });
}

/**
 * @returns {Promise}
 */
function findCameraApplication() {
    return new Promise(resolve => {
        CameraSDKWrapper.FindCameraApp(
            'CanonCameraHandler',
            (found, appName) => {
                if (!found) {
                    throw new Error('CanonCameraHandler app not found');
                }

                debug(`CanonCameraHandler app found: "${appName}"`);
                resolve();
            }
        );
    });
}

/**
 * @returns {Promise}
 */
function initSDK() {
    return sendCommand(CommandConstants.INITIALIZE_EDSDK);
}

/**
 * @returns {Promise}
 */
function startSDK() {
    return new Promise(resolve => {
        CameraSDKWrapper.StartupSDK(success => {
            if (!success) {
                throw new Error('Canon SDK failed to start up');
            }

            debug('Canon SDK started up');
            resolve();
        });
    });
}

/**
 * @returns {Promise}
 */
function openCameraSession() {
    return sendCommand(CommandConstants.OPEN_CAMERA_SESSION);
}

/**
 * @returns {Promise}
 */
function closeCameraSession() {
    return sendCommand(CommandConstants.CLOSE_CAMERA_SESSION);
}

/**
 * @returns {Promise}
 */
function getAllCameras() {
    return sendCommand(CommandConstants.GET_ALLCAMERA);
}

/**
 * @returns {Promise}
 */
function closeAllCameraSessions() {
    return sendCommand(CommandConstants.CLOSE_ALL_CAMERA_SESSION);
}

/**
 * @returns {Promise}
 */
function getCamerasSettings() {
    return new Promise(resolve => {
        CameraSDKWrapper.GetCameraSettings(cameraInfo => {
            if (!cameraInfo) {
                throw new Error('Error while getting camera settings');
            }

            debug('CameraInfo: ', cameraInfo[0]);

            resolve(cameraInfo);
        });
    });
}

/**
 * @param {string} filePath
 * @param {int} interval
 * @param {int} timeout
 * @returns {Promise}
 */
function waitForImage(filePath, interval = 100, timeout = 1000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        function waitForImageInner() {
            if (startTime + timeout <= Date.now()) {
                reject(
                    new Error(
                        `Image at path "${filePath}" not ready within ${timeout}ms`
                    )
                );
                return;
            }

            return fs
                .readFile(filePath)
                .then(buffer => {
                    const hexString = buffer.toString('hex');

                    if (hexString.slice(0, 4) !== JPG_START_HEX) {
                        throw new Error('Invalid start of the image');
                    }

                    if (hexString.slice(-4) !== JPG_END_HEX) {
                        throw new Error('Invalid end of the image');
                    }

                    resolve();
                })
                .catch(e => {
                    debug(`Image at path "${filePath}" not ready`, e);
                    setTimeout(() => waitForImageInner(), interval);
                });
        }

        waitForImageInner();
    });
}

/**
 * @param {string} filePath
 * @returns {Promise.<Buffer>}
 */
function readImage(filePath) {
    return fs.readFile(filePath).then(buffer => {
        const fileInfo = fileType(buffer);

        if (!fileInfo) {
            throw new Error(
                `File at path "${filePath}" is undefined or not ready`
            );
        }

        if (fileInfo.mime !== 'image/jpeg') {
            throw new Error(
                `File at path "${filePath}" is not "image/jpeg"` +
                    `, actual mime type "${fileInfo.mime}"`
            );
        }

        return buffer;
    });
}

/**
 * @param {string} fileName
 * @returns {Promise}
 */
function capturePhotoRaw(fileName) {
    return sendCommand(CommandConstants.TAKE_PICTURE, fileName);
}

/**
 * @returns {Promise.<Buffer>}
 */
function capturePhoto() {
    const fileName = `${Date.now()}.jpg`;
    const filePath = path.join(handlerDir, fileName);

    function removeTempImage() {
        setTimeout(() => {
            fs.unlink(filePath).catch(e => {
                debug(`Image at path "${filePath}" not deleted`, e);
            });
        }, 200);
    }

    return capturePhotoRaw(filePath)
        .then(() => waitForImage(filePath, 100))
        .then(() => readImage(filePath))
        .then(buffer => {
            removeTempImage();

            // debug('Photo file saved');
            // fs.writeFile(
            //     path.join(__dirname, `../images/${Date.now()}.jpg`),
            //     buffer
            // );

            return buffer;
        })
        .catch(e => {
            removeTempImage();

            throw e;
        });
}

/**
 * @returns {Promise}
 */
function startLiveView() {
    return sendCommand(CommandConstants.START_LIVEVIEW).then(() =>
        waitForLiveViewReady(100, 3000)
    );
}

/**
 * @param {int} interval
 * @param {int} timeout
 * @returns {Promise}
 */
function waitForLiveViewReady(interval = 100, timeout = 1000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        function waitForLiveViewReadyInner() {
            const elapsed = Date.now() - startTime;

            if (elapsed >= timeout) {
                debug(`Live view not ready within ${timeout}ms`);
                reject(new Error(`Live view not ready within ${timeout}ms`));
                return;
            }

            return getLiveViewPhoto()
                .then(() => {
                    debug(`Live view ready within ${elapsed}ms`);
                    resolve();
                })
                .catch(e => {
                    debug(`Live view not ready (elapsed ${elapsed}ms)`, e);
                    setTimeout(() => waitForLiveViewReadyInner(), interval);
                });
        }

        waitForLiveViewReadyInner();
    });
}

/**
 * @returns {Promise}
 */
function stopLiveView() {
    return sendCommand(CommandConstants.STOP_LIVEVIEW);
}

/**
 * @returns {Promise.<Buffer>}
 */
function getLiveViewPhoto() {
    const liveViewImageBuffer = Buffer.alloc(liveViewImageSize);
    return new Promise((resolve, reject) => {
        CameraSDKWrapper.GetImageFrame(liveViewImageBuffer, success => {
            if (!success) {
                debug('GetImageFrame failed');
                reject(new Error('GetImageFrame failed'));
                return;
            }

            const fileInfo = fileType(liveViewImageBuffer);

            if (!fileInfo || fileInfo.mime !== 'image/jpeg') {
                debug('Live view image buffer invalid');
                reject(new Error('Live view image buffer invalid'));
                return;
            }

            // debug('Live view image file saved');
            // fs.writeFile(
            //     path.join(__dirname, `../images/live-view-${Date.now()}.jpg`),
            //     liveViewImageBuffer
            // );

            resolve(liveViewImageBuffer);
        });
    });
}

module.exports = {
    setUsePrebuilt,
    startHandlerApp,
    stopHandlerApp,
    initCameraSDKWrapper,
    findCameraApplication,
    initSDK,
    startSDK,
    openCameraSession,
    closeCameraSession,
    closeAllCameraSessions,
    getAllCameras,
    getCamerasSettings,
    capturePhoto,
    startLiveView,
    stopLiveView,
    getLiveViewPhoto,
};
