'/******************************************************************************
'*                                                                             *
'*   PROJECT : EOS Digital Software Development Kit EDSDK                      *
'*      NAME : TakePictureCommand.vb                                           *
'*                                                                             *
'*   Description: This is the Sample code to show the usage of EDSDK.          *
'*                                                                             *
'*                                                                             *
'*******************************************************************************
'*                                                                             *
'*   Written and developed by Camera Design Dept.53                            *
'*   Copyright Canon Inc. 2006 All Rights Reserved                             *
'*                                                                             *
'*******************************************************************************
'*   File Update Information:                                                  *
'*     DATE      Identify    Comment                                           *
'*   -----------------------------------------------------------------------   *
'*   06-03-22    F-001        create first version.                            *
'*                                                                             *
'******************************************************************************/

Public Class TakePictureCommand
    Inherits Command

    Public Sub New(ByVal model As CameraModel)
        MyBase.new(model)
    End Sub

    '// Execute a command.	
    Public Overrides Function execute() As Boolean

        Dim err As Integer = EDS_ERR_OK

        '// Take a picture.
        err = EdsSendCommand(MyBase.model.getCameraObject(), EdsCameraCommand.kEdsCameraCommand_PressShutterButton, EdsShutterButton.kEdsCameraCommand_ShutterButton_Completely)
        EdsSendCommand(MyBase.model.getCameraObject(), EdsCameraCommand.kEdsCameraCommand_PressShutterButton, EdsShutterButton.kEdsCameraCommand_ShutterButton_OFF)





        '// Notify Error.
        If err <> EDS_ERR_OK Then

            '// Do not retry when the camera replys deviceBusy.
            If err = EDS_ERR_DEVICE_BUSY Then

                MyBase.model.notifyObservers(warn, err)

                Return True

            End If

            MyBase.model.notifyObservers(errr, err)

        End If

        Return True

    End Function

End Class
