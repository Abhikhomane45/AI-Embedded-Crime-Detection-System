from ultralytics import YOLO
import numpy as np
import math
from collections import defaultdict

class PoseCrimeDetector:
    def __init__(self):
        # Use medium model for better accuracy or keep nano for speed
        self.model = YOLO("yolov8n-pose.pt")
        # Cache for temporal analysis (simple version)
        self.frame_history = []
        self.max_history = 5
        
    def analyze(self, image):
        # Process with lower confidence threshold for better detection
        # Lower conf = more detections (more sensitive)
        results = self.model(image, conf=0.3, iou=0.45, verbose=False)[0]
        
        if results.keypoints is None or len(results.keypoints) == 0:
            return self._empty_result()
        
        kps_all = results.keypoints.xy.cpu().numpy()
        conf_all = results.keypoints.conf.cpu().numpy() if results.keypoints.conf is not None else None
        boxes = results.boxes.xyxy.cpu().numpy()
        
        persons = len(kps_all)
        threat_score = 0
        signals = []
        activities = []
        
        # ---- SINGLE PERSON ANALYSIS ----
        person_signals = []
        for idx, kps in enumerate(kps_all):
            kps_conf = conf_all[idx] if conf_all is not None else None
            person_sig, person_acts = self._analyze_person(kps, kps_conf)
            person_signals.append(person_sig)
            signals.extend(person_sig)
            activities.extend(person_acts)
        
        # ---- MULTI-PERSON ANALYSIS ----
        if persons >= 2:
            inter_signals, inter_acts = self._analyze_interactions(kps_all, boxes, person_signals)
            signals.extend(inter_signals)
            activities.extend(inter_acts)
        
        # ---- TEMPORAL ANALYSIS (Simple) ----
        self._update_history(signals)
        signals.extend(self._temporal_analysis())
        
        # ---- THREAT SCORING ----
        threat_score = self._calculate_threat_score(signals, activities, persons)
        
        # ---- FINAL CLASSIFICATION ----
        crime_type, threat_level = self._classify(signals, activities, persons)
        crime_detected = threat_score >= 40
        
        return {
            "persons_detected": persons,
            "signals": list(set(signals)),
            "activities": list(set(activities)),
            "threat_score": min(100, threat_score),
            "crime_detected": crime_detected,
            "crime_type": crime_type,
            "threat_level": threat_level,
            "confidence": min(100, threat_score)
        }
    
    # -------------------------------------------------
    # IMPROVED PERSON-LEVEL ANALYSIS
    # -------------------------------------------------
    def _analyze_person(self, k, conf=None):
        s = []
        acts = []
        
        # Validate keypoints confidence
        min_conf = 0.4
        if conf is not None:
            valid_points = [i for i, c in enumerate(conf) if c > min_conf]
            if len(valid_points) < 10:  # Not enough reliable keypoints
                return s, acts
        
        # Keypoint indices (COCO format)
        nose = k[0]
        left_eye, right_eye = k[1], k[2]
        left_ear, right_ear = k[3], k[4]
        left_shoulder, right_shoulder = k[5], k[6]
        left_elbow, right_elbow = k[7], k[8]
        left_wrist, right_wrist = k[9], k[10]
        left_hip, right_hip = k[11], k[12]
        left_knee, right_knee = k[13], k[14]
        left_ankle, right_ankle = k[15], k[16]
        
        # Calculate body proportions for normalization
        torso_height = abs(nose[1] - (left_hip[1] + right_hip[1]) / 2)
        shoulder_width = abs(left_shoulder[0] - right_shoulder[0])
        
        if torso_height < 10 or shoulder_width < 10:  # Invalid detection
            return s, acts
        
        # ---- AGGRESSIVE GESTURES ----
        
        # Punch detection (improved)
        left_arm_extended = self._is_arm_extended(
            left_shoulder, left_elbow, left_wrist, torso_height
        )
        right_arm_extended = self._is_arm_extended(
            right_shoulder, right_elbow, right_wrist, torso_height
        )
        
        # Check if wrist is above elbow (punching motion)
        if left_arm_extended and left_wrist[1] < left_elbow[1] - torso_height * 0.1:
            s.append("PUNCH_LEFT")
            acts.append("AGGRESSIVE_GESTURE")
        if right_arm_extended and right_wrist[1] < right_elbow[1] - torso_height * 0.1:
            s.append("PUNCH_RIGHT")
            acts.append("AGGRESSIVE_GESTURE")
        
        # Kick detection (improved)
        left_leg_raised = self._is_leg_raised(
            left_hip, left_knee, left_ankle, torso_height
        )
        right_leg_raised = self._is_leg_raised(
            right_hip, right_knee, right_ankle, torso_height
        )
        
        if left_leg_raised:
            s.append("KICK_LEFT")
            acts.append("KICKING_MOTION")
        if right_leg_raised:
            s.append("KICK_RIGHT")
            acts.append("KICKING_MOTION")
        
        # Weapon threat (straight arm pointing)
        if left_arm_extended and abs(left_wrist[0] - left_shoulder[0]) > shoulder_width * 1.5:
            s.append("WEAPON_THREAT_LEFT")
            acts.append("THREATENING_GESTURE")
        if right_arm_extended and abs(right_wrist[0] - right_shoulder[0]) > shoulder_width * 1.5:
            s.append("WEAPON_THREAT_RIGHT")
            acts.append("THREATENING_GESTURE")
        
        # Choking/grabbing neck (improved)
        neck_y = nose[1] + torso_height * 0.2  # Approximate neck position
        if self._distance(left_wrist, [nose[0], neck_y]) < torso_height * 0.3:
            s.append("GRAB_NECK_LEFT")
            acts.append("CHOKING_MOTION")
        if self._distance(right_wrist, [nose[0], neck_y]) < torso_height * 0.3:
            s.append("GRAB_NECK_RIGHT")
            acts.append("CHOKING_MOTION")
        
        # Fallen person (improved)
        body_verticality = self._calculate_body_verticality(k)
        if body_verticality < 0.3:  # Very horizontal
            s.append("FALLEN")
            acts.append("PRONE_POSITION")
        
        # Running detection
        if self._is_running(k):
            acts.append("RUNNING")
        
        # Crouching detection
        if self._is_crouching(k):
            acts.append("CROUCHING")
        
        # Hands up (surrender or threat)
        if left_wrist[1] < left_shoulder[1] - torso_height * 0.2 and \
           right_wrist[1] < right_shoulder[1] - torso_height * 0.2:
            acts.append("HANDS_UP")
        
        # Victim vulnerability detection
        if self._is_crouching(k) or body_verticality < 0.4:
            s.append("VULNERABLE_POSITION")
            acts.append("DEFENSIVE_POSTURE")
        
        return s, acts
    
    # -------------------------------------------------
    # IMPROVED INTERACTION ANALYSIS
    # -------------------------------------------------
    def _analyze_interactions(self, kps_all, boxes, person_signals):
        s = []
        acts = []
        n = len(kps_all)
        
        for i in range(n):
            for j in range(i + 1, n):
                # Use hip center for distance calculation
                hip_i = self._get_hip_center(kps_all[i])
                hip_j = self._get_hip_center(kps_all[j])
                
                distance = self._distance(hip_i, hip_j)
                frame_diagonal = self._calculate_frame_diagonal(boxes[i], boxes[j])
                
                normalized_distance = distance / frame_diagonal
                
                # Close contact (based on body proportions)
                if normalized_distance < 0.3:
                    s.append("CLOSE_CONTACT")
                    acts.append("PHYSICAL_PROXIMITY")
                
                # Body collision detection (very close contact)
                if normalized_distance < 0.15:
                    s.append("BODY_COLLISION")
                    acts.append("PHYSICAL_CONTACT")
                
                # Assault detection
                for wrist_idx in [9, 10]:  # Left and right wrists
                    for head_idx in [0, 1, 2, 3, 4]:  # Head keypoints
                        dist = self._distance(kps_all[i][wrist_idx], kps_all[j][head_idx])
                        if dist < 30:  # Wrist near head
                            s.append("ASSAULT_HEAD")
                            acts.append("PHYSICAL_ASSAULT")
                            break
                
                # Grabbing detection
                if self._is_grabbing(kps_all[i], kps_all[j]):
                    s.append("GRABBING")
                    acts.append("RESTRAINING_MOTION")
                
                # Following/chasing detection
                if self._is_following(kps_all[i], kps_all[j], boxes[i], boxes[j]):
                    acts.append("FOLLOWING_CHASING")
                
                # Crowd formation detection
                if n >= 3:
                    if self._is_circle_formation([kps_all[i], kps_all[j]], kps_all):
                        acts.append("CROWD_FORMATION")
                
                # Overpower detection (aggressor standing over crouched victim)
                vertical_diff = abs(hip_i[1] - hip_j[1])
                
                if vertical_diff > 30:
                    s.append("POWER_IMBALANCE")
                    acts.append("DOMINANT_POSITION")
                
                # Strong assault detection rule
                if (
                    "CLOSE_CONTACT" in s and
                    ("AGGRESSIVE_GESTURE" in acts or
                     "KICKING_MOTION" in acts or
                     "BODY_COLLISION" in s)
                ):
                    s.append("DIRECT_ASSAULT")
                    acts.append("PHYSICAL_ASSAULT")
        
        return s, acts
    
    # -------------------------------------------------
    # HELPER METHODS
    # -------------------------------------------------
    def _is_arm_extended(self, shoulder, elbow, wrist, torso_height):
        """Check if arm is relatively straight and extended"""
        # Calculate angles
        angle1 = self._angle_between(shoulder, elbow, wrist)
        # Check if arm is relatively straight (angle close to 180 degrees)
        arm_straight = abs(angle1 - 180) < 30
        
        # Check extension length
        arm_length = self._distance(shoulder, wrist)
        extended = arm_length > torso_height * 0.7
        
        return arm_straight and extended
    
    def _is_leg_raised(self, hip, knee, ankle, torso_height):
        """Check if leg is raised for kicking"""
        # Check if knee is significantly higher than hip (front kick)
        front_kick = knee[1] < hip[1] - torso_height * 0.1
        
        # Check if ankle is significantly higher than knee (high kick)
        high_kick = ankle[1] < knee[1] - torso_height * 0.1
        
        # Check leg angle for side kick
        leg_angle = self._angle_between(hip, knee, ankle)
        side_kick = 120 < leg_angle < 160
        
        return front_kick or high_kick or side_kick
    
    def _calculate_body_verticality(self, k):
        """Calculate how vertical/horizontal the body is (0-1, 1=vertical)"""
        shoulder_mid = [(k[5][0] + k[6][0])/2, (k[5][1] + k[6][1])/2]
        hip_mid = [(k[11][0] + k[12][0])/2, (k[11][1] + k[12][1])/2]
        
        # Vector from shoulders to hips
        vec = [hip_mid[0] - shoulder_mid[0], hip_mid[1] - shoulder_mid[1]]
        
        # Vertical vector
        vert = [0, 1]
        
        # Calculate cosine similarity
        dot = vec[0]*vert[0] + vec[1]*vert[1]
        mag_vec = math.sqrt(vec[0]**2 + vec[1]**2)
        mag_vert = 1.0
        
        if mag_vec < 1e-6:
            return 0.5
        
        cosine = dot / (mag_vec * mag_vert)
        return (cosine + 1) / 2  # Normalize to 0-1
    
    def _is_running(self, k):
        """Detect running motion"""
        # Check if legs are in running position
        left_leg_angle = self._angle_between(k[11], k[13], k[15])
        right_leg_angle = self._angle_between(k[12], k[14], k[16])
        
        # Running typically has legs bent at acute angles
        return (left_leg_angle < 120 or right_leg_angle < 120) and \
               abs(k[13][1] - k[14][1]) > 20  # Knees at different heights
    
    def _is_crouching(self, k):
        """Detect crouching/sneaking position"""
        # Check if knees are significantly lower than hips
        knee_height_ratio = (k[13][1] + k[14][1]) / (2 * (k[11][1] + k[12][1]) / 2)
        return knee_height_ratio > 1.2  # Knees below hips
    
    def _get_hip_center(self, k):
        return [(k[11][0] + k[12][0])/2, (k[11][1] + k[12][1])/2]
    
    def _calculate_frame_diagonal(self, box1, box2):
        """Calculate approximate frame diagonal for normalization"""
        boxes_combined = np.vstack([box1, box2])
        min_x, min_y = boxes_combined[:, :2].min(axis=0)
        max_x, max_y = boxes_combined[:, 2:].max(axis=0)
        return math.sqrt((max_x - min_x)**2 + (max_y - min_y)**2)
    
    def _is_grabbing(self, kps1, kps2):
        """Check if one person is grabbing another"""
        for wrist_idx in [9, 10]:  # Check both wrists
            for body_idx in [5, 6, 11, 12]:  # Shoulders and hips
                if self._distance(kps1[wrist_idx], kps2[body_idx]) < 25:
                    return True
        return False
    
    def _is_following(self, kps1, kps2, box1, box2):
        """Check if one person might be following another"""
        # Simple directional check
        direction1 = self._get_facing_direction(kps1)
        direction2 = self._get_facing_direction(kps2)
        
        # Check if person1 is facing person2 and moving toward them
        pos1 = self._get_hip_center(kps1)
        pos2 = self._get_hip_center(kps2)
        
        vec_to_target = [pos2[0] - pos1[0], pos2[1] - pos1[1]]
        vec_to_target_mag = math.sqrt(vec_to_target[0]**2 + vec_to_target[1]**2)
        
        if vec_to_target_mag < 1e-6:
            return False
        
        # Normalize
        vec_to_target = [vec_to_target[0]/vec_to_target_mag, vec_to_target[1]/vec_to_target_mag]
        
        # Dot product indicates alignment
        dot = direction1[0]*vec_to_target[0] + direction1[1]*vec_to_target[1]
        return dot > 0.7  # Facing toward the other person
    
    def _get_facing_direction(self, kps):
        """Estimate which direction person is facing"""
        # Simple method using shoulders and nose
        shoulder_mid = [(kps[5][0] + kps[6][0])/2, (kps[5][1] + kps[6][1])/2]
        nose = kps[0]
        
        vec = [nose[0] - shoulder_mid[0], nose[1] - shoulder_mid[1]]
        mag = math.sqrt(vec[0]**2 + vec[1]**2)
        
        if mag < 1e-6:
            return [0, 1]  # Default downward
        
        return [vec[0]/mag, vec[1]/mag]
    
    def _is_circle_formation(self, reference_kps, all_kps):
        """Check if people form a circle/group around something"""
        if len(all_kps) < 3:
            return False
        
        centers = [self._get_hip_center(k) for k in all_kps]
        avg_center = np.mean(centers, axis=0)
        
        distances = [self._distance(c, avg_center) for c in centers]
        avg_distance = np.mean(distances)
        
        # Check if distances are relatively uniform (circle-like)
        std_distance = np.std(distances)
        return std_distance / avg_distance < 0.3
    
    def _update_history(self, signals):
        """Maintain a simple history of signals"""
        self.frame_history.append(set(signals))
        if len(self.frame_history) > self.max_history:
            self.frame_history.pop(0)
    
    def _temporal_analysis(self):
        """Simple temporal analysis for sustained signals"""
        if len(self.frame_history) < 3:
            return []
        
        sustained_signals = set.intersection(*self.frame_history)
        return list(sustained_signals)
    
    def _calculate_threat_score(self, signals, activities, persons):
        """Improved threat scoring"""
        score = 0
        
        # Signal weights
        signal_weights = {
            "GRAB_NECK_LEFT": 25, "GRAB_NECK_RIGHT": 25,
            "WEAPON_THREAT_LEFT": 20, "WEAPON_THREAT_RIGHT": 20,
            "ASSAULT_HEAD": 30, "GRABBING": 20,
            "PUNCH_LEFT": 15, "PUNCH_RIGHT": 15,
            "KICK_LEFT": 15, "KICK_RIGHT": 15,
            "FALLEN": 10, "CLOSE_CONTACT": 10,
            "DIRECT_ASSAULT": 35,
            "POWER_IMBALANCE": 20,
            "VULNERABLE_POSITION": 25,
            "BODY_COLLISION": 25
        }
        
        # Activity weights
        activity_weights = {
            "PHYSICAL_ASSAULT": 20, "CHOKING_MOTION": 25,
            "THREATENING_GESTURE": 15, "RESTRAINING_MOTION": 20,
            "AGGRESSIVE_GESTURE": 10, "KICKING_MOTION": 10,
            "FOLLOWING_CHASING": 15, "CROWD_FORMATION": 10,
            "DEFENSIVE_POSTURE": 20,
            "DOMINANT_POSITION": 20
        }
        
        # Add signal scores
        for signal in set(signals):
            score += signal_weights.get(signal, 5)
        
        # Add activity scores
        for activity in set(activities):
            score += activity_weights.get(activity, 5)
        
        # Multiplier for multiple persons
        if persons >= 3:
            score *= 1.3
        elif persons == 2:
            score *= 1.1
        
        # Sustained signals multiplier
        if len(self.frame_history) >= 3 and len(set.intersection(*self.frame_history)) > 0:
            score *= 1.2
        
        return min(100, score)
    
    # -------------------------------------------------
    # IMPROVED CLASSIFICATION
    # -------------------------------------------------
    def _classify(self, signals, activities, persons):
        s = set(signals)
        a = set(activities)

        # ---- NEW: helper flags (ONLY ADDITION) ----
        has_punch = any(sig.startswith("PUNCH") for sig in s)
        has_kick = any(sig.startswith("KICK") for sig in s)

        # Critical threat scenarios - NEW ASSAULT DETECTION
        if (
            "DIRECT_ASSAULT" in s and
            "VULNERABLE_POSITION" in s
        ):
            return "Woman Assault / Physical Violence", "CRITICAL"

        if (
            "DIRECT_ASSAULT" in s
        ):
            return "Physical Assault", "HIGH"
        
        # High threat scenarios
        if "GRAB_NECK_LEFT" in s or "GRAB_NECK_RIGHT" in s:
            return "Choking / Attempted Murder", "CRITICAL"

        if ("WEAPON_THREAT_LEFT" in s or "WEAPON_THREAT_RIGHT" in s) and \
           ("CLOSE_CONTACT" in s or "PHYSICAL_ASSAULT" in a):
            return "Assault with Weapon", "CRITICAL"

        if "GRABBING" in s and "FOLLOWING_CHASING" in a:
            return "Kidnapping / Abduction", "CRITICAL"

        if "FALLEN" in s and persons >= 2 and (has_punch or has_kick):
            return "Assault on Fallen Victim", "CRITICAL"

        if persons >= 3 and ("PHYSICAL_ASSAULT" in a or "CROWD_FORMATION" in a):
            return "Crowd Violence / Riot", "HIGH"

        # ---- FIXED FIGHT LOGIC (THIS WAS THE BUG) ----
        if persons == 2 and (has_punch or has_kick):
            return "Fight / Physical Violence", "HIGH"

        # Medium threat scenarios
        if "ASSAULT_HEAD" in s:
            return "Physical Assault", "HIGH"

        if "CLOSE_CONTACT" in s and persons == 2 and "RUNNING" in a:
            return "Robbery / Mugging", "HIGH"

        if "THREATENING_GESTURE" in a and "CLOSE_CONTACT" in s:
            return "Threatening Behavior", "MEDIUM"

        # Low threat scenarios
        if len(s) > 0 or len(a) > 0:
            return "Suspicious Activity", "LOW"

        return "Normal", "LOW"

    
    # -------------------------------------------------
    # UTILITY METHODS
    # -------------------------------------------------
    def _distance(self, a, b):
        return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
    
    def _angle_between(self, p1, p2, p3):
        """Calculate angle at p2 formed by p1-p2-p3"""
        a = np.array(p1)
        b = np.array(p2)
        c = np.array(p3)
        
        ba = a - b
        bc = c - b
        
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
        
        return angle
    
    def _empty_result(self):
        return {
            "persons_detected": 0,
            "signals": [],
            "activities": [],
            "threat_score": 0,
            "crime_detected": False,
            "crime_type": "Normal",
            "threat_level": "LOW",
            "confidence": 0
        }