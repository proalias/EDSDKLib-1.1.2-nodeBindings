const edge = require('./node_modules/edge');

const assemblyFile = '..\\NodeBindings\\bin\\Debug\\Nodebindings.dll';
const className = 'NodeBindings.Program';

const bindMethodSignature = function(methodName){
    return edge.func({
        assemblyFile: assemblyFile,
        typeName: className,
        methodName: methodName // This must be Func<object,Task<object>>
    });
}

const resultHandler = function(error, result){
    if (!error) {
        if (result.success) {
            console.log("Callback on success:" + result.message);
        }else{
            console.log("ERROR:" + result.message);
        }
    }
}

const setOutputPath = bindMethodSignature('SetOutputPath');
const takePhoto = bindMethodSignature('TakePhoto');

const openCameraSession = bindMethodSignature('OpenCameraSession');
const openCameraSession = bindMethodSignature('CloseCameraSession');


const startVideo = bindMethodSignature('StartVideo');
const stopVideo = bindMethodSignature('StopVideo');


//openCameraSession( {} ,resultHandler);
//Set the path to save photos from the camera:
setOutputPath( {outputPath: 'C:\\pictures'}, resultHandler);
//Take a still photo
takePhoto( {} ,resultHandler);
startVideo({}, resultHandler);//NB this is a stub, not yet implemented
stopVideo({}, resultHandler);//NB this is a stub, not yet implemented