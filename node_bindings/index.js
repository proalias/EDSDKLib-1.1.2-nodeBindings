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
            console.log("Callback on success:" + result.message);
        } else {
            console.log("ERROR:" + result.message);
        }
    } else {
        console.log("ERROR:" + error.message);
    }
}



const setOutputPath = bindMethodSignature('SetOutputPath');
//const takePhoto = bindMethodSignature('TakePhoto');
const beginSession = bindMethodSignature('BeginSession');
const endSession = bindMethodSignature('EndSession');

const startLiveView = bindMethodSignature('StartLiveView');
const startVideo = bindMethodSignature('StartVideo');
const stopVideo = bindMethodSignature('StopVideo');
const getPreviewImage = bindMethodSignature('GetPreviewImage');

beginSession( {} ,resultHandler);

setOutputPath( {outputPath: 'C:\\pictures'}, resultHandler);//Sets the location to save videos and photos.

startLiveView( {} ,resultHandler);//This must be called before recording video.

const previewImage = function(){
  //  getPreviewImage({}, previewImageResultHandler);
}

const record=function() {
    startVideo({}, resultHandler);
    setInterval(previewImage,90);
    setTimeout(finishRecord,4000);
}

const finishRecord=function() {
    stopVideo({}, resultHandler);
}


setTimeout(record,500);
//endSession( {} ,resultHandler);

//Set the path to save photos from the camera:
//setOutputPath( {outputPath: 'C:\\pictures'}, resultHandler);
//Take a still photo
//takePhoto( {} ,resultHandler);
//startVideo({}, resultHandler);//NB this is a stub, not yet implemented
//stopVideo({}, resultHandler);//NB this is a stub, not yet implemented