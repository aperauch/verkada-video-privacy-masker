# Video Privacy Masker

A web-based tool for adding privacy masks to videos. This application allows users to easily blur, pixelate, or black out sensitive areas in videos while maintaining the original video quality in unmasked regions.

## Features

- **Multiple Masking Options**:
  - Solid Color (black) masking
  - Blur effect with adjustable intensity
  - Pixelate effect with adjustable intensity

- **Interactive Video Editor**:
  - Draw rectangular masks directly on the video
  - Real-time preview of mask effects
  - Adjustable effect intensity for blur and pixelate masks
  - Video timeline scrubbing with frame-accurate preview
  - Play/pause controls for precise mask placement

- **Audio Controls**:
  - Option to remove audio from the processed video
  - Visual indicator when audio removal is enabled

- **User-Friendly Interface**:
  - Drag-and-drop mask creation
  - List of active masks with dimensions
  - One-click mask removal
  - Clear all masks option
  - Smooth video timeline navigation

- **Video Processing**:
  - High-quality video processing
  - Progress indicator during processing
  - Automatic quality preservation
  - Download processed videos in MP4 format

## Live Preview
https://verkada-video-privacy-masker.vercel.app/

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Node.js and npm installed on your system

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aperauch/verkada-video-privacy-masker
   cd verkada-video-privacy-masker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Upload a Video**:
   - Click "Select Video" or drag and drop a video file
   - Supported formats: MP4, WebM, and other common video formats

2. **Create Privacy Masks**:
   - Select a mask type (Solid, Blur, or Pixelate)
   - For Blur and Pixelate, adjust the effect intensity as needed
   - Click and drag on the video to create rectangular masks
   - Create multiple masks as needed

3. **Adjust Masks**:
   - Review masks in the "Active Masks" list
   - Remove individual masks using the "×" button
   - Use "Clear All" to remove all masks
   - Scrub through the video timeline to ensure masks cover sensitive content throughout

4. **Audio Options**:
   - Click the volume icon to toggle audio removal
   - A red mute icon indicates audio will be removed

5. **Process Video**:
   - Click "Process Video" to apply the masks
   - Wait for processing to complete
   - Preview the processed video
   - Download the final video using the "Download Video" button

## Technical Details

The application uses:
- Next.js for the frontend framework
- React for UI components
- HTML5 Canvas for video manipulation
- Web APIs for video processing
- Tailwind CSS for styling
- Shadcn UI components

## Performance Considerations

- Large videos may take longer to process
- Processing time depends on:
  - Video duration
  - Number of masks
  - Effect types and intensities
  - Video resolution

## Browser Support

Tested and supported in:
- Chrome (recommended)
- Firefox
- Safari
- Edge
