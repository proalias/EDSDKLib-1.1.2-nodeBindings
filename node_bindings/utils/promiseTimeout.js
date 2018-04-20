/**
 * @param {int} timeout
 * @param {Promise|*} promise
 * @returns {Promise}
 */
module.exports = function promiseTimeout(timeout = 1000, promise) {
    return new Promise((resolve, reject) => {
        if (!(promise instanceof Promise)) {
            resolve(promise);
            return;
        }

        let promiseHandled = false;

        const timeoutHandler = setTimeout(() => {
            if (promiseHandled) {
                return;
            }

            promiseHandled = true;
            reject(new Error(`Promise timed out after ${timeout}ms`));
        }, timeout);

        promise
            .then(result => {
                if (promiseHandled) {
                    return;
                }

                promiseHandled = true;
                clearTimeout(timeoutHandler);
                resolve(result);
            })
            .catch(e => {
                if (promiseHandled) {
                    return;
                }

                promiseHandled = true;
                clearTimeout(timeoutHandler);
                reject(e);
            });
    });
};
