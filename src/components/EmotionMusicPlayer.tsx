import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Play, Pause, SkipForward, Volume2, Camera, CameraOff } from 'lucide-react';

interface EmotionData {
  emotion: string;
  confidence: number;
  allEmotions: Record<string, number>;
}

interface Track {
  name: string;
  artist: string;
  emotion: string;
  url: string; // For demo, we'll use placeholder URLs
}

interface AudioPlayerProps {
  track: Track;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
}

const EmotionMusicPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // Mock music database
  const musicDatabase: Record<string, Track[]> = {
    happy: [
      { name: "Acoustic Breeze", artist: "Bensound", emotion: "happy", url: "https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3" },
      { name: "Summer", artist: "Bensound", emotion: "happy", url: "https://www.bensound.com/bensound-music/bensound-summer.mp3" },
      { name: "Cute", artist: "Bensound", emotion: "happy", url: "https://www.bensound.com/bensound-music/bensound-cute.mp3" },
      { name: "Sunny Day", artist: "Bensound", emotion: "happy", url: "https://www.bensound.com/bensound-music/bensound-sunny.mp3" },
      { name: "Happy Rock", artist: "Bensound", emotion: "happy", url: "https://www.bensound.com/bensound-music/bensound-happyrock.mp3" },
      { name: "Ukulele", artist: "Bensound", emotion: "happy", url: "https://www.bensound.com/bensound-music/bensound-ukulele.mp3" }
    ],
    sad: [
      { name: "Sad Day", artist: "Bensound", emotion: "sad", url: "https://www.bensound.com/bensound-music/bensound-sadday.mp3" },
      { name: "Piano Moment", artist: "Bensound", emotion: "sad", url: "https://www.bensound.com/bensound-music/bensound-pianomoment.mp3" },
      { name: "Memories", artist: "Bensound", emotion: "sad", url: "https://www.bensound.com/bensound-music/bensound-memories.mp3" }
    ],
    angry: [
      { name: "Punky", artist: "Bensound", emotion: "angry", url: "https://www.bensound.com/bensound-music/bensound-punky.mp3" },
      { name: "Energy", artist: "Bensound", emotion: "angry", url: "https://www.bensound.com/bensound-music/bensound-energy.mp3" },
      { name: "Rock Angel", artist: "Bensound", emotion: "angry", url: "https://www.bensound.com/bensound-music/bensound-rockangel.mp3" }
    ],
    neutral: [
      { name: "Relaxing", artist: "Bensound", emotion: "neutral", url: "https://www.bensound.com/bensound-music/bensound-relaxing.mp3" },
      { name: "Slow Motion", artist: "Bensound", emotion: "neutral", url: "https://www.bensound.com/bensound-music/bensound-slowmotion.mp3" },
      { name: "Creative Minds", artist: "Bensound", emotion: "neutral", url: "https://www.bensound.com/bensound-music/bensound-creativeminds.mp3" }
    ],
    surprised: [
      { name: "Funky Element", artist: "Bensound", emotion: "surprised", url: "https://www.bensound.com/bensound-music/bensound-funkyelement.mp3" },
      { name: "Groovy Hip Hop", artist: "Bensound", emotion: "surprised", url: "https://www.bensound.com/bensound-music/bensound-groovyhiphop.mp3" },
      { name: "Pop Dance", artist: "Bensound", emotion: "surprised", url: "https://www.bensound.com/bensound-music/bensound-popdance.mp3" }
    ],
    fearful: [
      { name: "Sci-Fi", artist: "Bensound", emotion: "fearful", url: "https://www.bensound.com/bensound-music/bensound-scifi.mp3" },
      { name: "Tenderness", artist: "Bensound", emotion: "fearful", url: "https://www.bensound.com/bensound-music/bensound-tenderness.mp3" },
      { name: "Dreams", artist: "Bensound", emotion: "fearful", url: "https://www.bensound.com/bensound-music/bensound-dreams.mp3" }
    ],
    disgusted: [
      { name: "Dubstep", artist: "Bensound", emotion: "disgusted", url: "https://www.bensound.com/bensound-music/bensound-dubstep.mp3" },
      { name: "Extreme Action", artist: "Bensound", emotion: "disgusted", url: "https://www.bensound.com/bensound-music/bensound-extremeaction.mp3" },
      { name: "House", artist: "Bensound", emotion: "disgusted", url: "https://www.bensound.com/bensound-music/bensound-house.mp3" }
    ]
  };

  const emotionColors = {
    happy: 'from-yellow-400 to-orange-500',
    sad: 'from-blue-600 to-purple-700',
    angry: 'from-red-500 to-red-700',
    neutral: 'from-gray-400 to-gray-600',
    surprised: 'from-pink-400 to-purple-500',
    fearful: 'from-purple-600 to-indigo-800',
    disgusted: 'from-green-500 to-green-700'
  };

  const emotionEmojis = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    neutral: '😐',
    surprised: '😲',
    fearful: '😨',
    disgusted: '🤢'
  };

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      try {
        // Load models from CDN
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights');
        await faceapi.nets.faceExpressionNet.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights');
        setModelsLoaded(true);
      } catch (error) {
        console.error('Error loading models:', error);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsDetecting(false);
  };

  const detectEmotions = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    
    faceapi.matchDimensions(canvas, displaySize);

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    }

    if (detections.length > 0) {
      const expressions = detections[0].expressions;
      const dominantEmotion = Object.keys(expressions).reduce((a, b) => 
        expressions[a] > expressions[b] ? a : b
      );

      const emotionData: EmotionData = {
        emotion: dominantEmotion,
        confidence: expressions[dominantEmotion],
        allEmotions: expressions
      };

      setCurrentEmotion(emotionData);

      // Change music if emotion changed significantly
      if (!currentTrack || 
          (currentTrack.emotion !== dominantEmotion && expressions[dominantEmotion] > 0.6)) {
        const tracks = musicDatabase[dominantEmotion] || musicDatabase.neutral;
        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        setCurrentTrack(randomTrack);
      }
    }
  }, [modelsLoaded, currentTrack]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isDetecting && modelsLoaded) {
      interval = setInterval(detectEmotions, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDetecting, detectEmotions, modelsLoaded]);

  const handleStartDetection = async () => {
    await startCamera();
    setIsDetecting(true);
  };

  const handleStopDetection = () => {
    stopCamera();
    setCurrentEmotion(null);
    setCurrentTrack(null);
    setIsPlaying(false);
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const skipTrack = () => {
    if (currentEmotion) {
      const tracks = musicDatabase[currentEmotion.emotion] || musicDatabase.neutral;
      let randomTrack;
      do {
        randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      } while (randomTrack === currentTrack && tracks.length > 1);
      setCurrentTrack(randomTrack);
    }
  };

  // Handle audio events
  const handleAudioLoad = () => {
    setAudioLoading(false);
  };

  const handleAudioPlay = () => {
    setIsPlaying(true);
  };

  const handleAudioPause = () => {
    setIsPlaying(false);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    skipTrack();
  };

  // Auto-play when track changes
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      setAudioLoading(true);
      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
      
      // Auto-play after a short delay
      const timer = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(console.error);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [currentTrack]);

  const backgroundGradient = currentEmotion 
    ? emotionColors[currentEmotion.emotion] || emotionColors.neutral
    : 'from-gray-800 to-gray-900';

  return (
    <div className={`h-screen overflow-hidden bg-gradient-to-br ${backgroundGradient} transition-all duration-1000 ease-in-out`}>
      <div className="container mx-auto px-4 py-4 h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-4 flex-shrink-0">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-1">
            Emotion Music Player
          </h1>
          <p className="text-white/80 text-sm lg:text-base">
            Let your emotions choose the music
          </p>
        </div>

        {loading && (
          <div className="text-center text-white mb-4 flex-shrink-0">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>Loading emotion detection models...</p>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Camera Section */}
          <div className="flex-1 lg:flex-[2]">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 h-full flex flex-col">
              <div className="relative flex-1 mb-4 overflow-hidden rounded-lg bg-black">
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="max-w-full max-h-full object-contain"
                    style={{ aspectRatio: '4/3' }}
                    onLoadedMetadata={() => {
                      if (canvasRef.current && videoRef.current) {
                        const video = videoRef.current;
                        const container = video.parentElement?.parentElement;
                        if (container) {
                          const containerRatio = container.clientWidth / container.clientHeight;
                          const videoRatio = video.videoWidth / video.videoHeight;
                          
                          if (containerRatio > videoRatio) {
                            video.style.width = '100%';
                            video.style.height = 'auto';
                          } else {
                            video.style.width = 'auto';
                            video.style.height = '100%';
                          }
                        }
                        canvasRef.current.width = video.videoWidth;
                        canvasRef.current.height = video.videoHeight;
                      }
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>

              <div className="text-center flex-shrink-0">
                {!isDetecting ? (
                  <button
                    onClick={handleStartDetection}
                    disabled={!modelsLoaded || loading}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto text-sm lg:text-base"
                  >
                    <Camera size={18} />
                    Start Emotion Detection
                  </button>
                ) : (
                  <button
                    onClick={handleStopDetection}
                    className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto text-sm lg:text-base"
                  >
                    <CameraOff size={18} />
                    Stop Detection
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Emotion & Music */}
          <div className="flex-1 lg:flex-[1] flex flex-col gap-4">
            {/* Emotion Display */}
            {currentEmotion && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-shrink-0">
                <div className="text-center mb-3">
                  <div className="text-4xl lg:text-5xl mb-2">
                    {emotionEmojis[currentEmotion.emotion]}
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold text-white capitalize">
                    {currentEmotion.emotion}
                  </h2>
                  <p className="text-white/80 text-sm">
                    Confidence: {(currentEmotion.confidence * 100).toFixed(1)}%
                  </p>
                </div>

                {/* Emotion Bars - Compact */}
                <div className="space-y-1">
                  {Object.entries(currentEmotion.allEmotions).map(([emotion, value]) => (
                    <div key={emotion} className="flex items-center justify-between">
                      <span className="text-white/80 capitalize text-xs w-16">
                        {emotion}
                      </span>
                      <div className="flex-1 mx-2 bg-white/20 rounded-full h-1.5">
                        <div
                          className="bg-white rounded-full h-1.5 transition-all duration-300"
                          style={{ width: `${value * 100}%` }}
                        />
                      </div>
                      <span className="text-white/60 text-xs w-8">
                        {(value * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Music Player */}
            {currentTrack && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 flex flex-col justify-center">
                <div className="text-center mb-4">
                  <div className="w-20 h-20 lg:w-24 lg:h-24 bg-white/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <Volume2 size={32} className="text-white/60" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-1">
                    {currentTrack.name}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {currentTrack.artist}
                  </p>
                  <p className="text-white/60 text-xs capitalize">
                    {currentTrack.emotion} mood
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={skipTrack}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                  >
                    <SkipForward size={16} />
                  </button>
                  <button
                    onClick={togglePlayback}
                    className="p-3 rounded-full bg-white text-gray-800 hover:bg-white/90 transition-colors"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button
                    onClick={skipTrack}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                  >
                    <SkipForward size={16} />
                  </button>
                </div>

                {/* {isPlaying && (
                  <div className="mt-3">
                    <div className="flex justify-between text-white/60 text-xs mb-1">
                      <span>0:00</span>
                      <span>3:42</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1">
                      <div className="bg-white rounded-full h-1 w-1/3 transition-all duration-1000"></div>
                    </div>
                  </div>
                )} */}
              </div>
            )}

            {/* Instructions - Only show when no emotion detected */}
            {!currentEmotion && !loading && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 flex flex-col justify-center">
                <h3 className="text-lg font-semibold text-white mb-3 text-center">
                  How it works
                </h3>
                <ul className="text-white/80 text-sm space-y-2">
                  <li>• Click "Start Emotion Detection" to begin</li>
                  <li>• Look into the camera and express yourself</li>
                  <li>• The app will detect your emotion and play matching music</li>
                  <li>• Try different expressions to hear different genres</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          onLoadedData={handleAudioLoad}
          onPlay={handleAudioPlay}
          onPause={handleAudioPause}
          onEnded={handleAudioEnded}
        />
      </div>
    </div>
  );
};

export default EmotionMusicPlayer;