using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using EdgeJs;
using EOSDigital.API;
using EOSDigital.SDK;
using System.Threading.Tasks;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace NodeBindings
{


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
        static Camera MainCamera;
        static CanonAPI Api;
        static AutoResetEvent Waiter;

        static string ImageSaveDirectory;
        static bool Error = false;

        static int PreviewTick = 0;
        static BitmapImage PreviewBuffer;//buffer for preview images
       
    static ManualResetEvent WaitEvent = new ManualResetEvent(false);
    
        public async Task<object> MainAsync()
        {
            var result = new NodeResult();
            try
            {


                var increment = Edge.Func(@"
                    var current = 0;

                    return function (data, callback) {
                        current += data;
                        callback(null, current);
                    }
                ");

                Console.WriteLine(await increment(4));



                Console.WriteLine("Starting up...");
                Waiter = new AutoResetEvent(false);
                Api = new CanonAPI();

                var camList = Api.GetCameraList();
                if (camList.Count == 0)
                {
                    Api.CameraAdded += Api_CameraAdded;
                    Console.WriteLine("Please connect a camera...");
                    Waiter.WaitOne();
                }
                else MainCamera = camList[0];

                Console.WriteLine("Open session with " + MainCamera.DeviceName + "...");
                MainCamera.OpenSession();
                MainCamera.DownloadReady += MainCamera_DownloadReady;
                MainCamera.SaveTo = SaveTo.Host;
                await MainCamera.SetCapacity(4096, 999999999);

                Console.WriteLine("Press any key to take a photo...");
                Console.ReadKey();
                if (MainCamera.IsShutterButtonAvailable)
                {
                    await MainCamera.SC_PressShutterButton(ShutterButton.Completely);
                    await MainCamera.SC_PressShutterButton(ShutterButton.OFF);
                }
                else await MainCamera.SC_TakePicture();

                Console.WriteLine("Waiting for download...");
                Waiter.WaitOne();

                Console.WriteLine("Closing session...");
                MainCamera.DownloadReady -= MainCamera_DownloadReady;
                MainCamera.CloseSession();
            }
            catch (DllNotFoundException) { Console.WriteLine("Canon DLLs not found. They should lie beside the executable."); }
            catch (SDKException SDKex)
            {
                if (SDKex.Error == ErrorCode.TAKE_PICTURE_AF_NG) Console.WriteLine("Couldn't focus");
                else throw;
            }
            catch (Exception ex) { Console.WriteLine("Error: " + ex.Message); }

            return result;
        }





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

        public async Task<object> StartLiveView(dynamic input)
        {
            NodeResult result = new NodeResult();

            try
            {
                MainCamera.LiveViewUpdated += MainCamera_LiveViewUpdated;
                MainCamera.StartLiveView();
                result.message = "Starting LiveView";
                result.success = true;
            }
            catch (Exception ex) {result.message="Error: " + ex.Message;
                result.success = false;
            }
            
            return result;
        }

        private void MainCamera_LiveViewUpdated(Camera sender, Stream img)
        {
            PreviewImageResult result = new PreviewImageResult();
            Console.WriteLine("LiveView updated");

            try
            {
                Program.PreviewBuffer = new BitmapImage();
                using (WrapStream s = new WrapStream(img))
                {
                    img.Position = 0;
                    BitmapImage EvfImage = new BitmapImage();
                    EvfImage.BeginInit();
                    EvfImage.StreamSource = s;
                    EvfImage.CacheOption = BitmapCacheOption.OnLoad;
                    EvfImage.EndInit();
                    EvfImage.Freeze();
                }
            }

            catch (Exception ex)
            {
                result.message = "Error: " + ex.Message;
                result.success = false;
            }
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
                    MainCamera.StartFilming(true);
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
                bool save = true;//s (bool)STComputerRdButton.IsChecked || (bool)STBothRdButton.IsChecked;
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
                if (Api == null )
                {
                    Api = new CanonAPI();
                }
                Console.WriteLine("APIHandler initialised");
                List<Camera> cameras = Api.GetCameraList();
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
                    Api.CameraAdded += APIHandler_CameraAdded;
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
            Api.Dispose();

            result.message = "Camera session ended.";
            result.success = true;
            return result;
        }


        /*
       * Stub example for reference:
       */
        public async Task<object> GetPreviewImage(dynamic input)
        {
      
            Console.WriteLine("GetPreviewImage::0");
            var result = new PreviewImageResult();
            //Method work goes here...
            try
            {
                Console.WriteLine("GetPreviewImage::1");
                PreviewBuffer.Freeze();
                result.bitmap = PreviewBuffer;
                Console.WriteLine("GetPreviewImage::2");
            }
            catch (Exception exp)
            {
                result.bitmap = new BitmapImage();
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

            List<Camera> cameras = Api.GetCameraList();
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

        #region SDK Events

        static void Api_CameraAdded(CanonAPI sender)
        {

        }

        static void ErrorHandler_SevereErrorHappened(object sender, Exception ex)
        {
            
        }

        static void ErrorHandler_NonSevereErrorHappened(object sender, ErrorCode ex)
        {
            
        }

       
        private void MainCamera_CameraHasShutdown(object sender, string Value)
        {
            
        }

        private void MainCamera_LiveViewStopped(Camera sender)
        {
            
        }

        private void MainCamera_ProgressChanged(object sender, int Progress, ref bool Cancel)
        {

        }

        #endregion

    }
}
