"""
AI SERVER - Enhanced Crime Detection System (YOLOv8-Pose)
Image Upload API for Crime Detection
"""

import os
import cv2
import json
from datetime import datetime
from pathlib import Path

import numpy as np
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS

from pose_detector import PoseCrimeDetector

# --------------------------------------------------
# INITIALIZE APP
# --------------------------------------------------

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

UPLOAD_FOLDER = "./ai_uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "gif", "tiff"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)

# Initialize detector with optional model selection
try:
    pose_detector = PoseCrimeDetector()
    print("✅ PoseCrimeDetector initialized successfully")
except Exception as e:
    print(f"❌ Error initializing detector: {e}")
    pose_detector = None

# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def normalize_confidence(raw_confidence):
    """
    Ensures confidence is ALWAYS between 0.0 and 1.0
    """
    try:
        raw_confidence = float(raw_confidence)
        if raw_confidence > 1:
            normalized = min(raw_confidence / 100.0, 1.0)
        else:
            normalized = max(raw_confidence, 0.0)
        
        # Apply non-linear scaling for better distribution
        if normalized < 0.3:
            return round(normalized * 1.5, 3)  # Boost low confidence
        elif normalized > 0.7:
            return round(normalized * 0.9, 3)  # Slightly reduce high confidence
        else:
            return round(normalized, 3)
    except Exception:
        return 0.0


def preprocess_image(image):
    """
    Preprocess image for better detection
    """
    # Convert to RGB if needed
    if len(image.shape) == 3 and image.shape[2] == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Resize if too large (maintain aspect ratio)
    h, w = image.shape[:2]
    max_dim = 1280
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    return image


def calculate_response_time(start_time):
    """Calculate response time in milliseconds"""
    return round((datetime.now() - start_time).total_seconds() * 1000, 2)


# --------------------------------------------------
# CORE ANALYSIS
# --------------------------------------------------
def analyze_image(image):
    """
    Runs pose-based crime detection with preprocessing
    """
    if pose_detector is None:
        print("❌ Pose detector not initialized")
        return {
            "type": "SYSTEM_ERROR",
            "confidence": 0.0,
            "crime_detected": 0,
            "threat_level": "LOW",
            "persons_detected": 0,
            "activities": [],
            "signals": [],
        }
    
    try:
        # Preprocess image
        processed_image = preprocess_image(image)
        print(f"📸 Processing image: shape={processed_image.shape}")
        
        # Run detection
        result = pose_detector.analyze(processed_image)
        print(f"🔍 Detection result: type={result.get('crime_type')}, persons={result.get('persons_detected')}, confidence={result.get('confidence')}")
        
        confidence = normalize_confidence(
            result.get("confidence", 0.0)
        )

        crime_type = result.get("crime_type", "NO_CRIME")

        # 🔥 FIX: violent crimes are crimes even with moderate confidence
        crime_detected = (
            result.get("crime_detected", False)
            or crime_type in [
                "Fight / Physical Violence",
                "Physical Assault",
                "Assault on Fallen Victim",
                "Choking / Attempted Murder",
                "Assault with Weapon",
                "Kidnapping / Abduction",
                "Crowd Violence / Riot"
            ]
        )
        
        return {
            "type": crime_type,
            "confidence": confidence,
            "crime_detected": int(crime_detected),
            "threat_level": result.get("threat_level", "LOW"),
            "persons_detected": int(result.get("persons_detected", 0)),
            "activities": result.get("activities", []),
            "signals": result.get("signals", []),
            "threat_score": result.get("threat_score", 0),
            "raw_confidence": result.get("confidence", 0.0),
        }
    except Exception as e:
        print(f"Error in analyze_image: {e}")
        return {
            "type": "ANALYSIS_ERROR",
            "confidence": 0.0,
            "crime_detected": 0,
            "threat_level": "LOW",
            "persons_detected": 0,
            "activities": [],
            "signals": [],
        }


# --------------------------------------------------
# API ENDPOINTS
# --------------------------------------------------

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy" if pose_detector else "unhealthy",
        "service": "crime-detection-api",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": pose_detector is not None
    })


@app.route("/detect-image", methods=["POST"])
def detect_image():
    start_time = datetime.now()
    
    try:
        # Check if detector is available
        if pose_detector is None:
            return jsonify({
                "success": False,
                "type": "SYSTEM_ERROR",
                "confidence": 0.0,
                "message": "Detection system not initialized",
                "response_time_ms": calculate_response_time(start_time)
            }), 500
        
        # Check for image file
        if "image" not in request.files:
            return jsonify({
                "success": False,
                "type": "NO_IMAGE",
                "confidence": 0.0,
                "message": "No image file provided",
                "response_time_ms": calculate_response_time(start_time)
            }), 400
        
        file = request.files["image"]
        location = request.form.get("location", "Unknown")
        camera_id = request.form.get("camera_id", "Unknown")
        timestamp = request.form.get("timestamp", datetime.now().isoformat())
        
        if file.filename == "":
            return jsonify({
                "success": False,
                "type": "NO_IMAGE",
                "confidence": 0.0,
                "message": "Empty filename",
                "response_time_ms": calculate_response_time(start_time)
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "type": "INVALID_IMAGE",
                "confidence": 0.0,
                "message": "File type not allowed",
                "response_time_ms": calculate_response_time(start_time)
            }), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Read and process image
        image = cv2.imread(filepath)
        if image is None:
            return jsonify({
                "success": False,
                "type": "INVALID_IMAGE",
                "confidence": 0.0,
                "message": "Could not read image file",
                "response_time_ms": calculate_response_time(start_time)
            }), 400
        
        # Run detection
        detection = analyze_image(image)
        
        print(f"✅ Analysis complete: {detection.get('crime_type')} (confidence: {detection.get('confidence')})")
        
        # Clean up temp file
        try:
            os.remove(filepath)
        except:
            pass
        
        response_data = {
            "success": True,
            "type": detection["type"],
            "confidence": detection["confidence"],
            "raw_confidence": detection.get("raw_confidence", 0.0),
            "location": location,
            "camera_id": camera_id,
            "timestamp": timestamp,
            "analysis_timestamp": datetime.now().isoformat(),
            "threat_level": detection["threat_level"],
            "persons_detected": detection["persons_detected"],
            "activities": detection["activities"],
            "signals": detection["signals"],
            "threat_score": detection.get("threat_score", 0),
            "crime_detected": bool(detection["crime_detected"]),
            "response_time_ms": calculate_response_time(start_time),
            "system_status": "operational"
        }
        
        # Log high threat detections
        if detection["threat_level"] in ["HIGH", "CRITICAL"]:
            print(f"🚨 HIGH THREAT DETECTED: {detection['type']} at {location} "
                  f"(Confidence: {detection['confidence']})")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in detect_image endpoint: {e}")
        return jsonify({
            "success": False,
            "type": "ERROR",
            "confidence": 0.0,
            "message": str(e),
            "response_time_ms": calculate_response_time(start_time)
        }), 500


@app.route('/batch-detect', methods=['POST'])
def batch_detect():
    """Batch processing endpoint for multiple images"""
    start_time = datetime.now()
    
    try:
        if 'images' not in request.files:
            return jsonify({
                "success": False,
                "message": "No images provided",
                "response_time_ms": calculate_response_time(start_time)
            }), 400
        
        files = request.files.getlist('images')
        results = []
        
        for file in files:
            if file and allowed_file(file.filename):
                # Read image directly from memory
                file_bytes = np.frombuffer(file.read(), np.uint8)
                image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
                
                if image is not None:
                    detection = analyze_image(image)
                    results.append({
                        "filename": secure_filename(file.filename),
                        "detection": detection
                    })
        
        return jsonify({
            "success": True,
            "results": results,
            "total_processed": len(results),
            "response_time_ms": calculate_response_time(start_time)
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e),
            "response_time_ms": calculate_response_time(start_time)
        }), 500


# --------------------------------------------------
# ERROR HANDLERS
# --------------------------------------------------

@app.errorhandler(413)
def too_large(e):
    return jsonify({
        "success": False,
        "type": "FILE_TOO_LARGE",
        "confidence": 0.0,
        "message": "File size exceeds limit (16MB)"
    }), 413


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "success": False,
        "type": "ENDPOINT_NOT_FOUND",
        "confidence": 0.0,
        "message": "Endpoint not found"
    }), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        "success": False,
        "type": "INTERNAL_ERROR",
        "confidence": 0.0,
        "message": "Internal server error"
    }), 500


# --------------------------------------------------
# RUN SERVER
# --------------------------------------------------

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🤖 ENHANCED AI CRIME DETECTION SERVER")
    print("="*60)
    print("📡 API Endpoints:")
    print("  • POST /detect-image    - Single image detection")
    print("  • POST /batch-detect    - Batch image detection")
    print("  • GET  /health          - Health check")
    print("\n📍 Server running at:")
    print("  → http://127.0.0.1:8000")
    print("  → http://0.0.0.0:8000 (network accessible)")
    print("="*60 + "\n")
    
    app.run(host="0.0.0.0", port=8000, debug=False, threaded=True)