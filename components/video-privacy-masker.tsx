"use client"

import type React from "react"

import { useRef, useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Play, Pause, Download, VolumeX, Volume2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Types for our application
type Mask = {
  x: number
  y: number
  width: number
  height: number
}

type MaskType = "blur" | "pixelate" | "solid"

export default function VideoPrivacyMasker() {
  // File and video state
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null)
  
  // Video playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [removeAudio, setRemoveAudio] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  
  // Masking state
  const [maskType, setMaskType] = useState<MaskType>("solid")
  const [maskIntensity, setMaskIntensity] = useState(10)
  const [masks, setMasks] = useState<Mask[]>([])
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentMask, setCurrentMask] = useState<Mask | null>(null)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  // ===========================
  // Video Handling Functions
  // ===========================
  
  /**
   * Update the video time state from the video element
   */
  const updateVideoTime = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime
      setVideoTime(currentTime)
    }
  }, [])

  /**
   * Handle video loaded metadata
   */
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      console.log("Video loaded, duration:", videoRef.current.duration)
      setVideoDuration(videoRef.current.duration)
      drawFrame()
    }
  }, [])

  /**
   * Handle file upload
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.type.startsWith("video/")) {
        setVideoFile(file)

        // Revoke previous URL if it exists
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl)
        }

        const url = URL.createObjectURL(file)
        setVideoUrl(url)

        // Reset other state
        setMasks([])
        setProcessedVideoUrl(null)
      }
    }
  }

  /**
   * Remove the current video and reset state
   */
  const handleRemoveVideo = () => {
    // Clean up URLs
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
    if (processedVideoUrl) {
      URL.revokeObjectURL(processedVideoUrl)
    }

    // Reset all states
    setVideoFile(null)
    setVideoUrl(null)
    setIsPlaying(false)
    setVideoTime(0)
    setVideoDuration(0)
    setMasks([])
    setProcessedVideoUrl(null)
    setRemoveAudio(false)
  }

  /**
   * Handle slider time change
   */
  const handleTimeChange = (value: number[]) => {
    if (videoRef.current) {
      // Update the video's current time to match the slider value
      videoRef.current.currentTime = value[0]
      setVideoTime(value[0])
      drawFrame()
    }
  }

  /**
   * Setup video playback frame drawing
   */
  const setupFrameDrawing = useCallback(() => {
    if (!videoRef.current) return
    
    const drawVideoFrame = () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return
      }
      
      // Draw the current frame
      drawFrame()
      
      // Request the next frame
      requestAnimationFrame(drawVideoFrame)
    }
    
    // Start the animation loop
    drawVideoFrame()
  }, [])

  /**
   * Toggle play/pause state
   */
  const togglePlayPause = async () => {
    if (!videoRef.current) return
    
    try {
      // If currently playing, pause the video
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
        return
      }
      
      // If not playing, start playback
      // Ensure the video's current time is set to the videoTime state value
      videoRef.current.currentTime = videoTime
      
      // Setup frame drawing when playing
      const handlePlaying = () => {
        setupFrameDrawing()
      }
      
      videoRef.current.onplaying = handlePlaying
      
      // Handle video end
      videoRef.current.onended = () => {
        if (videoRef.current) {
          videoRef.current.onplaying = null
          videoRef.current.onended = null
        }
        setIsPlaying(false)
      }
      
      // Play the video with proper error handling
      await videoRef.current.play()
      setIsPlaying(true)
    } catch (error) {
      console.error("Error toggling video playback:", error)
      
      // Reset play state if an error occurs, unless it's an AbortError
      if (error instanceof DOMException && error.name !== 'AbortError') {
        setIsPlaying(false)
      }
    }
  }

  // ===========================
  // Canvas Drawing Functions
  // ===========================
  
  /**
   * Draw the current video frame to the canvas
   */
  const drawFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (ctx) {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw the current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    }
  }, [])

  /**
   * Draw mask overlay
   */
  const drawOverlay = useCallback(() => {
    if (!overlayCanvasRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const overlay = overlayCanvasRef.current
    const ctx = overlay.getContext("2d")

    if (ctx) {
      // Set canvas dimensions to match the video canvas
      overlay.width = canvas.width
      overlay.height = canvas.height

      ctx.clearRect(0, 0, overlay.width, overlay.height)

      // Draw existing masks
      masks.forEach((mask) => {
        drawMaskOverlay(ctx, mask)
      })

      // Draw current mask being created
      if (isDrawing && currentMask) {
        drawMaskOverlay(ctx, currentMask)
      }
    }
  }, [isDrawing, currentMask, masks])

  /**
   * Draw a single mask overlay
   */
  const drawMaskOverlay = (ctx: CanvasRenderingContext2D, mask: Mask) => {
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
    ctx.fillRect(mask.x, mask.y, mask.width, mask.height)
    ctx.strokeStyle = "red"
    ctx.lineWidth = 2
    ctx.strokeRect(mask.x, mask.y, mask.width, mask.height)
  }

  // ===========================
  // Canvas Interaction Functions
  // ===========================
  
  /**
   * Get canvas coordinates from mouse event
   */
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  /**
   * Handle mouse down on canvas
   */
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e)
    
    setIsDrawing(true)
    setDrawStart(coords)
    setCurrentMask({ x: coords.x, y: coords.y, width: 0, height: 0 })
  }

  /**
   * Handle mouse move on canvas
   */
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return

    const coords = getCanvasCoordinates(e)
    
    const width = coords.x - drawStart.x
    const height = coords.y - drawStart.y

    setCurrentMask({
      x: width > 0 ? drawStart.x : coords.x,
      y: height > 0 ? drawStart.y : coords.y,
      width: Math.abs(width),
      height: Math.abs(height),
    })

    // Draw the overlay
    drawOverlay()
  }

  /**
   * Handle mouse up on canvas
   */
  const handleCanvasMouseUp = () => {
    if (isDrawing && currentMask) {
      // Only add masks with some size
      if (currentMask.width > 5 && currentMask.height > 5) {
        setMasks([...masks, { ...currentMask }])
      }
    }

    setIsDrawing(false)
    setDrawStart(null)
  }

  // ===========================
  // Mask Management Functions
  // ===========================
  
  /**
   * Clear a specific mask
   */
  const clearMask = (index: number) => {
    const newMasks = [...masks]
    newMasks.splice(index, 1)
    setMasks(newMasks)
    drawOverlay()
  }

  /**
   * Clear all masks
   */
  const clearAllMasks = () => {
    setMasks([])
    drawOverlay()
  }

  /**
   * Apply mask effect to an area of the canvas
   */
  const applyMaskEffect = (
    ctx: CanvasRenderingContext2D,
    mask: Mask,
  ) => {
    const { x, y, width, height } = mask

    // Make sure we're working with integer coordinates for better performance
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const iw = Math.ceil(width)
    const ih = Math.ceil(height)

    if (maskType === "blur") {
      applyBlurEffect(ctx, ix, iy, iw, ih)
    } else if (maskType === "pixelate") {
      applyPixelateEffect(ctx, ix, iy, iw, ih)
    } else if (maskType === "solid") {
      applySolidEffect(ctx, ix, iy, iw, ih)
    }
  }

  /**
   * Apply blur effect
   */
  const applyBlurEffect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    // For blur, we need to get the image data, apply a blur effect, and put it back
    const imageData = ctx.getImageData(x, y, width, height)
    const data = imageData.data
    
    // Scale intensity based on mask size to prevent excessive blurring
    // Cap the radius at 20% of the smallest dimension for performance
    const maxRadius = Math.min(Math.floor(Math.min(width, height) * 0.2), 30);
    const scaledIntensity = Math.min(maskIntensity, maxRadius);

    // More efficient box blur implementation
    const tempData = new Uint8ClampedArray(data.length)

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0
        let count = 0

        // Sample horizontally
        for (let i = Math.max(0, x - scaledIntensity); i < Math.min(width, x + scaledIntensity + 1); i++) {
          const idx = (y * width + i) * 4
          r += data[idx]
          g += data[idx + 1]
          b += data[idx + 2]
          a += data[idx + 3]
          count++
        }

        // Write to temp buffer
        const outIdx = (y * width + x) * 4
        tempData[outIdx] = r / count
        tempData[outIdx + 1] = g / count
        tempData[outIdx + 2] = b / count
        tempData[outIdx + 3] = a / count
      }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0, g = 0, b = 0, a = 0
        let count = 0

        // Sample vertically
        for (let i = Math.max(0, y - scaledIntensity); i < Math.min(height, y + scaledIntensity + 1); i++) {
          const idx = (i * width + x) * 4
          r += tempData[idx]
          g += tempData[idx + 1]
          b += tempData[idx + 2]
          a += tempData[idx + 3]
          count++
        }

        // Write back to original data
        const outIdx = (y * width + x) * 4
        data[outIdx] = r / count
        data[outIdx + 1] = g / count
        data[outIdx + 2] = b / count
        data[outIdx + 3] = a / count
      }
    }

    ctx.putImageData(imageData, x, y)
  }

  /**
   * Apply pixelate effect
   */
  const applyPixelateEffect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    // Scale the pixelSize based on the mask dimensions and intensity
    // This ensures the pixelation works well even at high intensity values
    const minDimension = Math.min(width, height);
    const scaleFactor = maskIntensity / 100; // Convert to a percentage
    
    // Calculate appropriate pixel size (min 2, max 25% of the smallest dimension)
    const maxPixelSize = Math.floor(minDimension * 0.25);
    const pixelSize = Math.max(2, Math.min(Math.floor(minDimension * scaleFactor), maxPixelSize));

    // Get the image data for the region
    const imageData = ctx.getImageData(x, y, width, height)
    const data = imageData.data

    // Loop through the region in pixel size steps
    for (let y = 0; y < height; y += pixelSize) {
      for (let x = 0; x < width; x += pixelSize) {
        // Calculate average color for this block
        let r = 0, g = 0, b = 0, a = 0
        let count = 0

        // Sample pixels in this block
        for (let by = 0; by < pixelSize && y + by < height; by++) {
          for (let bx = 0; bx < pixelSize && x + bx < width; bx++) {
            const idx = ((y + by) * width + (x + bx)) * 4
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
            a += data[idx + 3]
            count++
          }
        }

        // Calculate average
        r = Math.floor(r / count)
        g = Math.floor(g / count)
        b = Math.floor(b / count)
        a = Math.floor(a / count)

        // Apply that color to all pixels in the block
        for (let by = 0; by < pixelSize && y + by < height; by++) {
          for (let bx = 0; bx < pixelSize && x + bx < width; bx++) {
            const idx = ((y + by) * width + (x + bx)) * 4
            data[idx] = r
            data[idx + 1] = g
            data[idx + 2] = b
            data[idx + 3] = a
          }
        }
      }
    }

    ctx.putImageData(imageData, x, y)
  }

  /**
   * Apply solid effect
   */
  const applySolidEffect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    // For solid, just draw a filled rectangle
    ctx.fillStyle = "black"
    ctx.fillRect(x, y, width, height)
  }

  // ===========================
  // Video Processing Function
  // ===========================
  
  /**
   * Process the video with masks
   */
  const processVideo = async () => {
    if (!videoRef.current || !canvasRef.current || (masks.length === 0 && !removeAudio) || !videoFile) return

    setIsProcessing(true)
    setShowAlert(true) // Show the alert banner when processing starts
    
    // Disable UI controls during processing
    const controls = getUIControls()
    disableUIControls(controls, true)

    // Mute the audio if removeAudio is true
    if (videoRef.current) {
      videoRef.current.muted = removeAudio
    }

    // Create working canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      setIsProcessing(false)
      disableUIControls(controls, false)
      return
    }

    // Set canvas dimensions
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight

    // Ensure video is properly reset before processing
    try {
      // First, pause the video to ensure it's in a stable state
      if (videoRef.current.played.length > 0) {
        videoRef.current.pause()
        setIsPlaying(false)
      }

      // Clear any existing event handlers to prevent conflicts
      if (videoRef.current) {
        videoRef.current.onplaying = null
        videoRef.current.onended = null
      }
      
      // Reset video to beginning and wait a brief moment to ensure state is stable
      videoRef.current.currentTime = 0
      await new Promise(resolve => setTimeout(resolve, 50))

      // Process the video with awaiting
      await processVideoFrames(videoFile, videoRef.current, canvas, ctx, controls)
    } catch (error) {
      console.error('Error processing video:', error)
      setIsProcessing(false)
      disableUIControls(controls, false)
    }
  }

  /**
   * Get UI control elements
   */
  const getUIControls = () => {
    return {
      processButton: document.getElementById('process-video-button') as HTMLButtonElement,
      playPauseButton: document.getElementById('play-pause-button') as HTMLButtonElement,
      videoSlider: document.getElementById('video-time-slider') as HTMLInputElement
    }
  }

  /**
   * Enable/disable UI controls
   */
  const disableUIControls = (
    controls: { 
      processButton: HTMLButtonElement | null, 
      playPauseButton: HTMLButtonElement | null, 
      videoSlider: HTMLInputElement | null 
    }, 
    disabled: boolean
  ) => {
    if (controls.processButton) controls.processButton.disabled = disabled
    if (controls.playPauseButton) controls.playPauseButton.disabled = disabled
    if (controls.videoSlider) controls.videoSlider.disabled = disabled
  }

  /**
   * Process video frames and create output
   */
  const processVideoFrames = async (
    videoFile: File,
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    controls: ReturnType<typeof getUIControls>
  ) => {
    // Estimate the video bitrate from the file size and duration
    const estimatedBitrate = (videoFile.size * 8) / videoElement.duration // in bits per second

    // Create a MediaStream from the canvas
    const videoStream = canvas.captureStream(24) // Capture at 24 fps
    
    // Get the audio track from the original video if not removing audio
    if (!removeAudio) {
      const audioStream = (videoElement as any).captureStream()
      const audioTrack = audioStream?.getAudioTracks?.()?.[0]
      if (audioTrack) {
        videoStream.addTrack(audioTrack)
      }
    }

    // Check for H.264 support
    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac') 
      ? 'video/mp4;codecs=h264,aac'
      : MediaRecorder.isTypeSupported('video/mp4') 
        ? 'video/mp4'
        : 'video/webm;codecs=h264,opus'

    // Create MediaRecorder with estimated bitrate
    const mediaRecorder = new MediaRecorder(videoStream, {
      mimeType,
      videoBitsPerSecond: estimatedBitrate
    })

    const chunks: Blob[] = []
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      // Determine the correct MIME type for the Blob
      const blobType = mimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm'
      const blob = new Blob(chunks, { type: blobType })
      
      if (processedVideoUrl) {
        URL.revokeObjectURL(processedVideoUrl)
      }

      const url = URL.createObjectURL(blob)
      setProcessedVideoUrl(url)
      setIsProcessing(false)

      // Re-enable controls
      disableUIControls(controls, false)
      
      // Clean up event handlers
      if (videoElement) {
        videoElement.onplaying = null
        videoElement.onended = null
      }

      // Scroll to the bottom of the page to show the processed video
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100); // Small delay to ensure state updates have rendered
    }

    // Request data frequently to ensure we capture everything
    mediaRecorder.start(1000) // Capture in 1-second chunks

    // Function to process current frame
    const processFrame = () => {
      // Draw the current frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
      
      // Apply masks
      masks.forEach((mask) => {
        applyMaskEffect(ctx, mask)
      })
    }

    // Set up event handlers for processing
    let playbackStarted = false;
    
    // Handle video playback
    videoElement.onplaying = () => {
      playbackStarted = true;
      const drawFrame = () => {
        if (videoElement.paused || videoElement.ended) {
          mediaRecorder.stop()
          return
        }
        processFrame()
        requestAnimationFrame(drawFrame)
      }
      drawFrame()
    }

    // Handle video end
    videoElement.onended = () => {
      mediaRecorder.stop()
      videoElement.onplaying = null
      videoElement.onended = null
      setIsPlaying(false)
    }

    // Start playback with improved error handling
    try {
      // Make sure we're at the beginning
      videoElement.currentTime = 0;
      
      // Start playback
      await videoElement.play();
    } catch (error) {
      // If an AbortError occurs but playback actually started, we can ignore the error
      if (error instanceof DOMException && error.name === 'AbortError' && playbackStarted) {
        console.log('Ignoring AbortError as playback already started');
        return;
      }
      
      console.error('Error playing video during processing:', error);
      
      // For non-AbortError issues, stop processing
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        mediaRecorder.stop();
      }
    }
  }

  // ===========================
  // Effects and Cleanup
  // ===========================
  
  // Setup video event listeners
  useEffect(() => {
    if (!videoRef.current) return
    
    // Event handlers
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)
    
    // Add event listeners
    videoRef.current.addEventListener("timeupdate", updateVideoTime)
    videoRef.current.addEventListener("play", handlePlay)
    videoRef.current.addEventListener("pause", handlePause)
    videoRef.current.addEventListener("ended", handleEnded)
    videoRef.current.addEventListener("loadedmetadata", handleVideoLoaded)

    // If video is already loaded (cached), trigger the loadedmetadata handler manually
    if (videoRef.current.readyState >= 1) {
      handleVideoLoaded()
    }

    // Cleanup
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("timeupdate", updateVideoTime)
        videoRef.current.removeEventListener("play", handlePlay)
        videoRef.current.removeEventListener("pause", handlePause)
        videoRef.current.removeEventListener("ended", handleEnded)
        videoRef.current.removeEventListener("loadedmetadata", handleVideoLoaded)
      }
    }
  }, [videoRef, updateVideoTime, handleVideoLoaded])

  // Redraw overlay when masks change
  useEffect(() => {
    drawOverlay()
  }, [masks, drawOverlay])

  // Draw frame when video pauses
  useEffect(() => {
    if (!isPlaying) {
      drawFrame()
    }
  }, [isPlaying, drawFrame])

  // Cleanup URLs on component unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      if (processedVideoUrl) {
        URL.revokeObjectURL(processedVideoUrl)
      }
    }
  }, [videoUrl, processedVideoUrl])

  // Mute the audio if removeAudio is true
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = removeAudio
    }
  }, [removeAudio])

  // Setup alert timer effect
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    
    if (showAlert) {
      timerId = setTimeout(() => {
        setShowAlert(false);
      }, 3000); // 3 seconds
    }
    
    // Cleanup function to clear the timeout if component unmounts or showAlert changes
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [showAlert]);

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Global styles for spinner animation */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .main-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(255, 255, 255, 0.8);
          padding: 1rem;
          border-radius: 0.5rem;
        }
        .alert-banner {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 50;
          background-color: #007faf;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
          animation: fadeIn 0.3s ease-in-out, fadeOut 0.5s ease-in-out 3.8s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translate(-50%, -50%); }
          to { opacity: 0; transform: translate(-50%, -60%); }
        }
        /* Smoother slider transitions */
        .video-time-slider [data-orientation=horizontal] {
          transition: width 0.0001s ease;
        }
        .video-time-slider [role=slider] {
          transition: left 0.0001s ease, transform 0.0001s ease;
        }
      `}</style>
      
      {showAlert && (
        <div className="alert-banner">
          The video will play automatically while processing...
        </div>
      )}
      
      {/* Upload area */}
      {!videoUrl && (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload a video.</h3>
              <p className="text-sm text-muted-foreground mb-4">Support for MP4, WebM, and other common formats.</p>
              <Button onClick={() => document.getElementById("video-upload")?.click()}>Select Video</Button>
              <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video editor */}
      {videoUrl && (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left panel: Controls */}
            <Card className="md:col-span-1" id="mask-controls-card">
              <CardContent className="p-3 flex flex-col h-full">
                <div className="space-y-2 flex-grow">
                  <h3 className="text-lg font-medium mb-2">Mask Controls</h3>

                  <div className="space-y-1">
                    <Label className="text-sm">Mask Type</Label>
                    <Select
                      value={maskType}
                      onValueChange={(value) => setMaskType(value as MaskType)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select mask type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid Color</SelectItem>
                        <SelectItem value="blur">Blur</SelectItem>
                        <SelectItem value="pixelate">Pixelate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {maskType !== "solid" && (
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">Effect Intensity</Label>
                        <span className="text-xs text-muted-foreground">{maskIntensity}</span>
                      </div>
                      <Slider
                        value={[maskIntensity]}
                        min={1}
                        max={20}
                        step={1}
                        onValueChange={(value) => setMaskIntensity(value[0])}
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-sm font-medium">Active Masks: {masks.length}</h4>
                      {masks.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 py-0 text-xs" onClick={clearAllMasks}>
                          Clear All
                        </Button>
                      )}
                    </div>
                    {masks.length > 0 ? (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {masks.map((mask, index) => (
                          <div key={index} className="flex justify-between items-center text-xs p-1 bg-muted rounded-md">
                            <span>
                              Mask {index + 1}: {Math.round(mask.width)}×{Math.round(mask.height)}
                            </span>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => clearMask(index)}>
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Draw on the video to create masks.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
                  {/* Remove Audio Toggle */}
                  <div className="flex items-center space-x-2 mb-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-0 h-8 w-8 hover:bg-muted"
                      onClick={() => setRemoveAudio(!removeAudio)}
                      aria-label={removeAudio ? "Enable Audio" : "Disable Audio"}
                    >
                      {removeAudio ? (
                        <VolumeX className="h-5 w-5 text-red-500" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </Button>
                    <Label 
                      onClick={() => setRemoveAudio(!removeAudio)}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {removeAudio ? "Remove Audio" : "Keep Audio"}
                    </Label>
                  </div>

                  <Button 
                    id="process-video-button" 
                    className="w-full" 
                    onClick={() => {
                      processVideo().catch(error => {
                        console.error("Error in process video:", error);
                        setIsProcessing(false);
                      });
                    }} 
                    disabled={masks.length === 0 && !removeAudio}
                  >
                    {isProcessing ? <div className="spinner">Loading...</div> : "Process Video"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right panel: Video preview */}
            <Card className="md:col-span-2" id="video-preview-card">
              <CardContent className="p-4 space-y-4">
                <div className="relative rounded-md overflow-hidden bg-black flex items-center justify-center">
                  {/* Video element for preview and source */}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="max-w-full max-h-[50vh] w-auto h-auto"
                    playsInline
                    preload="metadata"
                    onTimeUpdate={updateVideoTime}
                    onLoadedMetadata={handleVideoLoaded}
                  />

                  {/* Canvas elements positioned absolutely over the video */}
                  <div className="absolute top-0 left-0 w-full h-full">
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full"
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                    />
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                  </div>
                </div>

                {/* Video controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={togglePlayPause} id="play-pause-button">
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>

                      <span className="text-xs">
                        {formatTime(videoTime)} / {formatTime(videoDuration)}
                      </span>
                      {removeAudio && (
                        <VolumeX className="h-4 w-4 ml-1 text-red-500" />
                      )}
                    </div>

                    <Button variant="destructive" size="sm" onClick={handleRemoveVideo} id="remove-video-button">
                      Remove Video
                    </Button>
                  </div>

                  <Slider
                    id="video-time-slider"
                    value={[videoTime]}
                    min={0}
                    max={videoDuration || 100}
                    step={0.0001}
                    onValueChange={handleTimeChange}
                    disabled={isProcessing}
                    className="video-time-slider"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Processed video preview */}
          {(isProcessing || processedVideoUrl) && (
            <Card id="processed-video-card">
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-4">Processed Video</h3>
                
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center space-y-4 py-8">
                    <div className="spinner" style={{ 
                      width: '48px', 
                      height: '48px', 
                      border: '5px solid #ddd',
                      borderTop: '5px solid #007faf',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md overflow-hidden bg-black flex items-center justify-center">
                      <video
                        src={processedVideoUrl || ''}
                        controls
                        className="max-w-full max-h-[50vh] w-auto h-auto"
                        playsInline
                      />
                    </div>
                    <div className="flex justify-center pt-4">
                      <Button
                        id="download-video-button"
                        style={{ backgroundColor: '#007faf', color: '#fff' }}
                        onClick={() => {
                          if (!processedVideoUrl) return;
                          const a = document.createElement("a")
                          a.href = processedVideoUrl
                          a.download = "masked-video.mp4"
                          a.click()
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Video
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}


