"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MotelBanner = () => {
  const [index, setIndex] = useState(0);

  const texts = [
    "First 50 Motels Will Have",
    "First Month Free",
    "Grab The Opportunity !"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-[92%] md:w-full max-w-5xl mx-auto h-12 md:h-16 overflow-hidden rounded-xl border border-orange-200/70 bg-white/90 dark:bg-amber-800/30  dark:border-transparent shadow-[0_6px_20px_rgba(255,90,31,0.15)] backdrop-blur-md top-0 md:top-[-60px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={texts[index]}
          initial={{
            x: "100%",
            opacity: 0,
          }}
          animate={{
            x: "0%",
            opacity: 1,
          }}
          exit={{
            x: "-100%",
            opacity: 0,
          }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-[#FF5A1F] dark:text-white text-center px-4">
            {texts[index]}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MotelBanner;