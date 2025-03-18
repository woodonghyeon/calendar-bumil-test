import React, { useState, useEffect } from "react";
import { FaArrowUp } from "react-icons/fa"; // FontAwesome 아이콘
import "./ScrollToTopButton.css";

function ScrollToTopButton() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            setIsVisible(window.scrollY > 300);
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <button
            className={`scroll-to-top-button ${isVisible ? "show" : ""}`}
            onClick={scrollToTop}
        >
            <FaArrowUp size={20} />
        </button>
    );
}

export default ScrollToTopButton;