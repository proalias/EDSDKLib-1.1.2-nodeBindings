const path = require('path');
const edge = require('edge');

const assemblyFile = path.join(__dirname, '../NodeBindings/bin/Debug/Nodebindings.dll');
const className = 'NodeBindings.Program';

const bindMethodSignature = function(methodName){
    return edge.func({
        assemblyFile: assemblyFile,
        typeName: className,
        methodName: methodName // This must be Func<object,Task<object>>
    });
}

const resultHandler = function(error, result) {
    if (!error) {
        if (result.success) {
            console.log("Callback on success:" + result.message);
        } else {
            console.log("ERROR:" + result.message);
        }
    } else {
        console.log("ERROR:" + error.message);
    }
}

const previewImageResultHandler = function(error, result) {
    if (!error) {
        if (result.success) {
            console.log("Callback on success:"); //+ result.bitmap);//Bitmap from livepreview is available here
        } else {
            console.log("ERROR:" + result.message);
        }
    } else {
        console.log("ERROR:" + error.message);
    }
}



const setOutputPath = bindMethodSignature('SetOutputPath');
const takePhoto = bindMethodSignature('TakePhoto');
const beginSession = bindMethodSignature('BeginSession');
const endSession = bindMethodSignature('EndSession');

const startLiveView = bindMethodSignature('StartLiveView');
const stopLiveView = bindMethodSignature('StopLiveView');
const getLastDownloadedImageFilename = bindMethodSignature('GetLastDownloadedImageFilename');
const startVideo = bindMethodSignature('StartVideo');
const stopVideo = bindMethodSignature('StopVideo');
const getPreviewImage = bindMethodSignature('GetPreviewImage');

beginSession( {} ,resultHandler);
setOutputPath( {outputPath: 'C:\\pictures'}, resultHandler);//Sets the location to save videos and photos.


const previewImage = function(){
    getPreviewImage({}, previewImageResultHandler);
}

let previewIntervalId;

const takeStillPhoto = function() {
    takePhoto({}, resultHandler);
    getLastDownloadedImageFilename({},resultHandler);
}

const record=function() {
    startLiveView( {} ,resultHandler);//This must be called before recording video.
    startVideo({}, resultHandler);
    previewIntervalId = setInterval(previewImage,90);
    setTimeout(finishRecord,4000);
}

const finishRecord=function() {
    stopVideo({}, resultHandler);
    getLastDownloadedImageFilename({},resultHandler);
    clearInterval(previewIntervalId);
}


setTimeout(takeStillPhoto,500);
setTimeout(record,2500);

