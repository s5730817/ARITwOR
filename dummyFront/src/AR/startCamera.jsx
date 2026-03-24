export async function startCamera(videoRef) {

  try {

    alert("Requesting camera permission");

    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });

    const devices = await navigator.mediaDevices.enumerateDevices();

    const videoDevices = devices.filter(d => d.kind === "videoinput");

    let rearCamera = videoDevices.find(device =>
      device.label.toLowerCase().includes("back") ||
      device.label.toLowerCase().includes("rear") ||
      device.label.toLowerCase().includes("environment")
    );

    if (!rearCamera) {
      alert("Rear camera not detected, selecting last camera");
      rearCamera = videoDevices[videoDevices.length - 1];
    }

    tempStream.getTracks().forEach(track => track.stop());

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: rearCamera.deviceId },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });

    videoRef.current.srcObject = stream;

    alert("Rear camera connected");

  } catch (err) {

    alert("Camera error: " + err.message);

  }

}