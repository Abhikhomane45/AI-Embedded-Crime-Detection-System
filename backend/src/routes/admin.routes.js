const express = require("express");
const router = express.Router();
const { admin } = require("../config/firebase");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { logOperatorActivity } = require("../utils/logOperatorActivity");

/* ======================================================
   ➕ CREATE OPERATOR (ADMIN ONLY)
   ====================================================== */
router.post(
  "/create-operator",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    const { email, password, cameras } = req.body;

    if (
      !email ||
      !password ||
      password.length < 6 ||
      !Array.isArray(cameras) ||
      cameras.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, password (min 6 chars), and at least one camera are required",
      });
    }

    let userRecord;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const isNetworkTimeout = (e) =>
      e?.errorInfo?.code === "app/network-timeout" ||
      /timeout/i.test(e?.message || "");

    const createUserWithRetry = async (payload, attempts = 3) => {
      let lastError;
      for (let i = 1; i <= attempts; i++) {
        try {
          return await admin.auth().createUser(payload);
        } catch (err) {
          lastError = err;
          if (!isNetworkTimeout(err) || i === attempts) throw err;
          await sleep(500 * i);
        }
      }
      throw lastError;
    };

    try {
      userRecord = await createUserWithRetry({
        email,
        password,
        emailVerified: false,
        disabled: false,
      });

      const uid = userRecord.uid;

      // 🔐 REQUIRED: SET AUTH CLAIM
      await admin.auth().setCustomUserClaims(uid, {
        role: "operator",
      });

      // 📦 STORE PROFILE
      await admin.firestore().collection("operators").doc(uid).set({
        email,
        role: "operator",
        cameras,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: req.user.uid,
      });

      // 🧾 LOG
      await logOperatorActivity({
        operatorUid: uid,
        operatorEmail: email,
        action: "OPERATOR_CREATED",
        description: "Admin created a new operator",
        metadata: { createdBy: req.user.uid },
      });

      return res.status(201).json({
        success: true,
        uid,
        message: "Operator created successfully. Operator must re-login.",
      });
    } catch (err) {
      console.error("❌ CREATE OPERATOR ERROR:", err);

      // rollback auth user if firestore fails
      if (userRecord?.uid) {
        try {
          await admin.auth().deleteUser(userRecord.uid);
        } catch (rbErr) {
          console.error("⚠️ Rollback failed:", rbErr.message);
        }
      }

      return res.status(500).json({
        success: false,
        message: err.message || "Failed to create operator",
      });
    }
  }
);

/* ======================================================
   🔐 RESET OPERATOR PASSWORD (ADMIN ONLY)
   ====================================================== */
router.post(
  "/reset-operator-password",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { uid, newPassword } = req.body;

      if (!uid || !newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "UID and password (min 6 chars) are required",
        });
      }

      await admin.auth().updateUser(uid, { password: newPassword });

      await logOperatorActivity({
        operatorUid: uid,
        operatorEmail: "unknown",
        action: "PASSWORD_RESET",
        description: "Admin reset operator password",
        metadata: { resetBy: req.user.uid },
      });

      res.json({
        success: true,
        message: "Operator password reset successfully",
      });
    } catch (err) {
      console.error("❌ RESET PASSWORD ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to reset password",
      });
    }
  }
);

/* ======================================================
   📜 FETCH OPERATOR LOGS (ADMIN ONLY)
   ====================================================== */
router.get(
  "/operator-logs",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { operatorUid, limit = 50 } = req.query;

      let q = admin
        .firestore()
        .collection("operator_logs")
        .orderBy("createdAt", "desc")
        .limit(Number(limit));

      if (operatorUid) {
        q = q.where("operatorUid", "==", operatorUid);
      }

      const snap = await q.get();
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      res.json({ success: true, logs });
    } catch (err) {
      console.error("FETCH LOGS ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch operator logs",
      });
    }
  }
);

/* ======================================================
   🧪 TEST LOG (ADMIN ONLY)
   ====================================================== */
router.get(
  "/_test-log",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    await logOperatorActivity({
      operatorUid: req.user.uid,
      operatorEmail: req.user.email,
      action: "TEST",
      description: "Test log created manually",
    });

    res.json({ success: true });
  }
);

/* ======================================================
   👑 MAKE ADMIN (BOOTSTRAP / ADMIN ONLY)
   ====================================================== */
/**
 * ⚠️ IMPORTANT:
 * - Use this ONCE to bootstrap first admin
 * - After that, keep verifyToken + requireAdmin enabled
 */
router.post(
  "/_make-admin",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { uid } = req.body;

      if (!uid) {
        return res.status(400).json({
          success: false,
          message: "UID is required",
        });
      }

      await admin.auth().setCustomUserClaims(uid, {
        role: "admin",
      });

      res.json({
        success: true,
        message: "Admin role assigned. Please logout and login again.",
      });
    } catch (err) {
      console.error("MAKE ADMIN ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to assign admin role",
      });
    }
  }
);

router.post("/_make-operator", async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "UID is required",
      });
    }

    await admin.auth().setCustomUserClaims(uid, {
      role: "operator",
    });

    return res.json({
      success: true,
      message: "Operator role assigned. Please re-login.",
    });
  } catch (err) {
    console.error("MAKE OPERATOR ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to assign operator role",
    });
  }
});


router.get("/operators-list", verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await admin.firestore().collection("operators").get();
    const operators = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    res.json({ success: true, operators });
  } catch (err) {
    console.error("FETCH OPERATORS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch operators list" });
  }
});

module.exports = router;
