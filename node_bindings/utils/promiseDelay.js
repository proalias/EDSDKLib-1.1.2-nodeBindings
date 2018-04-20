/**
 * @param {int} timeout
 * @returns {Promise}
 */
module.exports = function promiseDelay(timeout = 0) {
    return new Promise(resolve => setTimeout(resolve, timeout));
};
