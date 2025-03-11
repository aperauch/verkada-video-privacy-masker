"use client"

import type React from "react"

import { useRef, useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Play, Pause, Download } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function VideoPrivacyMasker() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [maskType, setMaskType] = useState<"blur" | "pixelate" | "solid">("blur")
  const [maskIntensity, setMaskIntensity] = useState(10)
  const [masks, setMasks] = useState<{ x: number; y: number; width: number; height: number }[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentMask, setCurrentMask] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  // Handle file upload
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

  // Video playback controls
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const updateVideoTime = () => {
    if (videoRef.current) {
      setVideoTime(videoRef.current.currentTime)
    }
  }

  const handleTimeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0]
      setVideoTime(value[0])
      drawFrame()
    }
  }

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration)
      // Draw the first frame
      drawFrame()
    }
  }

  // Drawing functions
  const drawFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
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
    }
  }, [])

  // Handle canvas mouse events for drawing masks
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setIsDrawing(true)
    setDrawStart({ x, y })
    setCurrentMask({ x, y, width: 0, height: 0 })
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || !canvasRef.current || !overlayCanvasRef.current) return

    const canvas = canvasRef.current
    const overlay = overlayCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const width = x - drawStart.x
    const height = y - drawStart.y

    setCurrentMask({
      x: width > 0 ? drawStart.x : x,
      y: height > 0 ? drawStart.y : y,
      width: Math.abs(width),
      height: Math.abs(height),
    })

    // Draw the overlay
    drawOverlay()
  }

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
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
        ctx.fillRect(mask.x, mask.y, mask.width, mask.height)
        ctx.strokeStyle = "red"
        ctx.lineWidth = 2
        ctx.strokeRect(mask.x, mask.y, mask.width, mask.height)
      })

      // Draw current mask being created
      if (isDrawing && currentMask) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
        ctx.fillRect(currentMask.x, currentMask.y, currentMask.width, currentMask.height)
        ctx.strokeStyle = "red"
        ctx.lineWidth = 2
        ctx.strokeRect(currentMask.x, currentMask.y, currentMask.width, currentMask.height)
      }
    }
  }, [isDrawing, currentMask, masks])

  // Process video with masks
  const processVideo = async () => {
    if (!videoRef.current || !canvasRef.current || masks.length === 0) return

    const video = videoRef.current
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Pause the video during processing
    video.pause()
    setIsPlaying(false)

    try {
      // Get the original video's frame rate if possible, or default to 30fps
      const fps = 30

      // Create a MediaRecorder with better settings
      const stream = canvas.captureStream(fps)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 5000000, // 5 Mbps for better quality
      })

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" })
        if (processedVideoUrl) {
          URL.revokeObjectURL(processedVideoUrl)
        }
        const url = URL.createObjectURL(blob)
        setProcessedVideoUrl(url)
      }

      mediaRecorder.start()

      // Reset video to beginning
      video.currentTime = 0

      // Use requestAnimationFrame for better timing
      const lastTime = -1
      let processing = true

      const processNextFrame = () => {
        if (!processing) return

        // Draw the current video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Apply masks
        masks.forEach((mask) => {
          applyMaskEffect(ctx, mask)
        })

        // Check if we've reached the end of the video
        if (video.currentTime >= video.duration - 0.1) {
          processing = false
          mediaRecorder.stop()
          return
        }

        // Advance to next frame with better timing
        const targetTime = video.currentTime + 1 / fps

        // Only seek if we need to move forward by a meaningful amount
        if (targetTime > video.currentTime + 0.01) {
          video.currentTime = targetTime
        }

        // Wait for the seek to complete
        const checkSeek = () => {
          if (Math.abs(video.currentTime - targetTime) < 0.01 || video.currentTime > targetTime) {
            requestAnimationFrame(processNextFrame)
          } else {
            // If seek hasn't completed yet, check again soon
            setTimeout(checkSeek, 5)
          }
        }

        checkSeek()
      }

      // Handle the seeked event to start processing
      video.addEventListener("seeked", function onSeeked() {
        // Start processing the first frame
        if (processing && video.currentTime < 0.1) {
          requestAnimationFrame(processNextFrame)
        }
        // Remove the event listener after first use
        video.removeEventListener("seeked", onSeeked)
      })

      // Start the process
      video.currentTime = 0
    } catch (error) {
      console.error("Error processing video:", error)
    }
  }

  const applyMaskEffect = (
    ctx: CanvasRenderingContext2D,
    mask: { x: number; y: number; width: number; height: number },
  ) => {
    const { x, y, width, height } = mask

    // Make sure we're working with integer coordinates for better performance
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const iw = Math.ceil(width)
    const ih = Math.ceil(height)

    if (maskType === "blur") {
      // For blur, we need to get the image data, apply a blur effect, and put it back
      const imageData = ctx.getImageData(ix, iy, iw, ih)
      const data = imageData.data
      const intensity = maskIntensity

      // More efficient box blur implementation
      const tempData = new Uint8ClampedArray(data.length)

      // Horizontal pass
      for (let y = 0; y < ih; y++) {
        for (let x = 0; x < iw; x++) {
          let r = 0,
            g = 0,
            b = 0,
            a = 0
          let count = 0

          // Sample horizontally
          for (let i = Math.max(0, x - intensity); i < Math.min(iw, x + intensity + 1); i++) {
            const idx = (y * iw + i) * 4
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
            a += data[idx + 3]
            count++
          }

          // Write to temp buffer
          const outIdx = (y * iw + x) * 4
          tempData[outIdx] = r / count
          tempData[outIdx + 1] = g / count
          tempData[outIdx + 2] = b / count
          tempData[outIdx + 3] = a / count
        }
      }

      // Vertical pass
      for (let x = 0; x < iw; x++) {
        for (let y = 0; y < ih; y++) {
          let r = 0,
            g = 0,
            b = 0,
            a = 0
          let count = 0

          // Sample vertically
          for (let i = Math.max(0, y - intensity); i < Math.min(ih, y + intensity + 1); i++) {
            const idx = (i * iw + x) * 4
            r += tempData[idx]
            g += tempData[idx + 1]
            b += tempData[idx + 2]
            a += tempData[idx + 3]
            count++
          }

          // Write back to original data
          const outIdx = (y * iw + x) * 4
          data[outIdx] = r / count
          data[outIdx + 1] = g / count
          data[outIdx + 2] = b / count
          data[outIdx + 3] = a / count
        }
      }

      ctx.putImageData(imageData, ix, iy)
    } else if (maskType === "pixelate") {
      // For pixelation, we sample the image at a lower resolution
      const pixelSize = Math.max(2, Math.floor(maskIntensity))

      // Get the image data for the region
      const imageData = ctx.getImageData(ix, iy, iw, ih)
      const data = imageData.data

      // Loop through the region in pixel size steps
      for (let y = 0; y < ih; y += pixelSize) {
        for (let x = 0; x < iw; x += pixelSize) {
          // Calculate average color for this block
          let r = 0,
            g = 0,
            b = 0,
            a = 0
          let count = 0

          // Sample pixels in this block
          for (let by = 0; by < pixelSize && y + by < ih; by++) {
            for (let bx = 0; bx < pixelSize && x + bx < iw; bx++) {
              const idx = ((y + by) * iw + (x + bx)) * 4
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
          for (let by = 0; by < pixelSize && y + by < ih; by++) {
            for (let bx = 0; bx < pixelSize && x + bx < iw; bx++) {
              const idx = ((y + by) * iw + (x + bx)) * 4
              data[idx] = r
              data[idx + 1] = g
              data[idx + 2] = b
              data[idx + 3] = a
            }
          }
        }
      }

      ctx.putImageData(imageData, ix, iy)
    } else if (maskType === "solid") {
      // For solid, just draw a filled rectangle
      ctx.fillStyle = "black"
      ctx.fillRect(ix, iy, iw, ih)
    }
  }

  // Clear a specific mask
  const clearMask = (index: number) => {
    const newMasks = [...masks]
    newMasks.splice(index, 1)
    setMasks(newMasks)
    drawOverlay()
  }

  // Clear all masks
  const clearAllMasks = () => {
    setMasks([])
    drawOverlay()
  }

  // Update canvas when video updates
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener("timeupdate", updateVideoTime)
      videoRef.current.addEventListener("play", () => setIsPlaying(true))
      videoRef.current.addEventListener("pause", () => setIsPlaying(false))
      videoRef.current.addEventListener("loadedmetadata", handleVideoLoaded)

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener("timeupdate", updateVideoTime)
          videoRef.current.removeEventListener("play", () => setIsPlaying(true))
          videoRef.current.removeEventListener("pause", () => setIsPlaying(false))
          videoRef.current.removeEventListener("loadedmetadata", handleVideoLoaded)
        }
      }
    }
  }, [videoRef])

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

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Upload area */}
      {!videoUrl && (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload a video</h3>
              <p className="text-sm text-muted-foreground mb-4">Support for MP4, WebM, and other common formats</p>
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
            <Card className="md:col-span-1">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-lg font-medium mb-4">Mask Controls</h3>

                <div className="space-y-2">
                  <Label>Mask Type</Label>
                  <Select
                    value={maskType}
                    onValueChange={(value) => setMaskType(value as "blur" | "pixelate" | "solid")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mask type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blur">Blur</SelectItem>
                      <SelectItem value="pixelate">Pixelate</SelectItem>
                      <SelectItem value="solid">Solid Color</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Effect Intensity ({maskIntensity})</Label>
                  <Slider
                    value={[maskIntensity]}
                    min={1}
                    max={20}
                    step={1}
                    onValueChange={(value) => setMaskIntensity(value[0])}
                  />
                </div>

                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-2">Active Masks: {masks.length}</h4>
                  {masks.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {masks.map((mask, index) => (
                        <div key={index} className="flex justify-between items-center text-xs p-2 bg-muted rounded-md">
                          <span>
                            Mask {index + 1}: {Math.round(mask.width)}×{Math.round(mask.height)}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => clearMask(index)}>
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Draw on the video to create masks</p>
                  )}

                  {masks.length > 0 && (
                    <Button variant="outline" size="sm" className="mt-2 w-full" onClick={clearAllMasks}>
                      Clear All Masks
                    </Button>
                  )}
                </div>

                <div className="pt-4">
                  <Button className="w-full" onClick={processVideo} disabled={masks.length === 0}>
                    Process Video
                  </Button>
                </div>

                {processedVideoUrl && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const a = document.createElement("a")
                        a.href = processedVideoUrl
                        a.download = "masked-video.webm"
                        a.click()
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Processed Video
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right panel: Video preview */}
            <Card className="md:col-span-2">
              <CardContent className="p-4 space-y-4">
                <div className="relative rounded-md overflow-hidden bg-black flex items-center justify-center">
                  {/* Hidden video element for source */}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="hidden"
                    onTimeUpdate={updateVideoTime}
                    onLoadedMetadata={handleVideoLoaded}
                    playsInline
                  />

                  {/* Canvas for displaying video frames */}
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className="block max-w-full max-h-[50vh] w-auto h-auto"
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                    />

                    {/* Overlay canvas for drawing masks */}
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                  </div>
                </div>

                {/* Video controls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={togglePlayPause}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>

                    <span className="text-xs">
                      {formatTime(videoTime)} / {formatTime(videoDuration)}
                    </span>
                  </div>

                  <Slider
                    value={[videoTime]}
                    min={0}
                    max={videoDuration || 100}
                    step={0.01}
                    onValueChange={handleTimeChange}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Processed video preview */}
          {processedVideoUrl && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-4">Processed Video</h3>
                <div className="rounded-md overflow-hidden bg-black flex items-center justify-center">
                  <video
                    src={processedVideoUrl}
                    controls
                    className="max-w-full max-h-[50vh] w-auto h-auto"
                    playsInline
                  />
                </div>
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

