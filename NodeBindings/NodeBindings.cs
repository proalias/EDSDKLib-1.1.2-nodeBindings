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
        public byte[] bitmap;
        public bool success = false;
    }


    class Program
    {
        static Camera MainCamera;
        static CanonAPI Api;
        static AutoResetEvent Waiter = new AutoResetEvent(false);
        static bool Error = false;
        static string ImageSaveDirectory;
        static string LastImageFileName;

        static MemoryStream PreviewBuffer;//buffer for preview images
       



        /**
         * Example async method:
         */
        public async Task<object> ExampleAsyncMethod(dynamic input)
        {
            var result = new NodeResult();

            //Method work goes here.

            //Return the success of the method in a result value object:
            result.message = "Camera session ended.";
            result.success = true;
            return result;
        }


        public async Task<object> TakePhoto(dynamic input)
        {
            var result = new NodeResult();
            try
            {
                MainCamera.SaveTo = SaveTo.Host;
                MainCamera.DownloadReady += MainCamera_DownloadReady;

                await MainCamera.SetCapacity(4096, 999999999);

                if (MainCamera.IsShutterButtonAvailable)
                {
                    await MainCamera.TakePhoto();
                   // await MainCamera.SC_PressShutterButton(ShutterButton.Completely);
                   // await MainCamera.SC_PressShutterButton(ShutterButton.OFF);
                    
                }
                else await MainCamera.SC_TakePicture();

                Console.WriteLine("Waiting for download...");
                Waiter.WaitOne();

                result.message = "Took photo";
                result.success = true;
            }
            catch(Exception ex) {
                result.message = ex.Message;
                result.success = false;
            }

           
            return result;
        }


        public async Task<object> SetOutputPath(dynamic input)
        {
            var result = new NodeResult(); 
            try
            {
                Console.WriteLine("Attempting to set ImageSaveDirectory to " + (string)input.outputPath);
                ImageSaveDirectory = (string)input.outputPath;
                result.message = "Set ImageSaveDirectory to " + (string)input.outputPath;
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

        public async Task<object> StopLiveView(dynamic input)
        {
            NodeResult result = new NodeResult();

            try
            {
                MainCamera.StopLiveView();
                result.message = "Stopping LiveView";
                result.success = true;
            }
            catch (Exception ex)
            {
                result.message = "Error: " + ex.Message;
                result.success = false;
            }

            return result;
        }


        private void MainCamera_LiveViewUpdated(Camera sender, Stream img)
        {
            PreviewImageResult result = new PreviewImageResult();
            //Console.WriteLine("LiveView updated");

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
                    
                    JpegBitmapEncoder encoder = new JpegBitmapEncoder();
                    String photolocation = ImageSaveDirectory + "/livePreview.jpg";  //file name 
                    encoder.Frames.Add(BitmapFrame.Create((BitmapImage)EvfImage));
                    PreviewBuffer = new MemoryStream();
                    using (PreviewBuffer)
                        encoder.Save(PreviewBuffer);
                }
                
            }

            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
                result.message = "Error: " + ex.Message;
                result.success = false;
            }
        }

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
            
            return result;
        }

        
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

                Waiter = new AutoResetEvent(false);
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
                    Waiter.WaitOne();
                    Waiter.Reset();
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

        
        public async Task<object> EndSession(dynamic input)
        {
            var result = new NodeResult();
            
            MainCamera?.Dispose();
            Api.Dispose();

            result.message = "Camera session ended.";
            result.success = true;
            return result;
        }

        
        public async Task<object> GetLastDownloadedImageFilename(dynamic input)
        {
            var result = new NodeResult();
            
            result.message = LastImageFileName;
            result.success = true;
            return result;
        }

        
      
        public async Task<object> GetPreviewImage(dynamic input)
        {
      
            var result = new PreviewImageResult();
            //Method work goes here...
            try
            {
                result.bitmap = PreviewBuffer.GetBuffer();
                result.message = "Preview Image retrieved from buffer";
                result.success = true;
            }
            catch (Exception exp)
            {
                Console.WriteLine(exp.Message);
                result.message = exp.Message;
                result.success = false;
            }
            
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
            finally { Waiter.Set(); }
        }



        private static void MainCamera_DownloadReady(Camera sender, DownloadInfo Info)
        {
            try
            {
                Console.WriteLine("Starting image download...::"+Info.FileName);
                sender.DownloadFile(Info, ImageSaveDirectory);
                Console.WriteLine("Image downloading to " + Info.FileName);
                LastImageFileName = Info.FileName;
            }
            catch (Exception ex) { Console.WriteLine("Error: " + ex.Message); Error = true; }
            finally { Waiter.Set(); }
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
        

    }
}
