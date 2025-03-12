import VideoPrivacyMasker from "@/components/video-privacy-masker"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8 bg-gray-50">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-center mb-6">Video Privacy Masker</h1>
        <p className="text-center mb-8 text-muted-foreground">
          Upload a video and apply privacy masks to blur sensitive areas.
        </p>
        <VideoPrivacyMasker />
      </div>
    </main>
  )
}

