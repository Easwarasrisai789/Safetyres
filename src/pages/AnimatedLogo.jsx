import React from "react";
import { motion } from "framer-motion";

export default function AnimatedLogo() {
  // Bigger QR pattern (7x7 symbolic)
  const qrPattern = [
    [1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1],
    [0, 0, 0, 1, 0, 0, 0],
    [1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1],
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {/* QR Code Grid */}
      <motion.div
        className="grid grid-cols-7 gap-1 bg-white p-4 rounded-lg shadow-lg"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {qrPattern.flat().map((cell, i) =>
          cell ? (
            <motion.div
              key={i}
              className="w-6 h-6 bg-red-600"
              variants={{
                hidden: { opacity: 0, scale: 0 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.3, ease: "easeOut" },
                },
              }}
            />
          ) : (
            <div key={i} className="w-6 h-6 bg-transparent" />
          )
        )}
      </motion.div>

      {/* Emergency QR Response Text */}
      <motion.h1
        className="mt-6 text-2xl font-bold text-gray-900"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 1 }}
      >
        🚨 Emergency QR Response
      </motion.h1>

      {/* Optimized Badge */}
      <motion.div
        className="mt-2 text-green-600 text-lg font-semibold"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 3, type: "spring", stiffness: 200 }}
      >
        ✅ Optimized
      </motion.div>
    </div>
  );
}
