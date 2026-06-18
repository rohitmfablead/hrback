import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

// Monkey patch face-api.js for Node.js environment
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let modelsLoaded = false;

// Load face-api models
export const loadFaceModels = async () => {
  if (modelsLoaded) {
    console.log('✅ Face models already loaded');
    return true;
  }

  try {
    console.log('🧠 Loading face recognition models...');
    
    // Set models path
    const modelsPath = path.join(__dirname, '../models/face');
    
    // Load required models using face-api.js syntax for Node.js
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
    
    modelsLoaded = true;
    console.log('✅ Face recognition models loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error loading face models:', error.message);
    console.log('⚠️  Face recognition will use simulated mode');
    return false;
  }
};

// Detect face and get embedding from multer file object or buffer
export const detectFaceAndGetEmbedding = async (file) => {
  try {

    // Load fs for reading disk files
    const fs = await import('fs');
    // Get image buffer (buffer, memory storage, or file path)
    let imageBuffer = Buffer.isBuffer(file)
      ? file
      : (file.buffer ? file.buffer : fs.readFileSync(file.path));
    // Directly load the image with canvas (no MIME whitelist needed – Multer already validates)
    const { loadImage } = await import('canvas');
    const image = await loadImage(imageBuffer);

    // Detect face with landmarks using tinyFaceDetector
    const detection = await faceapi
      .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error('No face detected in the image');
    }

    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('❌ Face detection error:', error.message);
    throw new Error(`Face detection failed: ${error.message}`);
  }
};

// Calculate Euclidean distance between two embeddings
export const calculateFaceDistance = (embedding1, embedding2) => {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 1.0; // Maximum distance
  }
  
  let distance = 0;
  for (let i = 0; i < embedding1.length; i++) {
    distance += Math.pow(embedding1[i] - embedding2[i], 2);
  }
  
  return Math.sqrt(distance);
};

// Check if distance indicates a match
export const isFaceMatch = (distance, threshold = 0.5) => {
  return distance < threshold;
};

// Get best match from multiple embeddings
export const findBestFaceMatch = (queryEmbedding, userEmbeddings, threshold = 0.5) => {
  let bestMatch = null;
  let bestDistance = 1.0;
  
  for (const [userId, embedding] of Object.entries(userEmbeddings)) {
    const distance = calculateFaceDistance(queryEmbedding, embedding);
    console.log(`  User ${userId}: distance = ${distance.toFixed(4)}`);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = userId;
    }
  }
  
  const isMatch = isFaceMatch(bestDistance, threshold);
  console.log(`🎯 Best match: ${bestMatch} with distance ${bestDistance.toFixed(4)} (${isMatch ? 'MATCH' : 'NO MATCH'})`);
  
  return {
    userId: bestMatch,
    distance: bestDistance,
    isMatch,
  };
};
