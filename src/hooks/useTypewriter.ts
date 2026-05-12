import { useEffect, useState } from "react";

const useTypewriter = (text: string, speed: number) => {
  const [isTyping, setIsTyping] = useState(false);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    if (!text) {
      return;
    }
    
    let currentIndex = 0;
    let intervalId: ReturnType<typeof setInterval>;

    const startTimeout = setTimeout(() => {
      setCurrentText("");
      setIsTyping(true);

      intervalId = setInterval(() => {
        if (currentIndex < text.length) {
          setCurrentText(text.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(intervalId);
          setIsTyping(false);
        }
      }, speed);
    }, 0);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(intervalId);
    };
  }, [text, speed]);

  return { displayedText: currentText, isTyping };
};

export default useTypewriter;
