# 🧠 Face Recognition Models - Download Instructions

## ⚠️ **IMPORTANT: Models Required**

The face recognition system requires ML model files to work. These are NOT included in the project and must be downloaded separately.

---

## 📥 **Option 1: Automatic Download (Recommended)**

Run this command in the backend directory:

```bash
cd c:\Users\rkmau\Desktop\hhhhh\backend
node download-face-models.js
```

This will attempt to automatically download the required models.

---

## 📥 **Option 2: Manual Download**

If automatic download fails, follow these steps:

### **Step 1: Go to face-api.js weights repository**
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

### **Step 2: Download these 7 files:**

1. `tiny_face_detector_model-weights_manifest.json`
2. `tiny_face_detector_model-shard1`
3. `face_landmark_68_model-weights_manifest.json`
4. `face_landmark_68_model-shard1`
5. `face_recognition_model-weights_manifest.json`
6. `face_recognition_model-shard1`
7. `face_recognition_model-shard2`

### **Step 3: Save to models directory**

Save all files to:
```
c:\Users\rkmau\Desktop\hhhhh\backend\src\models\face\
```

---

## 📁 **Final Directory Structure**

After downloading, your structure should look like:

```
backend/
└── src/
    └── models/
        └── face/
            ├── tiny_face_detector_model-weights_manifest.json
            ├── tiny_face_detector_model-shard1
            ├── face_landmark_68_model-weights_manifest.json
            ├── face_landmark_68_model-shard1
            ├── face_recognition_model-weights_manifest.json
            ├── face_recognition_model-shard1
            └── face_recognition_model-shard2
```

---

## ✅ **Verify Installation**

After downloading models:

1. Restart backend server: `npm start`
2. Check console for: "✅ Face recognition models loaded successfully"
3. Test face registration endpoint

---

## 🔧 **Alternative: Use Simulated Mode**

If you want to test WITHOUT real face recognition temporarily, modify the attendance controller to skip face verification and just use JWT authentication (current implementation).

---

## 📝 **Model File Details**

| Model | Purpose | Size |
|-------|---------|------|
| Tiny Face Detector | Detects faces in images | ~200KB |
| Face Landmark 68 | Identifies facial features | ~350KB |
| Face Recognition Net | Generates 128-d embedding | ~600KB |

**Total Size**: ~1.2MB

---

## 🆘 **Troubleshooting**

### **"Models not found" error**
- Verify files are in correct directory
- Check file names match exactly
- Restart backend server

### **"Failed to load model"**
- Ensure all shard files are present
- Check manifest JSON is valid
- Verify file permissions

### **Download fails**
- Try manual download (Option 2)
- Check internet connection
- Try different browser for manual download

---

**Created**: March 21, 2026  
**Package**: face-api.js  
**Models Required**: 7 files (~1.2MB total)
