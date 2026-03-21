import * as faceapi from 'face-api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadModels() {
  const modelsPath = path.join(__dirname, './src/models/face');
  
  console.log('📁 Creating models directory:', modelsPath);
  fs.mkdirSync(modelsPath, { recursive: true });
  
  console.log('🧠 Downloading face recognition models...');
  
  try {
    // Download models from GitHub CDN
    const modelFiles = [
      'tiny_face_detector_model-weights_manifest.json',
      'tiny_face_detector_model-shard1',
      'face_landmark_68_model-weights_manifest.json',
      'face_landmark_68_model-shard1',
      'face_recognition_model-weights_manifest.json',
      'face_recognition_model-shard1',
      'face_recognition_model-shard2'
    ];
    
    const baseUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    
    for (const file of modelFiles) {
      const url = `${baseUrl}${file}`;
      const filePath = path.join(modelsPath, file);
      
      console.log(`  Downloading: ${file}...`);
      
      // Use fetch to download (Node 18+ has built-in fetch)
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download ${file}`);
      
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      console.log(`  ✅ ${file}`);
    }
    
    console.log('\n✅ Models downloaded successfully!');
    console.log('📂 Models saved to:', modelsPath);
    console.log('\n⚠️  Note: You may need to rename manifest files to match expected names:');
    console.log('   - tiny_face_detector_model → ssd_mobilenetv1_model');
    console.log('   - Update manifest JSON if needed');
    
  } catch (error) {
    console.error('❌ Error downloading models:', error.message);
    console.log('\n⚠️  Manual download instructions:');
    console.log('1. Go to: https://github.com/justadudewhohacks/face-api.js/tree/master/weights');
    console.log('2. Download these files:');
    console.log('   - tiny_face_detector_model-weights_manifest.json');
    console.log('   - tiny_face_detector_model-shard1');
    console.log('   - face_landmark_68_model-weights_manifest.json');
    console.log('   - face_landmark_68_model-shard1');
    console.log('   - face_recognition_model-weights_manifest.json');
    console.log('   - face_recognition_model-shard1');
    console.log('   - face_recognition_model-shard2');
    console.log('3. Save them to:', modelsPath);
  }
}

downloadModels();
