using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using EOSDigital.API;
using EOSDigital.SDK;
using System.Threading.Tasks;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace NodeBindings
{

    static Camera MainCamera;
    static CanonAPI Api;
    static AutoResetEvent Waiter;

    public class NodeResult
    {
        public string message = "NodeResult: No message defined";
        public bool success = false;
    }




    public class PreviewImageResult
    {
        public string message = "NodeResult: No message defined";
        public BitmapImage bitmap;
        public bool success = false;
    }


    class Program
    {
        static CanonAPI APIHandler;
        static Camera MainCamera;
        static string ImageSaveDirectory;
        static bool Error = false;

        static int PreviewTick = 0;
        static BitmapImage[] PreviewBuffer;//buffer for preview images

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
                MainCamera.StartLiveView();
            }
            catch (Exception ex) {result.message="Error: " + ex.Message;
                result.success = false;
            }
            
            return result;
        }

        private void MainCamera_LiveViewUpdated(Camera sender, Stream img)
        {
            NodeResult result = new NodeResult();

            try
            {
                using (WrapStream s = new WrapStream(img))
                {
                    img.Position = 0;
                    BitmapImage EvfImage = new BitmapImage();
                    EvfImage.BeginInit();
                    EvfImage.StreamSource = s;
                    EvfImage.CacheOption = BitmapCacheOption.OnLoad;
                    EvfImage.EndInit();
                    EvfImage.Freeze();
                    PreviewTick += 1;
                    int t = PreviewTick % 1;
                    PreviewBuffer[t] = EvfImage.CloneCurrentValue();
                    //Application.Current.Dispatcher.BeginInvoke(SetImageAction, EvfImage);
                }
            }
            catch (Exception ex)
            {
                result.message = "Error: " + ex.Message;
                result.success = false;
            }
            //return result;
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

                
                {
                    result.message = "Camera must be in record mode";
                    result.success = false;
                }
            }
            catch (Exception ex){
                result.message = ex.Message;
                result.success = false;
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
            try
            {
                //Method work goes here...
                bool save = false;//s (bool)STComputerRdButton.IsChecked || (bool)STBothRdButton.IsChecked;
                MainCamera.StopFilming(save);
                result.message = "Stopped recording video.";
                result.success = true;
            }
            catch (Exception ex)
            {
                result.message = ex.Message;
                result.success = false;
            }
            return result;
        }
       
        public async Task<object> BeginSession(dynamic input)
        {
            var result = new NodeResult();
            
            try
            {
                Console.WriteLine("Called C# method from node.");
                if (APIHandler == null )
                {
                    APIHandler = new CanonAPI();
                }
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
            MainCamera?.Dispose();
            APIHandler.Dispose();

            result.message = "Camera session ended.";
            result.success = true;
            return result;
        }


        /*
       * Stub example for reference:
       */
        public async Task<object> GetPreviewImage(dynamic input)
        {
            var result = new PreviewImageResult();

            //Method work goes here...
            try
            {
                result.bitmap = PreviewBuffer[PreviewTick].Clone();
            }catch (Exception exp)
            {
                result.bitmap = new BitmapImage().Clone();
            }

            result.message = "Camera session ended.";
            result.success = true;
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
