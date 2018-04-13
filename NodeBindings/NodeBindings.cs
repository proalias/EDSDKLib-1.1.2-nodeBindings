using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using EOSDigital.API;
using EOSDigital.SDK;
using System.Threading.Tasks;

namespace NodeBindings
{

    public class NodeResult
    {
        public string message = "NodeResult: No message defined";
        public bool success = false;
    }

    class Program
    {
        static CanonAPI APIHandler;
        static Camera MainCamera;
        static string ImageSaveDirectory;
        static bool Error = false;
        static ManualResetEvent WaitEvent = new ManualResetEvent(false);

        public async Task<object> SetOutputPath(dynamic input)
        {
            var result = new NodeResult(); 
            try
            {
                Console.WriteLine("Attempting to set ImageSaveDirectory to " + (string)input.outputPath);
                ImageSaveDirectory = (string)input.outputPath;
                result.message = "Success.";
                result.success = true;
            }
            catch (Exception ex){
                //Can't use requested path, resetting to default
                ImageSaveDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyPictures), "RemotePhoto");
                Console.WriteLine(ex.Message.ToString());
                Console.WriteLine("Can't use requested path, resetting to default:" + ImageSaveDirectory.ToString());
                result.message = ex.Message.ToString();
                result.success = false;
            }
            return result;
        }

        public async Task<object> TakePhoto(dynamic input)
        {
            NodeResult result = new NodeResult();

            try
            {
                Console.WriteLine("Called C# method from node.");
                APIHandler = new CanonAPI();

                Console.WriteLine("APIHandler initialised");
                List<Camera> cameras = APIHandler.GetCameraList();
                foreach (var camera in cameras)
                {
                    Console.WriteLine("APIHandler GetCameraList:" + camera);
                }
                
                if (cameras.Count > 0)
                {
                    MainCamera = cameras[0];
                    MainCamera.DownloadReady += MainCamera_DownloadReady;
                    MainCamera.OpenSession();
                    Console.WriteLine($"Opened session with camera: {MainCamera.DeviceName}");
                    
                }else{
                    Console.WriteLine("No camera found. Please plug in camera");
                    APIHandler.CameraAdded += APIHandler_CameraAdded;
                    WaitEvent.WaitOne();
                    WaitEvent.Reset();
                }
                Console.WriteLine("OpenSession"); 
                if (!Error)
                {
                    if (ImageSaveDirectory == null)
                    {
                        ImageSaveDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyPictures), "RemotePhoto");
                    }
                    MainCamera.SetSetting(PropertyID.SaveTo, (int)SaveTo.Host);
                    MainCamera.SetCapacity(4096, int.MaxValue);
                    Console.WriteLine($"Set image output path to: {ImageSaveDirectory}");

                    Console.WriteLine("Taking photo with current settings...");
                    CameraValue tv = TvValues.GetValue(MainCamera.GetInt32Setting(PropertyID.Tv));
                    if (tv == TvValues.Bulb) MainCamera.TakePhotoBulb(2);
                    else MainCamera.TakePhoto();
                    WaitEvent.WaitOne();

                    if (!Error) Console.WriteLine("Photo taken and saved");
                    result.message = "Photo taken and saved";
                    result.success = true;
                }
            }
            catch (Exception ex) { Console.WriteLine("Error: " + ex.Message); }
            finally
            {
                MainCamera?.Dispose();
                APIHandler.Dispose();
                Console.WriteLine("Program exited.");
            }
            
            return result;
        }
        


        /*
         * Stub example for reference:
         */
        public async Task<object> StartVideo(dynamic input)
        {
            var result = new NodeResult();

            //Method work goes here...
            try
            {
                Recording state = (Recording)MainCamera.GetInt32Setting(PropertyID.Record);
                if (state != Recording.On)
                {
                    MainCamera.StartFilming(true);

                    result.message = "Camera is in record mode";
                    result.success = true;
                }
                else
                {
                    result.message = "Camera must be in record mode";
                    result.success = false;
                }
            }
            catch (Exception ex){

            }
            finally
            {

            }
            
            return result;
        }

        /*
         * Stub example for reference:
         */
        public async Task<object> StopVideo(dynamic input)
        {
            var result = new NodeResult();

            //Method work goes here...

            result.message = "Example message - did the method call succeed?";
            result.success = false;
            return result;
        }
        /*
         * Stub example for reference:
         */
        public async Task<object> BeginSession(dynamic input)
        {
            var result = new NodeResult();
            
            try
            {
                Console.WriteLine("Called C# method from node.");
                APIHandler = new CanonAPI();

                Console.WriteLine("APIHandler initialised");
                List<Camera> cameras = APIHandler.GetCameraList();
                foreach (var camera in cameras)
                {
                    Console.WriteLine("APIHandler GetCameraList:" + camera);
                }

                if (cameras.Count > 0)
                {
                    MainCamera = cameras[0];
                    MainCamera.DownloadReady += MainCamera_DownloadReady;
                    MainCamera.OpenSession();
                    Console.WriteLine($"Opened session with camera: {MainCamera.DeviceName}");

                }
                else
                {
                    Console.WriteLine("No camera found. Please plug in camera");
                    APIHandler.CameraAdded += APIHandler_CameraAdded;
                    WaitEvent.WaitOne();
                    WaitEvent.Reset();
                }
         
                result.message = $"Opened session with camera: {MainCamera.DeviceName}";
                result.success= true;
            
            }catch  (Exception ex)
            {
                result.message = ex.Message;
                result.success = false;
            }
            return result;
        }

        /*
        * Stub example for reference:
        */
        public async Task<object> EndSession(dynamic input)
        {
            var result = new NodeResult();

            //Method work goes here...

            result.message = "Example message - did the method call succeed?";
            result.success = false;
            return result;
        }

        private static void APIHandler_CameraAdded(CanonAPI sender)
        {
            try
            {
                Console.WriteLine("Camera added event received");
                if (!OpenSession()) { Console.WriteLine("Sorry, something went wrong. No camera"); Error = true; }
            }
            catch (Exception ex) { Console.WriteLine("Error: " + ex.Message); Error = true; }
            finally { WaitEvent.Set(); }
        }

        private static void MainCamera_DownloadReady(Camera sender, DownloadInfo Info)
        {
            try
            {
                Console.WriteLine("Starting image download...");
                sender.DownloadFile(Info, ImageSaveDirectory);
            }
            catch (Exception ex) { Console.WriteLine("Error: " + ex.Message); Error = true; }
            finally { WaitEvent.Set(); }
        }

        public static bool OpenSession()
        {
            Console.WriteLine($"Opening session with camera: {MainCamera.DeviceName}");

            List<Camera> cameras = APIHandler.GetCameraList();
            if (cameras.Count > 0)
            {
                MainCamera = cameras[0];
                MainCamera.DownloadReady += MainCamera_DownloadReady;
                MainCamera.OpenSession();
                Console.WriteLine($"Opened session with camera: {MainCamera.DeviceName}");
                return true;
            }
            else return false;
        }
    }
}
