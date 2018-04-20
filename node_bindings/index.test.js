const fileType = require('file-type');
const edge = require('edge');
const promiseDelay = require('./utils/promiseDelay');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 15 * 1000;

/**
 * @type {AbstractAdapter}
 */
let adapter;

/**
 * @type {CanonCamera}
 */
let canonCamera;

/**
 * @param {Buffer} data
 * @returns {Buffer}
 */
function testIsImage(data) {
    expect(data).toBeInstanceOf(Buffer);
    const fileInfo = fileType(data);
    expect(fileInfo).toEqual({
        ext: 'jpg',
        mime: 'image/jpeg',
    });

    return data;
}

/**
 * @param {Buffer[]} images
 * @returns {Buffer[]}
 */
function testConsecutiveImages(images) {
    let previousImage = null;
    images.forEach(image => {
        if (previousImage) {
            expect(previousImage.equals(image)).toBeFalsy();
        }
        previousImage = image;
    });

    return images;
}

/**
 * @returns {Promise.<Buffer>}
 */
function getLiveViewPhoto() {
    return Promise.resolve()
        .then(() => canonCamera.getLiveViewPhoto())
        .then(testIsImage);
}

/**
 * @param {int} count
 * @param {int} [interval]
 * @returns {Promise}
 */
function getLiveViewPhotos(count, interval = 100) {
    const photos = [];
    let promise = Promise.resolve();
    for (let i = 0; i < count; i++) {
        promise = promise
            .then(() => getLiveViewPhoto())
            .then(data => photos.push(data))
            .then(() => promiseDelay(interval));
    }

    return promise.then(() => photos);
}

// just mock it now
class CanonCamera {}

beforeEach(() => {
    canonCamera = new CanonCamera(adapter);
});

test('it is instantiable', () => {
    expect(canonCamera).toBeInstanceOf(CanonCamera);
});

test('it can be initialised and closed', () => {
    expect(canonCamera.isInitialised()).toBe(false);
    return Promise.resolve()
        .then(() => canonCamera.init())
        .then(() => expect(canonCamera.isInitialised()).toBe(true))
        .then(() => expect(canonCamera.isCameraSessionOpened()).toBe(false))
        .then(() => canonCamera.openCameraSession())
        .then(() => expect(canonCamera.isCameraSessionOpened()).toBe(true))
        .then(() => canonCamera.closeCameraSession())
        .then(() => expect(canonCamera.isCameraSessionOpened()).toBe(false))
        .then(() => canonCamera.openCameraSession())
        .then(() => expect(canonCamera.isCameraSessionOpened()).toBe(true))
        .then(() => canonCamera.close())
        .then(() => expect(canonCamera.isInitialised()).toBe(false))
        .then(() => expect(canonCamera.isCameraSessionOpened()).toBe(false));
});

test('it gets cameras', () => {
    return Promise.resolve()
        .then(() =>
            expect(canonCamera.getCameras()).rejects.toEqual(
                new Error('Adapter not initialised')
            )
        )
        .then(() => canonCamera.init())
        .then(() => canonCamera.openCameraSession())
        .then(() => canonCamera.getCameras())
        .then(camerasInfo => {
            expect(camerasInfo).toHaveLength(1);
            expect(camerasInfo[0].serialNumber).toMatch(/[A-z0-9]+/);
            expect(camerasInfo[0].name).toMatch(/[A-z0-9]+/);
            expect(camerasInfo[0].id).toBeDefined();
        });
});

test('it gets camera', () => {
    return Promise.resolve()
        .then(() =>
            expect(canonCamera.getCamera()).rejects.toEqual(
                new Error('Adapter not initialised')
            )
        )
        .then(() => canonCamera.init())
        .then(() => canonCamera.openCameraSession())
        .then(() => canonCamera.getCamera())
        .then(cameraInfo => {
            expect(cameraInfo.serialNumber).toMatch(/[A-z0-9]+/);
            expect(cameraInfo.name).toMatch(/[A-z0-9]+/);
            expect(cameraInfo.id).toBeDefined();
        })
        .then(() => expect(canonCamera.getCamera(1)).resolves.toBeNull());
});

describe('photo capturing', () => {
    beforeEach(() => {
        return Promise.resolve()
            .then(() => canonCamera.init())
            .then(() => canonCamera.openCameraSession());
    });

    afterEach(() => {
        return canonCamera.close();
    });

    test('it captures photo', () => {
        return canonCamera.capturePhoto().then(testIsImage);
    });

    test('it captures multiple photos', () => {
        const photos = [];
        return Promise.resolve()
            .then(() => canonCamera.capturePhoto())
            .then(testIsImage)
            .then(data => photos.push(data))
            .then(() => canonCamera.capturePhoto())
            .then(testIsImage)
            .then(data => photos.push(data))
            .then(() => testConsecutiveImages(photos));
    });
});

describe('live view', () => {
    beforeEach(() => {
        return Promise.resolve()
            .then(() => canonCamera.init())
            .then(() => canonCamera.openCameraSession());
    });

    afterEach(() => {
        return canonCamera.close();
    });

    test('it starts and stops live view', () => {
        return Promise.resolve()
            .then(() => canonCamera.startLiveView())
            .then(() => canonCamera.stopLiveView());
    });

    test('it gets live view photo', () => {
        return Promise.resolve()
            .then(() => canonCamera.startLiveView())
            .then(() => canonCamera.getLiveViewPhoto())
            .then(testIsImage)
            .then(() => canonCamera.stopLiveView());
    });

    test('it gets multiple live view photos', () => {
        return Promise.resolve()
            .then(() => canonCamera.startLiveView())
            .then(() => promiseDelay(shouldUseMock ? 100 : 3000))
            .then(() => getLiveViewPhotos(7))
            .then(photos => testConsecutiveImages(photos))
            .then(() => canonCamera.stopLiveView());
    });

    test('it captures multiple photos while live view is running', () => {
        const photos = [];

        return Promise.resolve()
            .then(() => canonCamera.startLiveView())
            .then(() => promiseDelay(shouldUseMock ? 100 : 3000))
            .then(() => getLiveViewPhotos(5))
            .then(() => canonCamera.capturePhoto())
            .then(testIsImage)
            .then(data => photos.push(data))
            .then(() => getLiveViewPhotos(5))
            .then(() => canonCamera.capturePhoto())
            .then(testIsImage)
            .then(data => photos.push(data))
            .then(() => getLiveViewPhotos(5))
            .then(() => testConsecutiveImages(photos))
            .then(() => canonCamera.stopLiveView());
    });

    test.skip('it captures multiple photos with camera session close and reopened in between', () => {
        const photos = [];

        return Promise.resolve()
            .then(() => canonCamera.startLiveView())
            .then(() => promiseDelay(shouldUseMock ? 100 : 3000))
            .then(() => getLiveViewPhotos(5))
            .then(() => canonCamera.capturePhoto())
            .then(testIsImage)
            .then(data => photos.push(data))
            .then(() => canonCamera.stopLiveView())
            .then(() => canonCamera.closeCameraSession())
            .then(() => canonCamera.openCameraSession())
            .then(() => canonCamera.startLiveView())
            .then(() => promiseDelay(shouldUseMock ? 100 : 3000))
            .then(() => getLiveViewPhotos(5))
            .then(() => canonCamera.capturePhoto())
            .then(testIsImage)
            .then(data => photos.push(data))
            .then(() => getLiveViewPhotos(5))
            .then(() => testConsecutiveImages(photos))
            .then(() => canonCamera.stopLiveView());
    });
});
